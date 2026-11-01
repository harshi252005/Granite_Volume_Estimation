"""
aruco_scale.py - ArUco-based metric scale calibration for SMART GRANITE.

Walk-Around (3-D) pipeline
When a COLMAP reconstruction is available the scale is estimated from 3-D
reconstructed marker corners rather than from 2-D pixel geometry.
See: colmap_aruco_scale_factor() and the COLMAP data-format helpers below.

Mode A (five-face) pipeline
Per-face homographies are built from the 2-D marker corners in each image
using the *known physical marker size*.  The 2-D pixel to mm transform is
exact only when the camera-to-marker distance is zero; for flat faces viewed
nearly square-on the error is small and bounded by the tilt warning.

Design contract (Task 7.3)
* ArUco dictionary, accepted-ID set and physical marker size are all explicit
  configuration values read from config.json via config_manager.load_settings().
* No silent fallback to red-color detection.  Failure raises ValueError.
* Scale is applied exactly once in open3d_engine.process_fused_ply().
* Invalid / non-finite scale factors are rejected before use.
"""
from __future__ import annotations

import json
import logging
import math
import struct
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
DEFAULT_MARKER_SIZE_MM: float = 100.0
DEFAULT_ARUCO_DICT_NAME: str = "DICT_4X4_50"
CALIB_DIR = Path(__file__).resolve().parent.parent.parent / "calibration"
# Backwards-compat alias so existing tests that import ARUCO_DICT still work
ARUCO_DICT: int = cv2.aruco.DICT_4X4_50


# ── Configuration helpers ────────────────────────────────────────────────────
def _load_app_config() -> dict:
    """Load config.json via config_manager (falls back to defaults on error)."""
    try:
        from app.config_manager import load_settings  # type: ignore
        return load_settings()
    except Exception:
        return {}


def get_aruco_dict_id(dict_name: Optional[str] = None) -> int:
    """Return the cv2.aruco dictionary integer constant for dict_name."""
    if dict_name is None:
        cfg = _load_app_config()
        dict_name = cfg.get("aruco_dict", DEFAULT_ARUCO_DICT_NAME)

    mapping: Dict[str, int] = {
        "DICT_4X4_50": cv2.aruco.DICT_4X4_50,
        "DICT_4X4_100": cv2.aruco.DICT_4X4_100,
        "DICT_4X4_250": cv2.aruco.DICT_4X4_250,
        "DICT_4X4_1000": cv2.aruco.DICT_4X4_1000,
        "DICT_5X5_50": cv2.aruco.DICT_5X5_50,
        "DICT_5X5_100": cv2.aruco.DICT_5X5_100,
        "DICT_6X6_50": cv2.aruco.DICT_6X6_50,
        "DICT_ARUCO_ORIGINAL": cv2.aruco.DICT_ARUCO_ORIGINAL,
    }
    result = mapping.get(str(dict_name).upper(), None)
    if result is None:
        logger.warning("Unknown ArUco dict name %r; falling back to DICT_4X4_50", dict_name)
        result = cv2.aruco.DICT_4X4_50
    return result


def get_accepted_marker_ids() -> Optional[Set[int]]:
    """Return the accepted marker-ID set from config, or None (accept any ID).

    Config key aruco_accepted_ids is an optional list of ints.  If absent
    or empty, any detected marker ID is accepted.
    """
    cfg = _load_app_config()
    raw = cfg.get("aruco_accepted_ids", None)
    if raw is None:
        return None
    try:
        ids = {int(i) for i in raw}
        return ids if ids else None
    except (TypeError, ValueError):
        logger.warning("aruco_accepted_ids in config is not a list of ints; accepting any ID")
        return None


def get_marker_size_mm(block_type: str = "undressed") -> float:
    """Return the configured physical marker side length for block_type."""
    cfg = _load_app_config()
    if block_type == "dressed":
        key = "aruco_marker_size_dressed_mm"
        default = 200.0
    else:
        key = "aruco_marker_size_undressed_mm"
        default = DEFAULT_MARKER_SIZE_MM
    try:
        val = float(cfg.get(key, default))
        if val <= 0 or not math.isfinite(val):
            raise ValueError(f"{key}={val!r} is not a positive finite float")
        return val
    except (TypeError, ValueError) as exc:
        logger.warning("Bad config value for %s (%s); using default %s mm", key, exc, default)
        return default


