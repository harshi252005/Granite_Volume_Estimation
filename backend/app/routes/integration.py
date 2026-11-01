import math
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Union
# pyrefly: ignore [missing-import]
from ..database import get_db
# pyrefly: ignore [missing-import]
from ..models import GraniteBlock, Quarry, Weighbridge, Dispatch, Seigniorage, Measurement, OmepsSyncLog
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integration/omeps", tags=["OMEPS 2.0 Integration"])

class OmepsBlockValidation(BaseModel):
    block_id: str
    quarry_name: Optional[str] = "Quarry"
    mdl_number: Optional[str] = None
    district: Optional[str] = None
    gps_coordinates: Optional[str] = None
    status: Optional[str] = "dressed"
    ai_length: Optional[float] = None
    ai_breadth: Optional[float] = None
    ai_height: Optional[float] = None
    ai_volume_cbm: Optional[float] = None
    ai_estimated_weight_mt: Optional[float] = None
    weighbridge_actual_weight_mt: Optional[float] = None
    weighbridge_variance_percent: Optional[float] = None
    weighbridge_status: Optional[str] = None
    seigniorage_type: Optional[str] = None
    seigniorage_rate_per_mt: Optional[float] = None
    seigniorage_fee: Optional[float] = None
    seigniorage_class: Optional[str] = None
    e_permit_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    destination: Optional[str] = None
    dispatch_time: Optional[datetime] = None
    cross_validated: Optional[bool] = False
    mismatch_flagged: Optional[bool] = False
    validation_status: Optional[str] = None
    difference_mt: Optional[float] = None

    class Config:
        from_attributes = True

def _clean_float(val, precision=3) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, precision)
    except (ValueError, TypeError):
        return None

def map_to_omeps(block: GraniteBlock, db: Optional[Session] = None) -> OmepsBlockValidation:
    quarry = getattr(block, "quarry", None)
    meas = getattr(block, "measurement", None)
    seig = getattr(block, "seigniorage", None)
    weigh = getattr(block, "weighbridge", None)
    disp = getattr(block, "dispatch", None)

    ai_w = _clean_float(getattr(meas, "estimated_weight", None), 3) if meas else None
    wb_w = _clean_float(getattr(weigh, "actual_weight", None), 3) if weigh else None
    
    diff_mt = None
    if ai_w is not None and wb_w is not None:
        diff_mt = _clean_float(abs(ai_w - wb_w), 3)

    if diff_mt is None:
        v_status = "PENDING_WEIGHBRIDGE"
    elif diff_mt <= 0.5:
        v_status = "PASS"
    elif diff_mt <= 1.5:
        v_status = "WARNING"
    else:
        v_status = "FAILED"

    b_status = getattr(block, "status", "dressed") or "dressed"
    w_status = getattr(weigh, "status", None) if weigh else None

    # Cross validation status logic
    cross_validated = b_status in [
        "weighbridge_approved", "weighbridge_verified", "dispatched", 
        "permit_ready", "dmgo_approved", "received"
    ]
    mismatch_flagged = (b_status == "weighbridge_flagged") or (w_status == "flagged") or (diff_mt is not None and diff_mt > 1.5)

    # Resolve e-permit number
    e_permit = getattr(disp, "e_permit_number", None) if disp else None
    if not e_permit and db:
        try:
            from .omeps import _generate_permit_number
            e_permit = _generate_permit_number(block, db)
        except Exception:
            e_permit = f"EP260637{str(block.id)[-4:]}"
    elif not e_permit and cross_validated:
        e_permit = f"EP260637{str(block.id)[-4:]}"

    # Safe datetime parse
    disp_time = getattr(disp, "dispatch_time", None) if disp else None
    if isinstance(disp_time, str):
        try:
            disp_time = datetime.fromisoformat(disp_time.replace("Z", "+00:00"))
        except Exception:
            disp_time = None

    return OmepsBlockValidation(
        block_id=str(block.id),
        quarry_name=getattr(quarry, "name", "Chimakurthy Quarry") or "Chimakurthy Quarry",
        mdl_number=getattr(quarry, "mdl_number", None) if quarry else None,
        district=getattr(quarry, "district", "Prakasam") if quarry else "Prakasam",
        gps_coordinates=getattr(block, "gps", None),
        status=b_status,
        ai_length=_clean_float(getattr(meas, "length", None), 2) if meas else None,
        ai_breadth=_clean_float(getattr(meas, "breadth", None), 2) if meas else None,
        ai_height=_clean_float(getattr(meas, "height", None), 2) if meas else None,
        ai_volume_cbm=_clean_float(getattr(meas, "volume", None), 4) if meas else None,
        ai_estimated_weight_mt=ai_w,
        weighbridge_actual_weight_mt=wb_w,
        weighbridge_variance_percent=_clean_float(getattr(weigh, "difference_percentage", None), 2) if weigh else None,
        weighbridge_status=w_status,
        seigniorage_type=getattr(seig, "granite_type", None) if seig else None,
        seigniorage_rate_per_mt=_clean_float(getattr(seig, "rate_per_mt", None), 2) if seig else None,
        seigniorage_fee=_clean_float(getattr(seig, "total_fee", None), 2) if seig else None,
        seigniorage_class=getattr(seig, "class_status", None) if seig else None,
        e_permit_number=e_permit,
        vehicle_number=getattr(disp, "vehicle_number", None) if disp else None,
        driver_name=getattr(disp, "driver_name", None) if disp else None,
        destination=getattr(disp, "destination", None) if disp else None,
        dispatch_time=disp_time,
        cross_validated=cross_validated,
        mismatch_flagged=mismatch_flagged,
        validation_status=v_status,
        difference_mt=diff_mt
    )

