"""
image_validator.py
------------------
Validates individual photos before they enter the photogrammetry pipeline.
Checks: blur, exposure, and ArUco marker presence.
Returns a structured report per image so bad photos are rejected early.
"""
import cv2
import numpy as np
import os
from typing import List, Dict, Any


# ── Constants ──────────────────────────────────────────────────────────────────
BLUR_THRESHOLD       = 80.0   # Laplacian variance; below this → too blurry
DARK_THRESHOLD       = 30.0   # Mean brightness 0-255; below this → too dark
BRIGHT_THRESHOLD     = 240.0  # Mean brightness; above this → overexposed
MIN_RESOLUTION_PX    = 480    # Shortest side must be at least this many pixels
ARUCO_DICT           = cv2.aruco.DICT_4X4_50   # Must match the printed markers


def _laplacian_blur_score(gray: np.ndarray) -> float:
    """Higher value = sharper image. Below BLUR_THRESHOLD → reject."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _mean_brightness(gray: np.ndarray) -> float:
    """Returns mean pixel intensity 0–255."""
    return float(np.mean(gray))


def _detect_aruco(img_bgr: np.ndarray) -> int:
    """Returns number of ArUco markers detected in the image."""
    try:
        aruco_dict   = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)
        aruco_params = cv2.aruco.DetectorParameters()
        detector     = cv2.aruco.ArucoDetector(aruco_dict, aruco_params)
        corners, ids, _ = detector.detectMarkers(img_bgr)
        return len(ids) if ids is not None else 0
    except Exception:
        return 0


def validate_image(image_path: str) -> Dict[str, Any]:
    """
    Validate a single image file.

    Returns:
        {
            "path":         str,
            "valid":        bool,
            "blur_score":   float,
            "brightness":   float,
            "aruco_count":  int,
            "width":        int,
            "height":       int,
            "issues":       List[str]   # human-readable rejection reasons
        }
    """
    result: Dict[str, Any] = {
        "path":        image_path,
        "valid":       False,
        "blur_score":  0.0,
        "brightness":  0.0,
        "aruco_count": 0,
        "width":       0,
        "height":      0,
        "issues":      [],
    }

    if not os.path.exists(image_path):
        result["issues"].append("File not found")
        return result

    img = cv2.imread(image_path)
    if img is None:
        result["issues"].append("Cannot read image file")
        return result

    h, w = img.shape[:2]
    result["width"]  = w
    result["height"] = h

    # ── Resolution check ───────────────────────────────────────────────────────
    if min(h, w) < MIN_RESOLUTION_PX:
        result["issues"].append(
            f"Resolution too low ({w}×{h} px). Minimum short-side: {MIN_RESOLUTION_PX} px."
        )

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── Blur check ─────────────────────────────────────────────────────────────
    blur = _laplacian_blur_score(gray)
    result["blur_score"] = round(blur, 2)
    if blur < BLUR_THRESHOLD:
        result["issues"].append(
            f"Image too blurry (score {blur:.1f}, minimum {BLUR_THRESHOLD}). "
            "Hold the phone steady and ensure auto-focus has locked."
        )

    # ── Exposure check ─────────────────────────────────────────────────────────
    brightness = _mean_brightness(gray)
    result["brightness"] = round(brightness, 2)
    if brightness < DARK_THRESHOLD:
        result["issues"].append(
            f"Image too dark (brightness {brightness:.1f}/255). "
            "Move to a brighter area or use a torch."
        )
    elif brightness > BRIGHT_THRESHOLD:
        result["issues"].append(
            f"Image overexposed (brightness {brightness:.1f}/255). "
            "Avoid direct sunlight on the lens."
        )

    # ── ArUco detection ────────────────────────────────────────────────────────
    aruco_count = _detect_aruco(img)
    result["aruco_count"] = aruco_count
    # Note: not all images need markers — we just record how many are found.
    # The scale engine will check overall marker coverage.

    result["valid"] = len(result["issues"]) == 0
    return result


def validate_image_set(
    image_paths: List[str],
    require_aruco_in_at_least: int = 2,
) -> Dict[str, Any]:
    """
    Validate a full set of images for a block scan.

    Args:
        image_paths: list of absolute file paths
        require_aruco_in_at_least: how many images must contain ArUco markers

    Returns:
        {
            "total":            int,
            "valid_count":      int,
            "invalid_count":    int,
            "aruco_coverage":   int,   # images with ≥1 marker
            "passed":           bool,  # True if set is usable
            "images":           List[dict]  # per-image results
            "summary_issues":   List[str]
        }
    """
    per_image = [validate_image(p) for p in image_paths]

    valid_count  = sum(1 for r in per_image if r["valid"])
    aruco_images = sum(1 for r in per_image if r["aruco_count"] > 0)

    summary_issues: List[str] = []

    if valid_count < 4:
        summary_issues.append(
            f"Only {valid_count} usable image(s). Minimum 4 required "
            "(left, right, front, rear views)."
        )

    if aruco_images < require_aruco_in_at_least:
        summary_issues.append(
            f"ArUco scale markers detected in only {aruco_images} image(s). "
            f"At least {require_aruco_in_at_least} required for accurate real-world scaling. "
            "Place the printed markers around the block and retake photos."
        )

    passed = len(summary_issues) == 0

    return {
        "total":          len(image_paths),
        "valid_count":    valid_count,
        "invalid_count":  len(image_paths) - valid_count,
        "aruco_coverage": aruco_images,
        "passed":         passed,
        "images":         per_image,
        "summary_issues": summary_issues,
    }