# ── Camera calibration ───────────────────────────────────────────────────────
def load_calibration(camera: str) -> dict:
    """Load camera intrinsics JSON for camera (e.g. 'phone').

    Returns dict with keys: K (3x3), dist (1x5), size ([w, h]),
    and optionally rms.
    """
    path = CALIB_DIR / f"{camera}.json"
    if not path.exists():
        raise FileNotFoundError(f"No calibration file: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Cannot parse calibration file {path}: {exc}") from exc
    for key in ("K", "dist", "size"):
        if key not in data:
            raise ValueError(f"Calibration file {path} is missing key {key!r}")
    return data


def undistort(img: np.ndarray, calib: dict) -> np.ndarray:
    """Undistort img using calibration calib."""
    w, h = calib["size"]
    if abs(img.shape[1] / img.shape[0] - w / h) > 0.02:
        raise ValueError("image aspect ratio differs from the calibration")
    if (img.shape[1], img.shape[0]) != (w, h):
        img = cv2.resize(img, (w, h))
    return cv2.undistort(img, np.array(calib["K"], dtype=np.float64),
                         np.array(calib["dist"], dtype=np.float64))


# ── 2-D ArUco detection (Mode A per image) ──────────────────────────────────
# Module-level cache: build detector once, reuse for all images in the request.
_cached_detector: Optional["cv2.aruco.ArucoDetector"] = None
_cached_dict_id: Optional[int] = None


def _build_detector(dict_id: Optional[int] = None) -> "cv2.aruco.ArucoDetector":
    """Build (or return cached) ArucoDetector with sub-pixel corner refinement."""
    global _cached_detector, _cached_dict_id
    if not hasattr(cv2.aruco, "ArucoDetector"):
        raise RuntimeError(
            f"cv2.aruco.ArucoDetector is not available in OpenCV {cv2.__version__}. "
            "Task 7.3 requires OpenCV >= 4.7."
        )
    if dict_id is None:
        dict_id = get_aruco_dict_id()
    # Return cached detector if dict hasn't changed
    if _cached_detector is not None and _cached_dict_id == dict_id:
        return _cached_detector
    params = cv2.aruco.DetectorParameters()
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
    _cached_detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(dict_id), params)
    _cached_dict_id = dict_id
    return _cached_detector


def find_marker(
    img: np.ndarray,
    marker_id: Optional[int] = None,
    accepted_ids: Optional[Set[int]] = None,
    dict_id: Optional[int] = None,
) -> np.ndarray:
    """Detect a single ArUco marker and return its four corner points (4x2).

    Selection priority:
    1. If marker_id is given, only that ID is accepted.
    2. If accepted_ids is given (non-empty set), only IDs in that set are accepted.
    3. Otherwise any ID is accepted.
    When multiple qualifying markers are visible the one with the largest pixel area
    is returned (most likely closest / most complete).

    Raises ValueError if no qualifying marker found.
    Raises RuntimeError if the OpenCV ArUco API is not available.
    """
    det = _build_detector(dict_id)
    # Downscale high-res images before detection (ArUco runs O(pixels)).
    # Markers are large enough to detect at 1280px; scale corners back afterward.
    _MAX_DET_DIM = 1280
    h_img, w_img = img.shape[:2]
    det_scale = 1.0
    det_img = img
    if max(h_img, w_img) > _MAX_DET_DIM:
        det_scale = _MAX_DET_DIM / float(max(h_img, w_img))
        det_img = cv2.resize(img, (int(w_img * det_scale), int(h_img * det_scale)), interpolation=cv2.INTER_AREA)
    corners, ids, _rejected = det.detectMarkers(det_img)

    if ids is None or len(ids) == 0:
        raise ValueError("ArUco marker not found")

    # Build effective accepted-ID set
    if marker_id is not None:
        effective_ids: Optional[Set[int]] = {int(marker_id)}
    elif accepted_ids is not None and len(accepted_ids) > 0:
        effective_ids = {int(i) for i in accepted_ids}
    else:
        effective_ids = None  # accept any

    best_corners: Optional[np.ndarray] = None
    best_area: float = -1.0

    for c, i in zip(corners, ids.ravel()):
        mid = int(i)
        if effective_ids is not None and mid not in effective_ids:
            continue
        pts = c.reshape(4, 2)
        area = float(cv2.contourArea(pts))
        if area > best_area:
            best_area = area
            best_corners = pts

    if best_corners is None:
        if marker_id is not None:
            raise ValueError(f"ArUco marker id {marker_id} not found")
        raise ValueError(f"No marker with accepted IDs {effective_ids} found in image")

    # Scale corners back to original image resolution if we downscaled for detection
    if det_scale < 1.0:
        best_corners = best_corners / det_scale
        best_area = best_area / (det_scale * det_scale)

    # Geometric plausibility: corners must form a convex quad with area > 100 px2
    if best_area < 100.0:
        raise ValueError(
            f"Detected marker area ({best_area:.1f} px2) is too small; "
            "marker may be truncated or image resolution too low."
        )
    hull = cv2.convexHull(best_corners.astype(np.float32), returnPoints=True)
    if len(hull) != 4:
        raise ValueError(
            "Detected marker corners do not form a convex quadrilateral "
            "(marker may be partially occluded or severely distorted)."
        )

    return best_corners


