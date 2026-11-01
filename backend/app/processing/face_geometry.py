"""
face_geometry.py  –  PROTOTYPE candidate edge measurement from 3-D point clouds.

STATUS: NON-STATUTORY PROTOTYPE
- Edge-to-axis mapping is provisional.  AP DMG Rule 12 definitions are NOT yet confirmed.
- min(Li) - 2*allowance dressed formula is provisional.
- Convex-hull volume is NOT labelled statutory undressed volume.
- No output of this module should drive seigniorage decisions.

Algorithm
---------
For each block face (top, bottom, front, rear, left, right):
  1. Project block points onto the OBB face sub-region.
  2. Fit a plane with RANSAC.
  3. Grade quality: GOOD / POOR / SPARSE / MISSING.

Edge lengths are then computed from pairwise plane-plane intersections, clipped
to the point-cloud bounding envelope along each line direction.

Provisonal L/B/H mapping
  L-axis: longest OBB extent  → top/bottom long edges  (L1, L2, L3, L4)
  B-axis: middle OBB extent   → top/bottom short edges (B1, B2, B3, B4)
  H-axis: shortest OBB extent → four vertical edges    (H1, H2, H3, H4)
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ── Quality grades ────────────────────────────────────────────────────────────
QUALITY_GOOD = "GOOD"
QUALITY_POOR = "POOR"
QUALITY_SPARSE = "SPARSE"
QUALITY_MISSING = "MISSING"

# ── Thresholds (all in mm after metric scaling) ───────────────────────────────
MIN_FACE_POINTS = 200           # fewer points → SPARSE
RANSAC_RESIDUAL_MM = 15.0       # mean inlier residual above this → POOR
MIN_INLIER_FRACTION = 0.45      # inlier ratio below this → POOR
EDGE_OUTLIER_FRACTION = 0.20    # individual edge deviates >20% from axis mean → flag
MIN_GOOD_FACES = 3              # need at least 3 GOOD faces to return any readings


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ransac_plane(pts: np.ndarray,
                  distance_threshold: float = 10.0,
                  num_iterations: int = 1000,
                  ransac_n: int = 3,
                  ) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], float, float]:
    """Fit a plane to pts using a lightweight pure-numpy RANSAC.

    Returns (normal, centroid, mean_residual, inlier_fraction).
    normal is unit-length.  Returns (None, None, inf, 0) on failure.
    """
    if len(pts) < ransac_n:
        return None, None, math.inf, 0.0

    best_normal: Optional[np.ndarray] = None
    best_d: float = 0.0
    best_n_inliers: int = 0

    rng = np.random.default_rng(seed=42)
    for _ in range(num_iterations):
        idx = rng.choice(len(pts), ransac_n, replace=False)
        sample = pts[idx]
        v1 = sample[1] - sample[0]
        v2 = sample[2] - sample[0]
        normal = np.cross(v1, v2)
        norm = np.linalg.norm(normal)
        if norm < 1e-10:
            continue
        normal = normal / norm
        d = float(normal @ sample[0])
        dists = np.abs(pts @ normal - d)
        inliers = np.sum(dists < distance_threshold)
        if inliers > best_n_inliers:
            best_n_inliers = inliers
            best_normal = normal
            best_d = d

    if best_normal is None or best_n_inliers < ransac_n:
        return None, None, math.inf, 0.0

    dists = np.abs(pts @ best_normal - best_d)
    inlier_mask = dists < distance_threshold
    inlier_pts = pts[inlier_mask]
    mean_residual = float(np.mean(dists[inlier_mask]))
    inlier_frac = float(np.sum(inlier_mask) / len(pts))

    # Refit on inliers for better accuracy
    centroid = inlier_pts.mean(axis=0)
    _, _, Vt = np.linalg.svd(inlier_pts - centroid)
    refined_normal = Vt[-1]
    # Ensure normal direction consistency
    if float(refined_normal @ best_normal) < 0:
        refined_normal = -refined_normal

    return refined_normal, centroid, mean_residual, inlier_frac


def _grade_fit(n_pts: int, residual: float, inlier_frac: float,
               normal: Optional[np.ndarray]) -> str:
    """Return quality grade for a single plane fit."""
    if normal is None:
        return QUALITY_MISSING
    if n_pts < MIN_FACE_POINTS:
        return QUALITY_SPARSE
    if residual > RANSAC_RESIDUAL_MM or inlier_frac < MIN_INLIER_FRACTION:
        return QUALITY_POOR
    return QUALITY_GOOD


def _plane_plane_intersection(n1: np.ndarray, d1: float,
                              n2: np.ndarray, d2: float,
                              ) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """Compute line of intersection of two planes.

    Returns (direction, point_on_line) or (None, None) if planes are parallel.
    """
    direction = np.cross(n1, n2)
    mag = np.linalg.norm(direction)
    if mag < 1e-8:
        return None, None
    direction = direction / mag

    # Solve 2x2 system to find a point on the intersection line
    # using the two planes and setting the free coord to 0
    abs_dir = np.abs(direction)
    free_axis = int(np.argmax(abs_dir))  # axis along which direction is largest
    axes = [i for i in range(3) if i != free_axis]
    A = np.array([[n1[axes[0]], n1[axes[1]]],
                  [n2[axes[0]], n2[axes[1]]]])
    b = np.array([d1, d2])
    try:
        xy = np.linalg.solve(A, b)
    except np.linalg.LinAlgError:
        return None, None
    point = np.zeros(3)
    point[axes[0]] = xy[0]
    point[axes[1]] = xy[1]
    point[free_axis] = 0.0
    return direction, point


def _clip_line_to_cloud(direction: np.ndarray, point: np.ndarray,
                        pts: np.ndarray,
                        ) -> Optional[float]:
    """Return the length of the intersection line clipped to the point cloud extent.

    Projects all cloud points onto 'direction', takes the range [min_t, max_t].
    Returns None if the range is effectively zero.
    """
    t = pts @ direction - float(direction @ point)
    t_min, t_max = float(t.min()), float(t.max())
    length = t_max - t_min
    if length < 1.0:  # less than 1 mm
        return None
    return length


def _plane_d(normal: np.ndarray, centroid: np.ndarray) -> float:
    return float(normal @ centroid)


# ── Main public function ──────────────────────────────────────────────────────

def extract_candidate_readings(
    block_pts: np.ndarray,
    obb_R: np.ndarray,
    obb_extent: np.ndarray,
    obb_center: np.ndarray,
    allowance_mm: float = 25.0,
) -> dict:
    """Fit face planes and extract candidate L/B/H edge measurements.

    Parameters
    ----------
    block_pts   : (N, 3) float array of block point cloud in world mm coords.
    obb_R       : (3, 3) OBB rotation matrix (columns = OBB axis directions).
    obb_extent  : (3,) OBB extents [e0, e1, e2] in world mm.
    obb_center  : (3,) OBB center in world mm.
    allowance_mm: Provisional dressed-allowance per face (UNCONFIRMED formula).

    Returns
    -------
    dict with keys:
      L_mm, B_mm, H_mm    – lists of candidate edge lengths (may contain None)
      obb_mm              – {"L": …, "B": …, "H": …}
      face_quality        – dict per face name
      axis_quality        – {"L": …, "B": …, "H": …}
      n_good_faces        – int
      assumed_dressed_provisional – dict (clearly labelled provisional)
      warnings            – list[str]
      method              – str
    """
    warnings: List[str] = []
    method = "walkaround_face_plane_ransac_v1_prototype"

    # ── Map OBB axes to L / B / H by descending extent ──────────────────────
    sort_idx = np.argsort(obb_extent)[::-1]        # [longest, middle, shortest]
    L_axis = obb_R[:, sort_idx[0]]                  # world direction of L-axis
    B_axis = obb_R[:, sort_idx[1]]                  # world direction of B-axis
    H_axis = obb_R[:, sort_idx[2]]                  # world direction of H-axis

    L_obb = float(obb_extent[sort_idx[0]])
    B_obb = float(obb_extent[sort_idx[1]])
    H_obb = float(obb_extent[sort_idx[2]])

    # ── Transform points into OBB local frame (L, B, H) ──────────────────────
    pts_local = (block_pts - obb_center) @ np.column_stack([L_axis, B_axis, H_axis])
    # pts_local[:, 0] = L-component, [:, 1] = B-component, [:, 2] = H-component

    half = np.array([L_obb, B_obb, H_obb]) / 2.0

    # ── Define 6 face regions by their outward normal in local frame ──────────
    # Face label → (local normal direction, face-region selector)
    FACES = {
        "top":    ( np.array([0, 0,  1]),  2, +1),  # +H face
        "bottom": ( np.array([0, 0, -1]),  2, -1),  # -H face
        "front":  ( np.array([0,  1, 0]),  1, +1),  # +B face
        "rear":   ( np.array([0, -1, 0]),  1, -1),  # -B face
        "right":  ( np.array([ 1, 0, 0]),  0, +1),  # +L face
        "left":   ( np.array([-1, 0, 0]),  0, -1),  # -L face
    }

    SELECTION_DEPTH_FRACTION = 0.40  # use outer 40% of extent per face
    plane_fits: Dict[str, dict] = {}

    for face_name, (local_normal_dir, axis_idx, sign) in FACES.items():
        # Select points in the outer zone of this face
        coord = pts_local[:, axis_idx]
        half_e = half[axis_idx]
        if sign > 0:
            mask = coord > half_e * (1.0 - SELECTION_DEPTH_FRACTION)
        else:
            mask = coord < -half_e * (1.0 - SELECTION_DEPTH_FRACTION)

        face_pts_local = pts_local[mask]
        face_pts_world = block_pts[mask]
        n_pts = len(face_pts_local)

        if n_pts < 3:
            plane_fits[face_name] = {
                "quality": QUALITY_MISSING, "n_pts": n_pts,
                "normal": None, "centroid": None,
                "residual": math.inf, "inlier_frac": 0.0,
            }
            continue

        normal, centroid, residual, inlier_frac = _ransac_plane(
            face_pts_world, distance_threshold=12.0, num_iterations=500
        )

        # Ensure normal points outward (in the direction of face's local outward normal)
        if normal is not None:
            # expected outward direction in world frame
            outward_world = L_axis * local_normal_dir[0] + B_axis * local_normal_dir[1] + H_axis * local_normal_dir[2]
            if float(normal @ outward_world) < 0:
                normal = -normal

        quality = _grade_fit(n_pts, residual, inlier_frac, normal)
        plane_fits[face_name] = {
            "quality": quality, "n_pts": n_pts,
            "normal": normal, "centroid": centroid,
            "residual": residual, "inlier_frac": inlier_frac,
        }
        logger.debug("Face %s: quality=%s n_pts=%d residual=%.1f inlier_frac=%.2f",
                     face_name, quality, n_pts, residual, inlier_frac)

    # ── Count good faces ──────────────────────────────────────────────────────
    face_quality = {name: plane_fits[name]["quality"] for name in plane_fits}
    n_good = sum(1 for q in face_quality.values() if q == QUALITY_GOOD)

    if n_good < MIN_GOOD_FACES:
        warnings.append(
            f"Only {n_good} face(s) have GOOD plane fits (minimum {MIN_GOOD_FACES} required). "
            "Edge measurements will be incomplete. Improve walk-around coverage."
        )

    # ── Helper: attempt one plane-pair edge length ────────────────────────────
    def _edge(face_a: str, face_b: str) -> Optional[float]:
        fa = plane_fits[face_a]
        fb = plane_fits[face_b]
        if fa["quality"] != QUALITY_GOOD or fb["quality"] != QUALITY_GOOD:
            return None
        if fa["normal"] is None or fb["normal"] is None:
            return None
        da = _plane_d(fa["normal"], fa["centroid"])
        db = _plane_d(fb["normal"], fb["centroid"])
        direction, point = _plane_plane_intersection(fa["normal"], da, fb["normal"], db)
        if direction is None:
            return None
        return _clip_line_to_cloud(direction, point, block_pts)

    # ── Provisional edge-to-axis mapping (UNCONFIRMED vs AP DMG Rule 12) ─────
    # L1: top face ∩ front face (long edge on top, along L-axis)
    # L2: top face ∩ rear face
    # L3: bottom face ∩ front face
    # L4: bottom face ∩ rear face
    # B1: top face ∩ right face
    # B2: top face ∩ left face
    # B3: bottom face ∩ right face
    # B4: bottom face ∩ left face
    # H1: front face ∩ right face  (vertical edge)
    # H2: front face ∩ left face
    # H3: rear face ∩ right face
    # H4: rear face ∩ left face
    L_mm = [
        _edge("top",    "front"),
        _edge("top",    "rear"),
        _edge("bottom", "front"),
        _edge("bottom", "rear"),
    ]
    B_mm = [
        _edge("top",    "right"),
        _edge("top",    "left"),
        _edge("bottom", "right"),
        _edge("bottom", "left"),
    ]
    H_mm = [
        _edge("front", "right"),
        _edge("front", "left"),
        _edge("rear",  "right"),
        _edge("rear",  "left"),
    ]

    # ── Axis-level quality ────────────────────────────────────────────────────
    def _axis_quality(values: List[Optional[float]], axis_name: str) -> str:
        valid = [v for v in values if v is not None]
        if not valid:
            return QUALITY_MISSING
        if len(valid) < 2:
            return QUALITY_POOR
        mean_v = float(np.mean(valid))
        if mean_v < 1.0:
            return QUALITY_MISSING
        deviations = [abs(v - mean_v) / mean_v for v in valid]
        if any(d > EDGE_OUTLIER_FRACTION for d in deviations):
            warnings.append(
                f"{axis_name}: one or more candidate edge readings deviate >"
                f"{int(EDGE_OUTLIER_FRACTION*100)}% from axis mean ({mean_v:.1f} mm). "
                "Possible irregular geometry or partial occlusion."
            )
            return QUALITY_POOR
        return QUALITY_GOOD

    axis_quality = {
        "L": _axis_quality(L_mm, "L"),
        "B": _axis_quality(B_mm, "B"),
        "H": _axis_quality(H_mm, "H"),
    }

    # ── Provisional assumed dressed dimensions (UNCONFIRMED formula) ──────────
    # Uses min of valid readings minus 2*allowance per axis.
    # Labelled clearly as provisional — do not use for official measurements.
    def _provisional_dressed_dim(values: List[Optional[float]]) -> Optional[float]:
        valid = [v for v in values if v is not None and v > 0]
        if not valid:
            return None
        return max(min(valid) - 2.0 * allowance_mm, 0.0)

    dl = _provisional_dressed_dim(L_mm)
    db_dim = _provisional_dressed_dim(B_mm)
    dh = _provisional_dressed_dim(H_mm)
    dv: Optional[float] = None
    if dl is not None and db_dim is not None and dh is not None:
        dv = dl * db_dim * dh / 1e9

    warnings.append(
        "PROTOTYPE: L/B/H edge mapping is provisional (AP DMG Rule 12 not confirmed). "
        "Candidate readings must not be used for seigniorage or statutory decisions."
    )

    return {
        "L_mm": L_mm,
        "B_mm": B_mm,
        "H_mm": H_mm,
        "obb_mm": {"L": L_obb, "B": B_obb, "H": H_obb},
        "face_quality": face_quality,
        "axis_quality": axis_quality,
        "n_good_faces": n_good,
        "assumed_dressed_provisional": {
            "length_mm": dl,
            "breadth_mm": db_dim,
            "height_mm": dh,
            "volume_m3": dv,
            "formula": "min(valid_edges) - 2 * allowance_mm  [PROVISIONAL - NOT CONFIRMED]",
        },
        "warnings": warnings,
        "method": method,
    }
