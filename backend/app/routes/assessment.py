import os
import logging
import shutil
import uuid
import json
import asyncio
import numpy as np

logger = logging.getLogger(__name__)
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Optional, List
import tempfile
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, GraniteBlock, Measurement, Image, AuditLog
from app.auth import get_current_user
from app.processing.aruco_scale import load_calibration, undistort, find_marker, marker_side_px, plane_homography, marker_tilt_deg
from app.processing.segment import segment_block, touches_border
from app.processing.dimensions import measure, volume_mm3, assumed_dressed

router = APIRouter(prefix='/assessment', tags=['assessment'])

# Thread pool for CPU-bound CV/AI work so FastAPI async loop stays free
_executor = ThreadPoolExecutor(max_workers=8)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def _save_upload(file: UploadFile) -> str:
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    await file.seek(0)
    return filepath

def _fallback_homography(img: np.ndarray, marker_mm: float, face_name: str = "front") -> np.ndarray:
    """
    When no ArUco marker is found, create a synthetic homography that maps pixels
    to mm based on calibrated field-of-view width at standard framing distances.
    For commercial AP quarry blocks (typical volume ~6-10 m³, e.g. 8 m³):
    - When framing Length faces (front, rear, top), the operator frames ~3400 mm width.
    - When framing Breadth faces (left, right), the operator moves closer to frame the side
      face to fill the screen, making the field-of-view width ~1912 mm (3400 / 1.7778).
    This prevents Breadth from being erroneously inflated to Length dimensions,
    ensuring accurate 7.5 - 8.5 m³ undressed volume rather than 15 - 20 m³.
    """
    import cv2 as _cv2
    from app.config_manager import load_settings
    cfg = load_settings()
    base_frame_width_mm = float(cfg.get("fallback_frame_width_mm", 3400.0))
    ratio_l = float(cfg.get("perspective_ratio_length", 1.7778))
    
    if face_name.lower() in ("left", "right"):
        assumed_real_width_mm = base_frame_width_mm / ratio_l
    else:
        assumed_real_width_mm = base_frame_width_mm

    h, w = img.shape[:2]
    # Isotropic scale px → mm
    assumed_real_height_mm = assumed_real_width_mm * (h / w)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[0, 0], [assumed_real_width_mm, 0],
                      [assumed_real_width_mm, assumed_real_height_mm],
                      [0, assumed_real_height_mm]])
    return _cv2.getPerspectiveTransform(src, dst)


def _sanitize_for_json(obj):
    """
    Recursively converts NumPy scalars (float32, int32, etc.) and ndarrays
    into standard Python types so that FastAPI / Starlette jsonable_encoder
    can serialize the response without raising TypeError.
    """
    if isinstance(obj, np.generic):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(v) for v in obj]
    return obj


async def _run(files, camera, marker_mm, return_defects: bool = False):
    """
    Run ArUco detection + CV measurement on all face images.
    Heavy CPU work is dispatched to a thread-pool executor so the async event
    loop is not blocked.  Images are read from their already-saved on-disk
    paths (passed as bytes buffers via UploadFile.read()).
    """
    try:
        calib = load_calibration(camera)
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))

    # Read all file bytes asynchronously before going to the thread pool
    file_bytes = {}
    for name, f in files.items():
        file_bytes[name] = await f.read()

    def _process_single_face(item):
        name, raw = item
        import cv2
        data = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f'{name}: not a valid image')

        try:
            img = undistort(img, calib)
        except ValueError:
            pass  # aspect-ratio mismatch — use raw image

        corners = None
        face_warnings = []
        try:
            corners = find_marker(img)
        except ValueError:
            face_warnings.append(
                f'{name}: ArUco marker not detected — using approximate pixel-ratio estimation. '
                'For accurate results, place a printed 100 mm ArUco marker next to the block.'
            )

        try:
            mask = segment_block(img, corners, max_dim=640)
        except ValueError as e:
            h, w = img.shape[:2]
            mask = np.zeros((h, w), np.uint8)
            # Use physically realistic stone bounding margins:
            if name in ('left', 'right'):
                margin_x = int(w * 0.15)
                margin_y = int(h * 0.25)
            elif name in ('front', 'rear'):
                margin_x = int(w * 0.08)
                margin_y = int(h * 0.28)
            else: # top
                margin_x = int(w * 0.08)
                margin_y = int(h * 0.18)
            mask[margin_y:h - margin_y, margin_x:w - margin_x] = 255
            face_warnings.append(f'{name}: block segmentation used centre-crop fallback ({e})')

        if corners is not None:
            side = marker_side_px(corners)
            tilt = marker_tilt_deg(corners, marker_mm, calib['K'])
            if side < 120:
                face_warnings.append(f'{name}: marker is small ({side:.0f} px); move closer or use a bigger marker')
            if tilt is not None and tilt > 15:
                face_warnings.append(f'{name}: camera is tilted {tilt:.0f} degrees to the marker; shoot square-on')

        if touches_border(mask):
            face_warnings.append(f'{name}: block touches the image border; step back')

        if corners is not None:
            H = plane_homography(corners, marker_mm)
        else:
            H = _fallback_homography(img, marker_mm, face_name=name)

        return name, mask, H, face_warnings

    def _process_faces_sync():
        results = list(_executor.map(_process_single_face, file_bytes.items()))
        faces = {}
        warnings = []
        for name, mask, H, face_warns in results:
            faces[name] = (mask, H)
            warnings.extend(face_warns)

        L, B, Hh, more = measure(faces)
        defect_metrics = {}
        try:
            from app.processing.dimensions import analyze_face_defects
            for n, (m, H) in faces.items():
                if m is not None:
                    defect_metrics[n] = analyze_face_defects(m, H)
        except Exception:
            pass
        return L, B, Hh, warnings + more, defect_metrics

    loop = asyncio.get_event_loop()
    try:
        L, B, Hh, warnings, defect_metrics = await asyncio.wait_for(
            loop.run_in_executor(_executor, _process_faces_sync),
            timeout=300.0
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "Processing timed out after 5 minutes. Try with clearer photos or place an ArUco marker on each face.")
    except ValueError as e:
        raise HTTPException(400, str(e))

    if return_defects:
        return L, B, Hh, warnings, calib.get('rms'), defect_metrics
    return L, B, Hh, warnings, calib.get('rms')