def marker_side_px(corners: np.ndarray) -> float:
    """Return the mean side length of marker corners in pixels."""
    return float(np.mean([np.linalg.norm(corners[i] - corners[(i + 1) % 4]) for i in range(4)]))


def plane_homography(corners: np.ndarray, marker_mm: float) -> np.ndarray:
    """Return a homography that maps image pixels to marker-plane millimetres."""
    if marker_mm <= 0 or not math.isfinite(marker_mm):
        raise ValueError(f"marker_mm must be a positive finite float, got {marker_mm!r}")
    dst = np.array([[0, 0], [marker_mm, 0], [marker_mm, marker_mm], [0, marker_mm]], dtype=np.float32)
    return cv2.getPerspectiveTransform(corners.astype(np.float32), dst)


def to_mm(points_px: np.ndarray, H: np.ndarray) -> np.ndarray:
    """Transform pixel-space points_px to millimetres using homography H."""
    pts = np.asarray(points_px, dtype=np.float32).reshape(-1, 1, 2)
    return cv2.perspectiveTransform(pts, H).reshape(-1, 2)


def marker_tilt_deg(corners: np.ndarray, marker_mm: float, K: list) -> Optional[float]:
    """Estimate camera tilt angle (degrees) relative to the marker plane."""
    h = marker_mm / 2.0
    obj = np.array([[-h, h, 0], [h, h, 0], [h, -h, 0], [-h, -h, 0]], dtype=np.float32)
    ok, rvec, _ = cv2.solvePnP(
        obj, corners.astype(np.float32), np.array(K, dtype=np.float64),
        None, flags=cv2.SOLVEPNP_IPPE_SQUARE,
    )
    if not ok:
        return None
    normal = cv2.Rodrigues(rvec)[0][:, 2]
    cos_val = min(1.0, abs(float(normal[2])))
    return float(np.degrees(np.arccos(cos_val)))


# ── COLMAP binary reader helpers ─────────────────────────────────────────────
def _read_colmap_cameras_binary(path: Path) -> Dict[int, dict]:
    """Parse COLMAP cameras.bin -> dict[camera_id, camera_info]."""
    cameras: Dict[int, dict] = {}
    with open(path, "rb") as f:
        (num_cameras,) = struct.unpack("<Q", f.read(8))
        for _ in range(num_cameras):
            (cam_id,) = struct.unpack("<i", f.read(4))
            (model_id,) = struct.unpack("<i", f.read(4))
            width, height = struct.unpack("<QQ", f.read(16))
            PARAMS_COUNT = {0: 3, 1: 4, 2: 4, 3: 5, 4: 5, 5: 8, 6: 8, 7: 12}
            n_params = PARAMS_COUNT.get(model_id, 4)
            params = np.array(struct.unpack(f"<{n_params}d", f.read(8 * n_params)))
            cameras[cam_id] = {"model_id": model_id, "width": width, "height": height, "params": params}
    return cameras


