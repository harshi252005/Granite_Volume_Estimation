"""
aruco_scale.py
--------------
Detects ArUco markers across the image set and computes the real-world
scale factor (mm per pixel or mm per reconstruction unit).

How it works:
  1. Detect ArUco markers in every image.
  2. Use the known physical size of the printed marker (e.g. 100 mm).
  3. Compute the pixel-to-mm ratio for each detection.
  4. Average across all detections → robust scale factor.

The scale factor is later applied to Open3D geometry so that the
reconstructed 3D model reports dimensions in real-world millimetres.
"""
import cv2
import numpy as np
import os
from typing import List, Optional, Dict, Any


# ── Configuration ──────────────────────────────────────────────────────────────
# Physical side-length of the printed ArUco marker in millimetres.
# IMPORTANT: this MUST match the actual printed size.
DEFAULT_MARKER_SIZE_MM = 100.0   # adjust if you print at a different size

ARUCO_DICT = cv2.aruco.DICT_4X4_50


def _get_detector():
    aruco_dict   = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)
    aruco_params = cv2.aruco.DetectorParameters()
    return cv2.aruco.ArucoDetector(aruco_dict, aruco_params)


def _marker_side_length_px(corners_single: np.ndarray) -> float:
    """
    Given the 4 corner points of one marker (shape 4×2),
    return the average side length in pixels.
    """
    pts = corners_single.reshape(4, 2)
    sides = [
        np.linalg.norm(pts[1] - pts[0]),
        np.linalg.norm(pts[2] - pts[1]),
        np.linalg.norm(pts[3] - pts[2]),
        np.linalg.norm(pts[0] - pts[3]),
    ]
    return float(np.mean(sides))


def compute_scale_factor(
    image_paths: List[str],
    marker_size_mm: float = DEFAULT_MARKER_SIZE_MM,
) -> Dict[str, Any]:
    """
    Scan all images for ArUco markers and compute mm_per_px.

    Returns:
        {
            "scale_found":     bool,
            "mm_per_px":       float | None,   # average across all detections
            "detections":      int,             # total marker detections used
            "images_with_markers": int,
            "marker_size_mm":  float,
            "individual_ratios": List[float],   # one per marker detection
            "message":         str
        }
    """
    detector = _get_detector()
    ratios: List[float] = []
    images_with_markers = 0

    for path in image_paths:
        if not os.path.exists(path):
            continue
        img = cv2.imread(path)
        if img is None:
            continue

        corners, ids, _ = detector.detectMarkers(img)
        if ids is None or len(ids) == 0:
            continue

        images_with_markers += 1
        for corner in corners:
            side_px = _marker_side_length_px(corner)
            if side_px > 5:   # ignore tiny / degenerate detections
                ratio = marker_size_mm / side_px
                ratios.append(ratio)

    if not ratios:
        return {
            "scale_found":          False,
            "mm_per_px":            None,
            "detections":           0,
            "images_with_markers":  images_with_markers,
            "marker_size_mm":       marker_size_mm,
            "individual_ratios":    [],
            "message": (
                "No ArUco markers detected in any image. "
                "Place printed ArUco markers (DICT_4X4_50, "
                f"{marker_size_mm:.0f} mm side) around the block and retake photos."
            ),
        }

    mm_per_px = float(np.median(ratios))   # median is robust to outliers

    return {
        "scale_found":          True,
        "mm_per_px":            round(mm_per_px, 6),
        "detections":           len(ratios),
        "images_with_markers":  images_with_markers,
        "marker_size_mm":       marker_size_mm,
        "individual_ratios":    [round(r, 6) for r in ratios],
        "message": (
            f"Scale computed from {len(ratios)} marker detection(s) "
            f"across {images_with_markers} image(s). "
            f"1 px ≈ {mm_per_px:.4f} mm."
        ),
    }


def generate_aruco_marker_image(
    marker_id: int,
    output_path: str,
    size_px: int = 400,
) -> str:
    """
    Generate a printable ArUco marker PNG.
    Print at exactly DEFAULT_MARKER_SIZE_MM × DEFAULT_MARKER_SIZE_MM mm.

    Args:
        marker_id:   0–49 (DICT_4X4_50 range)
        output_path: where to save the PNG
        size_px:     image canvas size in pixels

    Returns: output_path
    """
    aruco_dict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size_px)
    cv2.imwrite(output_path, marker_img)
    return output_path