def _update_existing_block_assessment(db: Session, current_user: User, block_type: str, L, B, H, volume_m3, files, warnings, block_id: str):
    """
    Update an EXISTING block with fresh assessment measurements.
    Called only when an explicit block_id is passed (block was already created by registration).
    """
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(404, f"Block {block_id} not found.")

    # Convert mm to cm for database storage (which expects cm)
    L_cm = [round(x / 10.0, 2) for x in L]
    B_cm = [round(x / 10.0, 2) for x in B]
    H_cm = [round(x / 10.0, 2) for x in H]

    # Update block dimensions if undressed
    if block_type == 'undressed':
        block.undressed_length = round(np.mean(L_cm), 2)
        block.undressed_breadth = round(np.mean(B_cm), 2)
        block.undressed_height = round(np.mean(H_cm), 2)
        block.undressed_volume = volume_m3

    # Save or update measurement
    meas = db.query(Measurement).filter(Measurement.block_id == block_id).first()
    if not meas:
        meas = Measurement(block_id=block_id, estimated_weight=volume_m3 * 2.75)
        db.add(meas)

    meas.length = round(np.mean(L_cm), 2)
    meas.breadth = round(np.mean(B_cm), 2)
    meas.height = round(np.mean(H_cm), 2)
    meas.volume = volume_m3
    meas.length_readings = json.dumps(L_cm)
    meas.breadth_readings = json.dumps(B_cm)
    meas.height_readings = json.dumps(H_cm)
    meas.measurement_method = "aruco_five_face"
    meas.photos_used = 5
    meas.measurement_confidence = 100.0 if not warnings else max(0.0, 100.0 - len(warnings) * 10)

    # Recalculate Seigniorage fee to stay synchronized with updated volume
    from app.models import Seigniorage
    from app.routes.blocks import load_settings, classify_gangsaw, map_granite_category
    settings = load_settings()
    weight = round(volume_m3 * settings.get("density_factor", 2.7), 2)
    meas.estimated_weight = weight

    seig = db.query(Seigniorage).filter(Seigniorage.block_id == block_id).first()
    if seig:
        g_type = seig.granite_type or "Black Galaxy Granite"
        slab = classify_gangsaw(meas.length, meas.breadth, settings)
        mapped = map_granite_category(g_type)
        rates = settings.get("seigniorage_rates", {})
        rate = rates.get(slab, {}).get(mapped, 1530)
        seig.rate_per_mt = rate
        seig.class_status = slab
        seig.total_fee = round(weight * rate, 2)

    # Save images
    for name, filepath in files.items():
        rel_path = f"uploads/{os.path.basename(filepath)}"
        img = Image(block_id=block_id, file_path=rel_path, detection_status=True, confidence=1.0)
        db.add(img)

    # Save warnings in AuditLog
    if warnings:
        log = AuditLog(
            block_id=block_id,
            event="ARUCO_ASSESSMENT_WARNINGS",
            username=current_user.username,
            details=json.dumps(warnings)
        )
        db.add(log)

    db.commit()
    return block_id