def _read_colmap_images_binary(path: Path) -> Dict[int, dict]:
    """Parse COLMAP images.bin -> dict[image_id, image_info]."""
    images: Dict[int, dict] = {}
    with open(path, "rb") as f:
        (num_images,) = struct.unpack("<Q", f.read(8))
        for _ in range(num_images):
            (image_id,) = struct.unpack("<i", f.read(4))
            qvec = np.array(struct.unpack("<4d", f.read(32)))
            tvec = np.array(struct.unpack("<3d", f.read(24)))
            (camera_id,) = struct.unpack("<i", f.read(4))
            name_bytes = b""
            while True:
                ch = f.read(1)
                if ch == b"\x00" or ch == b"":
                    break
                name_bytes += ch
            name = name_bytes.decode("utf-8", errors="replace")
            (num_points2d,) = struct.unpack("<Q", f.read(8))
            xys_flat = struct.unpack(f"<{num_points2d * 2}d", f.read(num_points2d * 16))
            p3d_ids = struct.unpack(f"<{num_points2d}q", f.read(num_points2d * 8))
            xys = np.array(xys_flat, dtype=np.float64).reshape(-1, 2)
            point3D_ids = np.array(p3d_ids, dtype=np.int64)
            images[image_id] = {
                "qvec": qvec, "tvec": tvec, "camera_id": camera_id,
                "name": name, "xys": xys, "point3D_ids": point3D_ids,
            }
    return images


def _qvec_to_rotmat(qvec: np.ndarray) -> np.ndarray:
    """Convert a COLMAP quaternion (qw, qx, qy, qz) to a 3x3 rotation matrix."""
    qw, qx, qy, qz = qvec / np.linalg.norm(qvec)
    return np.array([
        [1 - 2*qy*qy - 2*qz*qz, 2*qx*qy - 2*qz*qw,   2*qx*qz + 2*qy*qw],
        [2*qx*qy + 2*qz*qw,   1 - 2*qx*qx - 2*qz*qz, 2*qy*qz - 2*qx*qw],
        [2*qx*qz - 2*qy*qw,   2*qy*qz + 2*qx*qw,   1 - 2*qx*qx - 2*qy*qy],
    ])


def _camera_params_to_K(cam: dict) -> np.ndarray:
    """Build a 3x3 intrinsics matrix from COLMAP camera params."""
    p = cam["params"]
    model_id = cam["model_id"]
    if model_id == 0:  # SIMPLE_PINHOLE: f, cx, cy
        f, cx, cy = p[0], p[1], p[2]
        return np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], dtype=np.float64)
    elif model_id in (1, 2, 3):  # PINHOLE/SIMPLE_RADIAL/RADIAL: fx, fy, cx, cy
        fx, fy, cx, cy = p[0], p[1], p[2], p[3]
        return np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], dtype=np.float64)
    else:
        f = p[0]
        cx, cy = cam["width"] / 2.0, cam["height"] / 2.0
        logger.warning("Unknown COLMAP camera model %d; using approximate K", model_id)
        return np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], dtype=np.float64)


# ── 3-D scale calibration from COLMAP reconstruction ─────────────────────────
class ArucoScaleCalibrationError(Exception):
    """Raised when reliable metric scale cannot be established from the marker."""


def _detect_marker_in_image(
    img_path: Path,
    dict_id: int,
    accepted_ids: Optional[Set[int]],
) -> Optional[np.ndarray]:
    """Detect an ArUco marker in the image at img_path. Returns 4x2 or None."""
    if not img_path.exists():
        logger.debug("Image not found: %s", img_path)
        return None
    img = cv2.imread(str(img_path))
    if img is None:
        logger.debug("Cannot decode image: %s", img_path)
        return None
    try:
        return find_marker(img, accepted_ids=accepted_ids, dict_id=dict_id)
    except (ValueError, RuntimeError) as exc:
        logger.debug("Marker not found in %s: %s", img_path.name, exc)
        return None


def _triangulate_marker_corner(
    observations: List[Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]],
    corner_idx: int,
) -> Optional[np.ndarray]:
    """Triangulate one marker corner from multiple image observations using DLT.

    observations: list of (R, t, K, corners_4x2).
    Returns a (3,) world-space point or None if triangulation fails.
    """
    if len(observations) < 2:
        return None
    rows = []
    for R, t, K, corners in observations:
        P = K @ np.hstack([R, t.reshape(3, 1)])
        x, y = float(corners[corner_idx][0]), float(corners[corner_idx][1])
        rows.append(x * P[2] - P[0])
        rows.append(y * P[2] - P[1])
    A = np.array(rows, dtype=np.float64)
    _, _, Vt = np.linalg.svd(A)
    X = Vt[-1]
    if abs(X[3]) < 1e-12:
        return None
    return (X[:3] / X[3]).astype(np.float64)