@router.get("/block/{block_id}", response_model=OmepsBlockValidation)
def get_omeps_block(block_id: str, db: Session = Depends(get_db)):
    block = (
        db.query(GraniteBlock)
        .options(
            joinedload(GraniteBlock.quarry),
            joinedload(GraniteBlock.measurement),
            joinedload(GraniteBlock.seigniorage),
            joinedload(GraniteBlock.weighbridge),
            joinedload(GraniteBlock.dispatch)
        )
        .filter(GraniteBlock.id == block_id)
        .first()
    )
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Granite block not found"
        )
    return map_to_omeps(block, db)

@router.get("/validation/{block_id}")
def get_omeps_validation_detail(block_id: str, db: Session = Depends(get_db)):
    from .omeps import _compute_cross_validation, _generate_permit_number
    block = (
        db.query(GraniteBlock)
        .options(
            joinedload(GraniteBlock.quarry),
            joinedload(GraniteBlock.measurement),
            joinedload(GraniteBlock.seigniorage),
            joinedload(GraniteBlock.weighbridge),
            joinedload(GraniteBlock.dispatch)
        )
        .filter(GraniteBlock.id == block_id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    val = _compute_cross_validation(block)
    permit = _generate_permit_number(block, db)
    return {
        "block_id": block.id,
        "quarry": block.quarry.name if block.quarry else None,
        "mdl_number": block.quarry.mdl_number if block.quarry else None,
        "district": block.quarry.district if block.quarry else None,
        "permit_number": permit,
        "block_status": block.status,
        **val
    }

@router.get("/blocks", response_model=List[OmepsBlockValidation])
def get_omeps_blocks(db: Session = Depends(get_db)):
    try:
        blocks = (
            db.query(GraniteBlock)
            .options(
                joinedload(GraniteBlock.quarry),
                joinedload(GraniteBlock.measurement),
                joinedload(GraniteBlock.seigniorage),
                joinedload(GraniteBlock.weighbridge),
                joinedload(GraniteBlock.dispatch)
            )
            .order_by(GraniteBlock.creation_time.desc())
            .limit(300)
            .all()
        )
        results = []
        for b in blocks:
            try:
                mapped = map_to_omeps(b, db)
                if mapped:
                    results.append(mapped)
            except Exception as item_err:
                logger.warning("Error mapping block %s to OMEPS: %s", getattr(b, "id", "unknown"), item_err)
                continue
        return results
    except Exception as e:
        logger.error("Error retrieving OMEPS blocks: %s", e)
        return []

@router.post("/sync")
def sync_omeps_integration(db: Session = Depends(get_db)):
    from .omeps import sync_omeps
    # pyrefly: ignore [missing-import]
    from ..models import User
    admin_user = db.query(User).filter(User.role == "admin").first()
    if not admin_user:
        admin_user = User(username="system", role="admin")
    return sync_omeps(db=db, current_user=admin_user)

@router.get("/logs")
def get_omeps_logs_integration(db: Session = Depends(get_db)):
    from .omeps import get_omeps_logs
    # pyrefly: ignore [missing-import]
    from ..models import User
    admin_user = db.query(User).filter(User.role == "admin").first()
    if not admin_user:
        admin_user = User(username="system", role="admin")
    return get_omeps_logs(db=db, current_user=admin_user)