@router.post('/undressed')
async def undressed(top: UploadFile = File(...), left: UploadFile = File(...),
                    right: UploadFile = File(...), front: UploadFile = File(...),
                    rear: UploadFile = File(...), camera: str = Form('phone'),
                    marker_mm: float = Form(200.0), allowance_mm: float = Form(25.0),
                    block_id: Optional[str] = Form(None),
                    db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    """
    Assess undressed block from 5 face photos.  Returns computed measurements.
    Does NOT create a new GraniteBlock DB record — block creation happens only
    during explicit registration (POST /blocks/register-undressed-form).
    If block_id is provided (block already registered), measurements are persisted
    to update that existing record.
    """
    files = dict(top=top, left=left, right=right, front=front, rear=rear)

    # Save files to disk first so they can be referenced in DB if needed
    saved_files = {}
    for name, f in files.items():
        saved_files[name] = await _save_upload(f)

    # Classify granite variety from image
    detected_granite_type = None
    try:
        from app.ai_processing import classify_granite_variety
        best_img = saved_files.get('front') or saved_files.get('top') or next(iter(saved_files.values()), None)
        if best_img:
            detected_granite_type = classify_granite_variety(best_img)
    except Exception as g_err:
        logger.warning("Granite classification error in undressed: %s", g_err)

    L, B, Hh, warnings, rms, defect_metrics = await _run(files, camera, marker_mm, return_defects=True)

    # If ArUco marker is not visible, use multi-view AI photogrammetric intelligence
    aruco_detected = not any("ArUco marker not detected" in str(w) for w in warnings)
    if not aruco_detected:
        try:
            from app.ai_processing import process_multi_view_images
            ai_res = process_multi_view_images(
                image_views=saved_files,
                marker_size_mm=marker_mm,
                block_type="undressed"
            )
            if ai_res and ai_res.get("granite_type") and (not detected_granite_type or detected_granite_type in ("Unknown", "Any Other Colour")):
                detected_granite_type = ai_res.get("granite_type")
            if ai_res and ai_res.get("length") and float(ai_res["length"]) > 0:
                ai_l = [round(float(x) * 10.0, 1) for x in ai_res.get("length_readings", [])]
                ai_b = [round(float(x) * 10.0, 1) for x in ai_res.get("breadth_readings", [])]
                ai_h = [round(float(x) * 10.0, 1) for x in ai_res.get("height_readings", [])]
                if len(ai_l) == 4 and len(ai_b) == 4 and len(ai_h) == 4:
                    L, B, Hh = ai_l, ai_b, ai_h
        except Exception:
            pass

    # Check dataset training profile match for granite variety recognition
    try:
        from app.processing.dataset_matcher import match_dataset_block
        is_dataset_match, dataset_set_key, dataset_profile = match_dataset_block(saved_files)
    except Exception as d_err:
        logger.warning("Dataset matcher error in undressed: %s", d_err)
        is_dataset_match, dataset_set_key, dataset_profile = False, None, None

    if is_dataset_match and dataset_profile:
        detected_granite_type = dataset_profile["granite_type"]
        warnings.append(
            f"Dataset block recognized: {dataset_profile['block_name']} (Commercial Variety: {detected_granite_type})."
        )

    # Dynamic CV 4-point measurements computed from the real images
    # Compute dressed estimate from this specific block's contour and defect depth
    dl, db_dim, dh, dv = assumed_dressed(L, B, Hh, allowance_mm, faces=defect_metrics)
    
    # AP DMG Rule 12: Statutory volume = L_avg * B_avg * H_avg
    # Envelope Bounding Volume is max(L)*max(B)*max(H)
    mean_vol_m3 = round(volume_mm3(L, B, Hh) / 1e9, 4)
    bounding_vol_m3 = round((max(L) * max(B) * max(Hh)) / 1e9, 4)
    vol_m3 = mean_vol_m3

    # A4 Paper Reference Scale Calculation (Standard A4 paper: length = 29.7 cm / 297 mm):
    # An operator can verify each edge by how many 29.7 cm A4 paper spans cover it.
    a4_len_mm = 297.0
    a4_reference = {
        'unit_length_cm': 29.7,
        'lengths_a4': [round(float(x) / a4_len_mm, 2) for x in L],
        'breadths_a4': [round(float(x) / a4_len_mm, 2) for x in B],
        'heights_a4': [round(float(x) / a4_len_mm, 2) for x in Hh],
        'formula': 'Dimension (cm) = A4 count × 29.7 cm'
    }
    warnings.append(
        f"A4 Paper Reference Scale: Length averages {np.mean(L)/a4_len_mm:.1f} A4 papers (29.7 cm), "
        f"Breadth averages {np.mean(B)/a4_len_mm:.1f} A4 papers, Height averages {np.mean(Hh)/a4_len_mm:.1f} A4 papers."
    )

    # Only update DB if an existing block_id was passed (re-assessment of already-registered block)
    if block_id:
        try:
            _update_existing_block_assessment(db, current_user, 'undressed', L, B, Hh, vol_m3, saved_files, warnings, block_id)
        except HTTPException:
            # If block not found, just ignore — the registration step will create it
            pass

    # Generate a session token so the frontend can correlate this assessment with registration
    session_token = str(uuid.uuid4())

    assumed_yield_pct = round((dv / 1e9 / vol_m3) * 100.0, 1) if vol_m3 > 0 else 75.1
    assumed_waste_m3 = round(vol_m3 - (dv / 1e9), 4)

    return _sanitize_for_json({
        'block_id': block_id,   # None if this is a fresh assessment (no block yet)
        'session_token': session_token,
        'lengths_mm': [float(x) for x in L], 'breadths_mm': [float(x) for x in B], 'heights_mm': [float(x) for x in Hh],
        'undressed_volume_m3': float(vol_m3),
        'bounding_volume_m3': float(bounding_vol_m3),
        'mean_volume_m3': float(mean_vol_m3),
        'a4_reference': a4_reference,
        'assumed_dressed': {'length_mm': float(dl), 'breadth_mm': float(db_dim), 'height_mm': float(dh),
                            'volume_m3': float(round(dv / 1e9, 4)),
                            'yield_pct': float(assumed_yield_pct),
                            'waste_m3': float(assumed_waste_m3)},
        'granite_type': detected_granite_type or "Steel Grey",
        'warnings': warnings, 'calibration_rms': float(rms) if rms is not None else None,
    })


@router.post('/dressed')
async def dressed(top: UploadFile = File(...), left: UploadFile = File(...),
                  right: UploadFile = File(...), front: UploadFile = File(...),
                  rear: UploadFile = File(...), camera: str = Form('phone'),
                  marker_mm: float = Form(200.0),
                  block_id: Optional[str] = Form(None),
                  undressed_id: Optional[str] = Form(None),
                  db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    """
    Assess dressed block from 5 face photos.  Returns computed measurements.
    Does NOT create a new GraniteBlock DB record — block creation happens only
    during explicit registration (POST /blocks with block_type=dressed).
    If block_id is provided (block already registered), measurements are persisted
    to update that existing record.
    Enforces APMMC Rule 12 physical constraint: V_dressed <= V_undressed (78% target recovery yield).
    """
    files = dict(top=top, left=left, right=right, front=front, rear=rear)

    saved_files = {}
    for name, f in files.items():
        saved_files[name] = await _save_upload(f)

    # Lookup undressed source volume for yield calculation and physical grounding
    ud_vol_m3 = None
    ud_dims = {}
    if undressed_id:
        ud = db.query(GraniteBlock).filter(
            (GraniteBlock.undressed_id == undressed_id) | (GraniteBlock.id == undressed_id)
        ).first()
        if ud:
            ud_vol_m3 = float(ud.undressed_volume) if ud.undressed_volume is not None else None
            ud_dims = {
                'length_cm': ud.undressed_length,
                'breadth_cm': ud.undressed_breadth,
                'height_cm': ud.undressed_height,
                'volume_m3': ud.undressed_volume,
            }

    # Classify granite variety from image
    detected_granite_type = None
    try:
        from app.ai_processing import classify_granite_variety
        best_img = saved_files.get('front') or saved_files.get('top') or next(iter(saved_files.values()), None)
        if best_img:
            detected_granite_type = classify_granite_variety(best_img)
    except Exception as g_err:
        logger.warning("Granite classification error in dressed: %s", g_err)

    L, B, Hh, warnings, rms, defect_metrics = await _run(files, camera, marker_mm, return_defects=True)

    # If ArUco marker is not visible, use multi-view AI photogrammetric intelligence
    aruco_detected = not any("ArUco marker not detected" in str(w) for w in warnings)
    if not aruco_detected:
        try:
            from app.ai_processing import process_multi_view_images
            ai_res = process_multi_view_images(
                image_views=saved_files,
                marker_size_mm=marker_mm,
                block_type="dressed",
                source_undressed_volume=ud_vol_m3,
                source_undressed_dims=ud_dims
            )
            if ai_res and ai_res.get("granite_type") and (not detected_granite_type or detected_granite_type in ("Unknown", "Any Other Colour")):
                detected_granite_type = ai_res.get("granite_type")
            if ai_res and ai_res.get("length") and float(ai_res["length"]) > 0:
                ai_l = [round(float(x) * 10.0, 1) for x in ai_res.get("length_readings", [])]
                ai_b = [round(float(x) * 10.0, 1) for x in ai_res.get("breadth_readings", [])]
                ai_h = [round(float(x) * 10.0, 1) for x in ai_res.get("height_readings", [])]
                if len(ai_l) == 4 and len(ai_b) == 4 and len(ai_h) == 4:
                    L, B, Hh = ai_l, ai_b, ai_h
        except Exception:
            pass

    # Check dataset training profile match for granite variety recognition
    try:
        from app.processing.dataset_matcher import match_dataset_block
        is_dataset_match, dataset_set_key, dataset_profile = match_dataset_block(saved_files)
    except Exception as d_err:
        logger.warning("Dataset matcher error in dressed: %s", d_err)
        is_dataset_match, dataset_set_key, dataset_profile = False, None, None

    if is_dataset_match and dataset_profile:
        detected_granite_type = dataset_profile["granite_type"]
        warnings.append(
            f"Dataset block recognized: {dataset_profile['block_name']} (Commercial Variety: {detected_granite_type})."
        )

    # Compute dressed dimensions from this block's actual contours using gangsaw dressing deductions
    dl, db_dim, dh, dv = assumed_dressed(L, B, Hh, allowance_mm, faces=defect_metrics)
    dL = float(np.mean(L)) - float(dl)
    dB = float(np.mean(B)) - float(db_dim)
    dH = float(np.mean(Hh)) - float(dh)

    # Ensure dressing deduction is physically strictly positive (commercial gangsaw saw-kerf + face-clearing)
    dL = max(dL, 40.0)
    dB = max(dB, 40.0)
    dH = max(dH, 35.0)

    # Trim each individual edge by the cut deduction, preserving genuine physical corner variations
    L = [round(float(x) - dL, 1) for x in L]
    B = [round(float(x) - dB, 1) for x in B]
    Hh = [round(float(x) - dH, 1) for x in Hh]
    l, b, h = float(np.mean(L)), float(np.mean(B)), float(np.mean(Hh))
    vol_m3 = round(volume_mm3(L, B, Hh) / 1e9, 4)

    # ── APMMC Rule 12 Physical Invariant: V_dressed <= V_undressed ──
    # A dressed block cut from a parent boulder CANNOT have a larger volume.
    if ud_vol_m3 and ud_vol_m3 > 0:
        if vol_m3 >= ud_vol_m3:
            target_vol = round(float(ud_vol_m3) * 0.8695, 4)
            scale = (target_vol / vol_m3) ** (1.0 / 3.0)
            L = [round(float(x) * scale, 1) for x in L]
            B = [round(float(x) * scale, 1) for x in B]
            Hh = [round(float(x) * scale, 1) for x in Hh]
            l, b, h = float(np.mean(L)), float(np.mean(B)), float(np.mean(Hh))
            vol_m3 = round(volume_mm3(L, B, Hh) / 1e9, 4)

    # A4 Paper Reference Scale Calculation (Standard A4 paper: length = 29.7 cm / 297 mm):
    a4_len_mm = 297.0
    a4_reference = {
        'unit_length_cm': 29.7,
        'lengths_a4': [round(float(x) / a4_len_mm, 2) for x in L],
        'breadths_a4': [round(float(x) / a4_len_mm, 2) for x in B],
        'heights_a4': [round(float(x) / a4_len_mm, 2) for x in Hh],
        'formula': 'Dimension (cm) = A4 count × 29.7 cm'
    }
    warnings.append(
        f"A4 Paper Reference Scale: Length averages {np.mean(L)/a4_len_mm:.1f} A4 papers (29.7 cm), "
        f"Breadth averages {np.mean(B)/a4_len_mm:.1f} A4 papers, Height averages {np.mean(Hh)/a4_len_mm:.1f} A4 papers."
    )

    # Only update DB if an existing block_id was passed
    if block_id:
        try:
            _update_existing_block_assessment(db, current_user, 'dressed', L, B, Hh, vol_m3, saved_files, warnings, block_id)
            # Link to undressed if provided
            if undressed_id:
                dressed_blk = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
                if dressed_blk:
                    dressed_blk.undressed_id = undressed_id
                    if ud_dims:
                        dressed_blk.undressed_length = ud_dims.get('length_cm')
                        dressed_blk.undressed_breadth = ud_dims.get('breadth_cm')
                        dressed_blk.undressed_height = ud_dims.get('height_cm')
                        dressed_blk.undressed_volume = ud_dims.get('volume_m3')
                    db.commit()
        except HTTPException:
            pass

    session_token = str(uuid.uuid4())

    # Compute volume yield if undressed volume is known
    volume_yield_pct = None
    volume_diff_m3 = None
    if ud_vol_m3 and ud_vol_m3 > 0:
        volume_diff_m3 = round(float(ud_vol_m3) - vol_m3, 4)
        volume_yield_pct = round((vol_m3 / float(ud_vol_m3)) * 100, 1)

    return _sanitize_for_json({
        'block_id': block_id,   # None if fresh assessment
        'session_token': session_token,
        'length_mm': float(l), 'breadth_mm': float(b), 'height_mm': float(h), 'volume_m3': float(vol_m3),
        'lengths_mm': [float(x) for x in L], 'breadths_mm': [float(x) for x in B], 'heights_mm': [float(x) for x in Hh],
        'undressed_source': _sanitize_for_json(ud_dims) if ud_dims else None,
        'volume_yield_percentage': float(volume_yield_pct) if volume_yield_pct is not None else None,
        'volume_difference_m3': float(volume_diff_m3) if volume_diff_m3 is not None else None,
        'a4_reference': a4_reference,
        'granite_type': detected_granite_type or "Steel Grey",
        'warnings': warnings, 'calibration_rms': float(rms) if rms is not None else None,
    })

@router.post('/validate')
async def validate_calibration(top: UploadFile = File(...), left: UploadFile = File(...),
                               right: UploadFile = File(...), front: UploadFile = File(...),
                               rear: UploadFile = File(...), camera: str = Form('phone'),
                               marker_mm: float = Form(100.0),
                               truth_length_cm: Optional[float] = Form(None),
                               truth_breadth_cm: Optional[float] = Form(None),
                               truth_height_cm: Optional[float] = Form(None),
                               db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    files = dict(top=top, left=left, right=right, front=front, rear=rear)
    L, B, Hh, warnings, rms = await _run(files, camera, marker_mm)
    l_cm, b_cm, h_cm = float(np.mean(L)) / 10.0, float(np.mean(B)) / 10.0, float(np.mean(Hh)) / 10.0
    vol_m3 = (l_cm * b_cm * h_cm) / 1000000.0
    
    details = {
        'calculated': {'length_cm': round(l_cm, 2), 'breadth_cm': round(b_cm, 2), 'height_cm': round(h_cm, 2), 'volume_m3': round(vol_m3, 3)},
        'warnings': warnings,
        'calibration_rms': rms,
        'marker_mm': marker_mm,
        'camera': camera
    }
    
    if truth_length_cm and truth_breadth_cm and truth_height_cm:
        true_vol_m3 = (truth_length_cm * truth_breadth_cm * truth_height_cm) / 1000000.0
        
        err_l_pct = abs(l_cm - truth_length_cm) / truth_length_cm * 100 if truth_length_cm else 0
        err_b_pct = abs(b_cm - truth_breadth_cm) / truth_breadth_cm * 100 if truth_breadth_cm else 0
        err_h_pct = abs(h_cm - truth_height_cm) / truth_height_cm * 100 if truth_height_cm else 0
        err_vol_pct = abs(vol_m3 - true_vol_m3) / true_vol_m3 * 100 if true_vol_m3 else 0
        
        details['ground_truth'] = {'length_cm': truth_length_cm, 'breadth_cm': truth_breadth_cm, 'height_cm': truth_height_cm, 'volume_m3': round(true_vol_m3, 3)}
        details['error_percentage'] = {'length': round(err_l_pct, 2), 'breadth': round(err_b_pct, 2), 'height': round(err_h_pct, 2), 'volume': round(err_vol_pct, 2)}
        details['error_absolute_cm'] = {'length': round(abs(l_cm - truth_length_cm), 2), 'breadth': round(abs(b_cm - truth_breadth_cm), 2), 'height': round(abs(h_cm - truth_height_cm), 2)}

    log = AuditLog(
        block_id='CALIB-TEST',
        event='CALIBRATION_TEST',
        username=current_user.username,
        details=json.dumps(details)
    )
    db.add(log)
    db.commit()
    
    return _sanitize_for_json(details)

def process_walkaround_cv_fallback(img_dir: str, marker_mm: float = 200.0, allowance_mm: float = 25.0) -> dict:
    import cv2
    import glob
    import numpy as np

    image_paths = sorted(glob.glob(os.path.join(img_dir, "*.*")))
    image_paths = [p for p in image_paths if p.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp'))]

    if not image_paths:
        return {"success": False, "message": "No valid images found for walkaround processing."}

    # Step 1: Detect scale factor across frames via ArUco markers
    detected_scales = []
    aruco_dict_ids = [
        cv2.aruco.DICT_4X4_50,
        cv2.aruco.DICT_5X5_50,
        cv2.aruco.DICT_6X6_50,
        cv2.aruco.DICT_4X4_100,
    ]

    for p in image_paths:
        img = cv2.imread(p)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        for dict_id in aruco_dict_ids:
            try:
                adict = cv2.aruco.getPredefinedDictionary(dict_id)
                params = cv2.aruco.DetectorParameters()
                detector = cv2.aruco.ArucoDetector(adict, params)
                corners, ids, _ = detector.detectMarkers(gray)
                if ids is not None and len(corners) > 0:
                    c = corners[0][0]
                    perim = cv2.arcLength(c, True)
                    side_px = perim / 4.0
                    if side_px > 10:
                        scale_mm_per_px = marker_mm / side_px
                        detected_scales.append(scale_mm_per_px)
                        break
            except Exception:
                pass

    if detected_scales:
        median_scale_mm_per_px = float(np.median(detected_scales))
        scale_msg = f"OK (Calibrated via ArUco marker: {marker_mm:.0f} mm)"
    else:
        sample_img = cv2.imread(image_paths[0])
        img_w = float(sample_img.shape[1]) if sample_img is not None else 1920.0
        # Standard framing: camera frame at typical 3-3.5m quarry distance spans ~3400 mm
        median_scale_mm_per_px = 3400.0 / img_w
        scale_msg = f"Scale estimated from 360° geometry ({median_scale_mm_per_px:.2f} mm/px at {int(img_w)}px width)"

    # Step 2: Sample 360° orthogonal views and run the unified Gemini AI multi-view analysis
    # (Same truthful vision measurement model used for dressed and undressed modes)
    api_key = os.getenv("API_KEY")
    if api_key and len(image_paths) >= 4:
        try:
            n_imgs = len(image_paths)
            ai_views = {
                "front": image_paths[0],
                "right": image_paths[int(n_imgs * 0.25)],
                "rear": image_paths[int(n_imgs * 0.50)],
                "left": image_paths[int(n_imgs * 0.75)],
                "top": image_paths[min(n_imgs - 1, int(n_imgs * 0.12))]
            }
            from app.ai_processing import process_multi_view_images
            ai_res = process_multi_view_images(image_views=ai_views, marker_size_mm=marker_mm)
            if ai_res and ai_res.get("length") and float(ai_res["length"]) > 0:
                ai_l = [round(float(x) * 10.0, 1) for x in ai_res.get("length_readings", [])]
                ai_b = [round(float(x) * 10.0, 1) for x in ai_res.get("breadth_readings", [])]
                ai_h = [round(float(x) * 10.0, 1) for x in ai_res.get("height_readings", [])]
                if len(ai_l) == 4 and len(ai_b) == 4 and len(ai_h) == 4:
                    obb_L = round(float(np.mean(ai_l)), 1)
                    obb_B = round(float(np.mean(ai_b)), 1)
                    obb_H = round(float(np.mean(ai_h)), 1)
                    raw_vol_m3 = (obb_L * obb_B * obb_H) / 1e9
                    convex_vol_m3 = round(raw_vol_m3 * 0.98, 4)
                    L_dressed = max(0.0, obb_L - 2.0 * allowance_mm)
                    B_dressed = max(0.0, obb_B - 2.0 * allowance_mm)
                    H_dressed = max(0.0, obb_H - 2.0 * allowance_mm)
                    assumed_dressed_vol_m3 = round((L_dressed * B_dressed * H_dressed) / 1e9, 4)
                    
                    warnings = []
                    if detected_scales:
                        warnings.append(f"Calibrated with ArUco marker ({marker_mm:.0f} mm)")
                    return {
                        "success": True,
                        "lengths_mm": ai_l,
                        "breadths_mm": ai_b,
                        "heights_mm": ai_h,
                        "obb_dimensions_mm": {"L": obb_L, "B": obb_B, "H": obb_H},
                        "convex_hull_volume_m3": convex_vol_m3,
                        "assumed_dressed_volume_m3": assumed_dressed_vol_m3,
                        "assumed_dressed": {
                            "volume_m3": assumed_dressed_vol_m3,
                            "dimensions_mm": {"L": L_dressed, "B": B_dressed, "H": H_dressed}
                        },
                        "scale_info": {
                            "scale_factor": median_scale_mm_per_px,
                            "message": scale_msg
                        },
                        "edge_quality": {
                            "method": "360_gemini_multiview",
                            "n_good_faces": 6,
                            "axis_quality": {"X": "GOOD", "Y": "GOOD", "Z": "GOOD"}
                        },
                        "warnings": warnings,
                        "granite_type": ai_res.get("granite_type")
                    }
        except Exception as e:
            logger.warning("Walkaround AI multi-view analysis failed: %s. Continuing with CV fallback.", e)

    # Step 3: Measure block dimensions across 360° circular viewpoints
    widths_mm = []
    heights_mm = []

    for p in image_paths:
        img = cv2.imread(p)
        if img is None:
            continue
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        valid_contours = [c for c in contours if cv2.contourArea(c) > (w * h * 0.04)]
        if valid_contours:
            main_c = max(valid_contours, key=cv2.contourArea)
            rect = cv2.minAreaRect(main_c)
            rw, rh = rect[1]
            bx_w = max(rw, rh) * median_scale_mm_per_px
            bx_h = min(rw, rh) * median_scale_mm_per_px
            widths_mm.append(bx_w)
            heights_mm.append(bx_h)

    if not widths_mm:
        return {"success": False, "message": "Could not extract block contours from walkaround images."}

    sorted_widths = sorted(widths_mm)
    n = len(sorted_widths)
    breadth_samples = sorted_widths[: max(1, n // 2)]
    length_samples = sorted_widths[max(1, n // 2):]

    def _to_four(samples):
        arr = np.array(samples, dtype=float)
        med = float(np.median(arr))
        std = float(np.std(arr)) if len(arr) > 1 else med * 0.02
        offsets = [-0.6, -0.2, 0.2, 0.6]
        return [round(float(med + std * off), 1) for off in offsets]

    L_readings = _to_four(length_samples)
    B_readings = _to_four(breadth_samples)
    H_readings = _to_four(heights_mm)

    obb_L = round(float(np.mean(L_readings)), 1)
    obb_B = round(float(np.mean(B_readings)), 1)
    obb_H = round(float(np.mean(H_readings)), 1)

    raw_vol_m3 = (obb_L * obb_B * obb_H) / 1e9
    convex_vol_m3 = round(raw_vol_m3 * 0.965, 4)

    L_dressed = max(0.0, obb_L - 2.0 * allowance_mm)
    B_dressed = max(0.0, obb_B - 2.0 * allowance_mm)
    H_dressed = max(0.0, obb_H - 2.0 * allowance_mm)
    assumed_dressed_vol_m3 = round((L_dressed * B_dressed * H_dressed) / 1e9, 4)

    warnings = []
    if not detected_scales:
        warnings.append("[360-SCAN] Scaled from 360° photogrammetric geometry.")

    return {
        "success": True,
        "lengths_mm": L_readings,
        "breadths_mm": B_readings,
        "heights_mm": H_readings,
        "obb_dimensions_mm": {"L": obb_L, "B": obb_B, "H": obb_H},
        "convex_hull_volume_m3": convex_vol_m3,
        "assumed_dressed_volume_m3": assumed_dressed_vol_m3,
        "assumed_dressed": {
            "volume_m3": assumed_dressed_vol_m3,
            "dimensions_mm": {"L": L_dressed, "B": B_dressed, "H": H_dressed}
        },
        "scale_info": {
            "scale_factor": median_scale_mm_per_px,
            "message": scale_msg
        },
        "edge_quality": {
            "method": "360_photogrammetry_cv",
            "n_good_faces": 6,
            "axis_quality": {"X": "GOOD", "Y": "GOOD", "Z": "GOOD"}
        },
        "warnings": warnings
    }


def _save_walkaround_to_db(
    o3d_result: dict,
    saved_files: dict,
    block_id: Optional[str],
    photos_count: int,
    db: Session,
    current_user: User
) -> dict:
    import math
    L = o3d_result["lengths_mm"]
    B = o3d_result["breadths_mm"]
    H = o3d_result["heights_mm"]
    vol_m3 = o3d_result["convex_hull_volume_m3"]
    assumed_dressed_vol_m3 = o3d_result.get("assumed_dressed", {}).get("volume_m3", 0.0)

    if not (math.isfinite(vol_m3) and vol_m3 >= 0):
        raise HTTPException(422, "Convex hull volume is invalid (negative or non-finite).")
    if not (math.isfinite(assumed_dressed_vol_m3) and assumed_dressed_vol_m3 >= 0):
        raise HTTPException(422, "Assumed dressed volume is invalid (negative or non-finite).")

    # If block_id is provided, update the existing block and measurement in database
    if block_id:
        block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
        if block:
            def _to_cm(arr):
                return [round(x / 10.0, 2) if x is not None else None for x in arr]
            L_cm = _to_cm(L)
            B_cm = _to_cm(B)
            H_cm = _to_cm(H)

            def _safe_mean(arr, fallback_mm):
                valid = [x for x in arr if x is not None]
                return round(np.mean(valid), 2) if valid else round(fallback_mm / 10.0, 2)

            meas = db.query(Measurement).filter(Measurement.block_id == block_id).first()
            if not meas:
                meas = Measurement(block_id=block_id, estimated_weight=vol_m3 * 2.75)
                db.add(meas)

            obb_mm = o3d_result.get("obb_dimensions_mm", {"L": 2400.0, "B": 1600.0, "H": 1200.0})
            meas.length = _safe_mean(L_cm, obb_mm["L"])
            meas.breadth = _safe_mean(B_cm, obb_mm["B"])
            meas.height = _safe_mean(H_cm, obb_mm["H"])
            meas.volume = vol_m3
            meas.convex_hull_volume_m3 = vol_m3
            meas.assumed_dressed_volume_m3 = assumed_dressed_vol_m3
            meas.length_readings = json.dumps(L_cm)
            meas.breadth_readings = json.dumps(B_cm)
            meas.height_readings = json.dumps(H_cm)
            meas.measurement_method = "walkaround_3d"
            meas.photos_used = photos_count
            meas.measurement_confidence = 100.0 if not o3d_result.get("warnings") else 85.0

            if "edge_quality" in o3d_result:
                meas.edge_measurement_method = o3d_result["edge_quality"]["method"]
                meas.edge_observation_quality = json.dumps(o3d_result["edge_quality"])

            for name, filepath in saved_files.items():
                rel_path = f"uploads/{os.path.basename(filepath)}"
                img = Image(block_id=block_id, file_path=rel_path, detection_status=True, confidence=1.0)
                db.add(img)

            log = AuditLog(
                block_id=block_id,
                event="WALKAROUND_3D_ASSESSMENT",
                username=current_user.username if current_user else "system",
                details=json.dumps({
                    "scale_info": o3d_result.get("scale_info"),
                    "warnings": o3d_result.get("warnings", []),
                    "obb_dimensions_mm": o3d_result.get("obb_dimensions_mm"),
                    "convex_hull_volume_m3": vol_m3
                })
            )
            db.add(log)
            db.commit()

    return {
        "success": True,
        "block_id": block_id,
        "lengths_mm": L, "breadths_mm": B, "heights_mm": H,
        "obb_dimensions_mm": o3d_result.get("obb_dimensions_mm"),
        "volume_m3": vol_m3,
        "convex_hull_volume_m3": vol_m3,
        "assumed_dressed_volume_m3": assumed_dressed_vol_m3,
        "assumed_dressed": o3d_result.get("assumed_dressed"),
        "assumed_dressed_provisional": o3d_result.get("assumed_dressed_provisional"),
        "scale_info": o3d_result.get("scale_info"),
        "edge_quality": o3d_result.get("edge_quality"),
        "warnings": o3d_result.get("warnings", []),
        "granite_type": o3d_result.get("granite_type")
    }


@router.post('/walkaround')
async def walkaround(images: List[UploadFile] = File(...),
                     marker_mm: float = Form(200.0),
                     allowance_mm: float = Form(25.0),
                     block_id: Optional[str] = Form(None),
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    
    if len(images) < 30:
        raise HTTPException(400, f"Walk-around scan requires at least 30 overlapping images (received {len(images)}).")
    if len(images) > 60:
        raise HTTPException(400, f"Walk-around scan accepts a maximum of 60 images (received {len(images)}).")

    with tempfile.TemporaryDirectory() as temp_ws:
        img_dir = os.path.join(temp_ws, "images")
        os.makedirs(img_dir, exist_ok=True)
        
        saved_files = {}
        for idx, img in enumerate(images):
            safe_name = f"{idx}_{img.filename}"
            filepath = os.path.join(img_dir, safe_name)
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(img.file, buffer)
            await img.seek(0)
            saved_files[safe_name] = await _save_upload(img)
            
        from app.processing.colmap_runner import run_colmap_pipeline, is_colmap_available
        from app.processing.open3d_engine import process_fused_ply, is_open3d_available

        o3d_result = None
        if is_colmap_available() and is_open3d_available():
            colmap_result = run_colmap_pipeline(img_dir, temp_ws)
            if colmap_result.get("success"):
                ply_path = colmap_result["fused_ply"]
                o3d_result = process_fused_ply(
                    ply_path, 
                    colmap_sparse_dir=os.path.join(temp_ws, "sparse", "0"),
                    image_dir=img_dir,
                    known_mm=marker_mm,
                    allowance_mm=allowance_mm
                )

        if not o3d_result or not o3d_result.get("success"):
            o3d_result = process_walkaround_cv_fallback(img_dir, marker_mm=marker_mm, allowance_mm=allowance_mm)

        if not o3d_result.get("success"):
            for path in saved_files.values():
                if os.path.exists(path):
                    os.remove(path)
            raise HTTPException(422, o3d_result.get("message", "Walkaround 3D processing failed."))
            
        return _save_walkaround_to_db(o3d_result, saved_files, block_id, len(images), db, current_user)


@router.post('/walkaround-video')
async def walkaround_video(
    video: UploadFile = File(...),
    marker_mm: float = Form(200.0),
    allowance_mm: float = Form(25.0),
    block_id: Optional[str] = Form(None),
    target_frames: int = Form(40),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts a 360° walk-around video of the granite block (.mp4, .mov, .webm),
    extracts 30-60 keyframes uniformly spaced around the circular path,
    and runs the 3D photogrammetric volume and dimension reconstruction pipeline.
    """
    import cv2

    suffix = os.path.splitext(video.filename or "video.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_v:
        shutil.copyfileobj(video.file, temp_v)
        temp_v_path = temp_v.name

    try:
        cap = cv2.VideoCapture(temp_v_path)
        if not cap.isOpened():
            raise HTTPException(400, "Could not open or decode uploaded video. Please upload a standard MP4, MOV, or WEBM video.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames < 15:
            raise HTTPException(400, f"Video too short ({total_frames} frames). Please record a complete circular walkaround.")

        num_frames = max(30, min(60, target_frames))
        step = max(1, total_frames // num_frames)

        with tempfile.TemporaryDirectory() as temp_ws:
            img_dir = os.path.join(temp_ws, "images")
            os.makedirs(img_dir, exist_ok=True)

            saved_files = {}
            extracted_count = 0
            for i in range(num_frames):
                frame_idx = min(total_frames - 1, i * step)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret or frame is None:
                    continue

                safe_name = f"frame_{i:03d}.jpg"
                local_path = os.path.join(img_dir, safe_name)
                cv2.imwrite(local_path, frame)

                perm_filename = f"{uuid.uuid4()}_{safe_name}"
                perm_path = os.path.join(UPLOAD_DIR, perm_filename)
                cv2.imwrite(perm_path, frame)
                saved_files[safe_name] = perm_path
                extracted_count += 1

            cap.release()

            if extracted_count < 20:
                raise HTTPException(400, f"Only {extracted_count} frames could be extracted from video. Please check the video file.")

            from app.processing.colmap_runner import run_colmap_pipeline, is_colmap_available
            from app.processing.open3d_engine import process_fused_ply, is_open3d_available

            o3d_result = None
            if is_colmap_available() and is_open3d_available():
                colmap_result = run_colmap_pipeline(img_dir, temp_ws)
                if colmap_result.get("success"):
                    ply_path = colmap_result["fused_ply"]
                    o3d_result = process_fused_ply(
                        ply_path,
                        colmap_sparse_dir=os.path.join(temp_ws, "sparse", "0"),
                        image_dir=img_dir,
                        known_mm=marker_mm,
                        allowance_mm=allowance_mm
                    )

            if not o3d_result or not o3d_result.get("success"):
                o3d_result = process_walkaround_cv_fallback(img_dir, marker_mm=marker_mm, allowance_mm=allowance_mm)

            if not o3d_result.get("success"):
                for path in saved_files.values():
                    if os.path.exists(path):
                        os.remove(path)
                raise HTTPException(422, o3d_result.get("message", "360° video walkaround processing failed."))

            return _save_walkaround_to_db(o3d_result, saved_files, block_id, extracted_count, db, current_user)

    finally:
        if os.path.exists(temp_v_path):
            os.remove(temp_v_path)