def colmap_aruco_scale_factor(
    colmap_sparse_dir: Path,
    image_dir: Path,
    marker_mm: float,
    dict_id: Optional[int] = None,
    accepted_ids: Optional[Set[int]] = None,
    min_observations: int = 2,
    max_side_error_fraction: float = 0.15,
) -> Tuple[float, dict]:
    """Estimate the COLMAP to metric scale factor using ArUco 3-D reconstruction.

    Strategy:
    1. Parse COLMAP sparse model (cameras.bin, images.bin).
    2. For each registered image, attempt ArUco marker detection.
    3. Triangulate each of the four marker corners using DLT.
    4. Compute mean 3-D side length, compare with known marker_mm.
    5. Validate consistency and compute scale_factor = marker_mm / mean_side_3d.

    Returns (scale_factor, info_dict).
    Raises ArucoScaleCalibrationError on any failure.
    """
    if dict_id is None:
        dict_id = get_aruco_dict_id()
    if accepted_ids is None:
        accepted_ids = get_accepted_marker_ids()

    cameras_bin = colmap_sparse_dir / "cameras.bin"
    images_bin = colmap_sparse_dir / "images.bin"

    missing = [p for p in (cameras_bin, images_bin) if not p.exists()]
    if missing:
        raise ArucoScaleCalibrationError(
            f"COLMAP sparse model files not found: {[str(p) for p in missing]}. "
            "Cannot perform 3-D ArUco scale calibration."
        )

    try:
        colmap_cameras = _read_colmap_cameras_binary(cameras_bin)
        colmap_images = _read_colmap_images_binary(images_bin)
    except Exception as exc:
        raise ArucoScaleCalibrationError(f"Failed to parse COLMAP binary model: {exc}") from exc

    if not colmap_cameras or not colmap_images:
        raise ArucoScaleCalibrationError(
            "COLMAP sparse model is empty (no cameras or images registered)."
        )

    logger.info("COLMAP model: %d cameras, %d images", len(colmap_cameras), len(colmap_images))

    observations: List[Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]] = []
    for img_id, img_data in colmap_images.items():
        cam_id = img_data["camera_id"]
        cam = colmap_cameras.get(cam_id)
        if cam is None:
            logger.warning("Image %d references unknown camera %d", img_id, cam_id)
            continue
        img_name = img_data["name"]
        img_path = image_dir / img_name
        corners = _detect_marker_in_image(img_path, dict_id, accepted_ids)
        if corners is None:
            continue
        R = _qvec_to_rotmat(img_data["qvec"])
        t = img_data["tvec"]
        K = _camera_params_to_K(cam)
        observations.append((R, t, K, corners))
        logger.debug("Marker found in image %r (id=%d)", img_name, img_id)

    n_obs = len(observations)
    logger.info("Marker detected in %d / %d registered images", n_obs, len(colmap_images))

    if n_obs < min_observations:
        raise ArucoScaleCalibrationError(
            f"Marker observed in only {n_obs} registered image(s); "
            f"need at least {min_observations} for reliable 3-D triangulation. "
            "Ensure the printed ArUco marker is visible in multiple overlapping walk-around images."
        )

    world_corners: List[Optional[np.ndarray]] = []
    for corner_idx in range(4):
        pt = _triangulate_marker_corner(observations, corner_idx)
        world_corners.append(pt)

    failed = [i for i, pt in enumerate(world_corners) if pt is None]
    if failed:
        raise ArucoScaleCalibrationError(
            f"Triangulation failed for marker corners {failed}. "
            "Check image overlap and marker visibility."
        )

    pts = np.array(world_corners, dtype=np.float64)  # (4, 3)
    sides_3d = np.array([
        np.linalg.norm(pts[0] - pts[1]),
        np.linalg.norm(pts[1] - pts[2]),
        np.linalg.norm(pts[2] - pts[3]),
        np.linalg.norm(pts[3] - pts[0]),
    ])

    for i, s in enumerate(sides_3d):
        if not math.isfinite(s) or s <= 0:
            raise ArucoScaleCalibrationError(
                f"Reconstructed marker side {i} has invalid length {s!r}."
            )

    mean_side_3d = float(np.mean(sides_3d))
    max_frac_err = float(np.max(np.abs(sides_3d - mean_side_3d)) / mean_side_3d)

    logger.info(
        "Reconstructed 3-D marker sides: %s (mean=%.4f, max_frac_err=%.3f)",
        sides_3d.tolist(), mean_side_3d, max_frac_err
    )

    if max_frac_err > max_side_error_fraction:
        raise ArucoScaleCalibrationError(
            f"Reconstructed marker sides are inconsistent "
            f"(max fractional deviation {max_frac_err:.1%}, threshold {max_side_error_fraction:.1%}). "
            f"Sides: {sides_3d.tolist()}. "
            "This may indicate poor image overlap, a badly printed marker, or outlier triangulations. "
            "Retake the walk-around images."
        )

    scale_factor = marker_mm / mean_side_3d

    if not math.isfinite(scale_factor) or scale_factor <= 0:
        raise ArucoScaleCalibrationError(
            f"Computed scale factor {scale_factor!r} is not a positive finite float."
        )

    if scale_factor < 1e-3 or scale_factor > 1e6:
        raise ArucoScaleCalibrationError(
            f"Scale factor {scale_factor:.6g} is outside the plausible range [1e-3, 1e6]. "
            f"marker_mm={marker_mm}, mean_3d_side={mean_side_3d:.6g}. "
            "Verify that the marker size configuration matches the printed marker."
        )

    info = {
        "method": "aruco_3d_triangulation",
        "marker_mm": marker_mm,
        "n_observations": n_obs,
        "reconstructed_sides_colmap_units": sides_3d.tolist(),
        "mean_side_colmap_units": mean_side_3d,
        "max_side_inconsistency_fraction": max_frac_err,
        "scale_factor": scale_factor,
        "message": (
            f"Scale estimated from {n_obs} marker observations via DLT triangulation; "
            f"max side inconsistency {max_frac_err:.1%}."
        ),
    }

    logger.info(
        "ArUco 3-D scale factor: %.6g (from %d observations, marker %.1f mm -> %.4f COLMAP units)",
        scale_factor, n_obs, marker_mm, mean_side_3d,
    )

    return scale_factor, info


# ── Legacy diagnostic: RED COLOUR DETECTOR ───────────────────────────────────
# NOT called by production pipeline. Preserved for development/debugging only.
def diagnostic_red_scale_bar_distance(pcd) -> Tuple[Optional[float], str]:
    """Return the detected red-bar extent in COLMAP units (DIAGNOSTIC ONLY).

    This function is NOT called by the production pipeline. It is preserved
    purely as a development/debugging aid and is explicitly labelled so.
    Its result MUST NOT be used for official measurements.
    """
    try:
        import open3d as o3d  # noqa: F401
    except ImportError:
        return None, "Open3D not available - diagnostic skipped"

    colors = np.asarray(pcd.colors)
    points = np.asarray(pcd.points)
    red_mask = (colors[:, 0] > 0.5) & (colors[:, 1] < 0.3) & (colors[:, 2] < 0.3)
    red_pts = points[red_mask]

    if len(red_pts) < 10:
        return None, "[DIAGNOSTIC ONLY] Fewer than 10 red points found"

    import open3d as o3d
    rpcd = o3d.geometry.PointCloud()
    rpcd.points = o3d.utility.Vector3dVector(red_pts)
    labels = np.array(rpcd.cluster_dbscan(eps=15.0, min_points=10, print_progress=False))
    if len(labels) == 0 or labels.max() < 0:
        return None, "[DIAGNOSTIC ONLY] Red points too scattered to cluster"

    main_label = np.bincount(labels[labels >= 0]).argmax()
    bar_pts = red_pts[labels == main_label]
    bar_pcd = o3d.geometry.PointCloud()
    bar_pcd.points = o3d.utility.Vector3dVector(bar_pts)
    obb = bar_pcd.get_oriented_bounding_box()
    bps = np.asarray(obb.get_box_points())

    max_d = 0.0
    for ii in range(len(bps)):
        for jj in range(ii + 1, len(bps)):
            d = float(np.linalg.norm(bps[ii] - bps[jj]))
            if d > max_d:
                max_d = d

    return max_d, (
        f"[DIAGNOSTIC ONLY - NOT authoritative] Red colour bar extent: {max_d:.4f} COLMAP units. "
        "This value MUST NOT be used for official measurements."
    )


# ── Marker image generation helper ───────────────────────────────────────────
def generate_aruco_marker_image(
    marker_id: int,
    output_path: str,
    size_px: int = 400,
    dict_id: Optional[int] = None,
) -> None:
    """Generate a single ArUco marker PNG at output_path."""
    if dict_id is None:
        dict_id = get_aruco_dict_id()
    aruco_dict = cv2.aruco.getPredefinedDictionary(dict_id)
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size_px)
    cv2.imwrite(output_path, marker_img)
    logger.info("Generated ArUco marker %d -> %s", marker_id, output_path)
