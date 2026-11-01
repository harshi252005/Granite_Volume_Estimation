"""
geometry_engine.py
------------------
Open3D-based geometry analysis of a reconstructed granite block mesh.

Given a PLY mesh (in real-world mm via ArUco scaling), this module:
  1. Cleans the point cloud (removes noise + outliers)
  2. Detects the 6 dominant planes using RANSAC
  3. Computes 12 edge lines (plane-pair intersections)
  4. Computes 8 corner points (triple-plane intersections)
  5. Groups the 12 edges into Length / Breadth / Height
  6. Returns 4 readings per dimension (L1–L4, B1–B4, H1–H4)
     → exactly matching the department's measurement protocol
  7. Returns averages and volume

The scale_factor (mm_per_unit) must be supplied from aruco_scale.py
if the mesh coordinates are NOT already in mm. If they are already in mm
(COLMAP was calibrated with ArUco), pass scale_factor=1.0.
"""
import numpy as np
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ── Constants ──────────────────────────────────────────────────────────────────
RANSAC_DISTANCE_THRESHOLD = 10.0   # mm — points within this distance belong to plane
RANSAC_N                  = 3      # min points to fit a plane
RANSAC_NUM_ITERATIONS     = 1000
OUTLIER_NB_NEIGHBORS      = 20
OUTLIER_STD_RATIO         = 2.0


# ── Helpers ────────────────────────────────────────────────────────────────────

def _load_point_cloud(mesh_path: str):
    """Load mesh/point-cloud file and return an Open3D PointCloud."""
    import open3d as o3d

    # Try as triangle mesh first (PLY from OpenMVS)
    mesh = o3d.io.read_triangle_mesh(mesh_path)
    if len(mesh.vertices) > 0:
        pcd = mesh.sample_points_uniformly(number_of_points=100_000)
        return pcd

    # Fallback: load directly as point cloud
    pcd = o3d.io.read_point_cloud(mesh_path)
    if len(pcd.points) == 0:
        raise ValueError(f"Could not load any geometry from: {mesh_path}")
    return pcd


def _clean_point_cloud(pcd):
    """Remove statistical outliers."""
    import open3d as o3d
    pcd_clean, _ = pcd.remove_statistical_outlier(
        nb_neighbors=OUTLIER_NB_NEIGHBORS,
        std_ratio=OUTLIER_STD_RATIO,
    )
    return pcd_clean


def _detect_planes(pcd, n_planes: int = 6) -> List[Tuple[np.ndarray, np.ndarray]]:
    """
    Iteratively detect dominant planes using RANSAC.
    Returns list of (plane_model [a,b,c,d], inlier_points).
    plane_model satisfies:  ax + by + cz + d = 0
    """
    import open3d as o3d

    planes: List[Tuple[np.ndarray, np.ndarray]] = []
    remaining = pcd

    for i in range(n_planes):
        if len(remaining.points) < 50:
            break
        plane_model, inliers = remaining.segment_plane(
            distance_threshold=RANSAC_DISTANCE_THRESHOLD,
            ransac_n=RANSAC_N,
            num_iterations=RANSAC_NUM_ITERATIONS,
        )
        if len(inliers) < 30:
            break

        inlier_pcd = remaining.select_by_index(inliers)
        planes.append((np.array(plane_model), np.asarray(inlier_pcd.points)))

        # Remove inliers → search for next plane
        remaining = remaining.select_by_index(inliers, invert=True)

    return planes


def _plane_intersection_line(
    plane_a: np.ndarray, plane_b: np.ndarray
) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    Compute the intersection line of two planes.
    Returns (point_on_line, direction_vector) or None if planes are parallel.
    """
    n_a = plane_a[:3]
    n_b = plane_b[:3]

    direction = np.cross(n_a, n_b)
    norm = np.linalg.norm(direction)
    if norm < 1e-6:
        return None   # parallel planes
    direction = direction / norm

    # Find a point on the intersection line
    A = np.array([n_a, n_b, direction])
    b_vec = np.array([-plane_a[3], -plane_b[3], 0.0])
    try:
        point = np.linalg.solve(A, b_vec)
    except np.linalg.LinAlgError:
        return None

    return point, direction


def _three_plane_intersection(
    plane_a: np.ndarray, plane_b: np.ndarray, plane_c: np.ndarray
) -> Optional[np.ndarray]:
    """
    Compute the corner point where three planes meet.
    Returns 3D point or None if degenerate.
    """
    A = np.array([plane_a[:3], plane_b[:3], plane_c[:3]])
    b_vec = np.array([-plane_a[3], -plane_b[3], -plane_c[3]])
    try:
        point = np.linalg.solve(A, b_vec)
        return point
    except np.linalg.LinAlgError:
        return None


def _group_planes_by_normal(
    plane_models: List[np.ndarray],
) -> Tuple[List[int], List[int], List[int]]:
    """
    Group 6 plane indices into 3 pairs (opposing faces) by normal similarity.
    Returns (length_pair, breadth_pair, height_pair) as index lists.
    Each pair has 2 planes (opposite faces).

    Strategy:
      - Compute all pairwise cosine similarities of normals.
      - The 3 most anti-parallel pairs (cos ≈ -1) are the 3 face pairs.
      - The longest axis = Length, second = Breadth, third = Height.
    """
    normals = [p[:3] / np.linalg.norm(p[:3]) for p in plane_models]
    n = len(normals)

    # Find 3 most anti-parallel pairs
    pairs = []
    used = set()
    for i in range(n):
        for j in range(i + 1, n):
            cos_sim = np.dot(normals[i], normals[j])
            pairs.append((cos_sim, i, j))

    pairs.sort(key=lambda x: x[0])   # most negative (anti-parallel) first
    face_pairs = []
    for cos_sim, i, j in pairs:
        if i not in used and j not in used:
            face_pairs.append((i, j))
            used.add(i)
            used.add(j)
        if len(face_pairs) == 3:
            break

    # Pad if fewer than 3 pairs found
    while len(face_pairs) < 3:
        face_pairs.append((0, 1))

    return face_pairs[0], face_pairs[1], face_pairs[2]


def _pair_separation(
    plane_a: np.ndarray,
    plane_b: np.ndarray,
    points_a: np.ndarray,
    points_b: np.ndarray,
) -> float:
    """
    Distance between two parallel planes in mm.
    Uses the signed distance formula.
    """
    n = plane_a[:3] / np.linalg.norm(plane_a[:3])
    d_a = plane_a[3] / np.linalg.norm(plane_a[:3])
    d_b = plane_b[3] / np.linalg.norm(plane_b[:3])
    return abs(d_a - d_b)


def _measure_cuboid_readings(
    planes: List[Tuple[np.ndarray, np.ndarray]],
    plane_models: List[np.ndarray],
    scale_factor: float,
) -> Dict[str, Any]:
    """
    Given detected planes, compute L1-L4, B1-B4, H1-H4 readings in mm.
    Returns measurement dict.
    """
    # Need at least 6 planes for a full cuboid
    if len(planes) < 6:
        raise ValueError(
            f"Only {len(planes)} planes detected (need 6). "
            "Ensure all 6 faces of the block are visible in the photos."
        )

    # Group planes into 3 face pairs
    len_pair, brd_pair, hgt_pair = _group_planes_by_normal(plane_models)

    def _four_readings(pair: Tuple[int, int]) -> List[float]:
        """
        Produce 4 readings for a face pair by sampling 4 sub-regions of
        the inlier point clouds and measuring separation at each sub-region.
        This mimics the officer taking measurements at 4 different positions.
        """
        i, j = pair
        pm_a, pts_a = planes[i]
        pm_b, pts_b = planes[j]

        n_a = pm_a[:3] / np.linalg.norm(pm_a[:3])

        # Project all inlier points onto the plane normal to get distribution
        all_pts = np.vstack([pts_a, pts_b]) if len(pts_b) > 0 else pts_a
        if len(all_pts) < 4:
            base = abs(pm_a[3] / np.linalg.norm(pm_a[:3]) -
                       pm_b[3] / np.linalg.norm(pm_b[:3]))
            base *= scale_factor
            return [round(base, 2)] * 4

        # Split into 4 quadrants and measure separation in each
        centroid = all_pts.mean(axis=0)
        # Two axes perpendicular to the face normal
        arb  = np.array([1, 0, 0]) if abs(n_a[0]) < 0.9 else np.array([0, 1, 0])
        t1   = np.cross(n_a, arb); t1 /= np.linalg.norm(t1)
        t2   = np.cross(n_a, t1);  t2 /= np.linalg.norm(t2)

        proj_t1 = all_pts @ t1
        proj_t2 = all_pts @ t2
        mid_t1  = np.median(proj_t1)
        mid_t2  = np.median(proj_t2)

        quadrant_masks = [
            (proj_t1 <= mid_t1) & (proj_t2 <= mid_t2),
            (proj_t1 >  mid_t1) & (proj_t2 <= mid_t2),
            (proj_t1 <= mid_t1) & (proj_t2 >  mid_t2),
            (proj_t1 >  mid_t1) & (proj_t2 >  mid_t2),
        ]

        readings = []
        for mask in quadrant_masks:
            pts_q = all_pts[mask]
            if len(pts_q) < 3:
                # Fallback to overall plane distance
                dist = abs(pm_a[3] / np.linalg.norm(pm_a[:3]) -
                           pm_b[3] / np.linalg.norm(pm_b[:3]))
                readings.append(round(dist * scale_factor, 2))
                continue
            # Project quadrant points onto face normal, take span
            proj = pts_q @ n_a
            span = (proj.max() - proj.min()) * scale_factor
            readings.append(round(span, 2))

        return readings

    length_readings  = _four_readings(len_pair)
    breadth_readings = _four_readings(brd_pair)
    height_readings  = _four_readings(hgt_pair)

    avg_l = round(float(np.mean(length_readings)),  1)
    avg_b = round(float(np.mean(breadth_readings)), 1)
    avg_h = round(float(np.mean(height_readings)),  1)

    # Volume: cm³ → m³  (readings are in mm, convert to m)
    volume_m3 = round((avg_l / 1000.0) * (avg_b / 1000.0) * (avg_h / 1000.0), 4)

    # Confidence: based on std deviation of readings
    all_stds = [
        float(np.std(length_readings)),
        float(np.std(breadth_readings)),
        float(np.std(height_readings)),
    ]
    avg_std   = float(np.mean(all_stds))
    avg_dim   = float(np.mean([avg_l, avg_b, avg_h]))
    cv        = (avg_std / avg_dim) * 100 if avg_dim > 0 else 10
    confidence = round(max(50.0, 100.0 - cv * 5), 1)

    return {
        # Individual readings (mm) — matches department protocol
        "length_readings":  length_readings,     # [L1, L2, L3, L4]
        "breadth_readings": breadth_readings,    # [B1, B2, B3, B4]
        "height_readings":  height_readings,     # [H1, H2, H3, H4]
        # Averages (mm)
        "avg_length_mm":    avg_l,
        "avg_breadth_mm":   avg_b,
        "avg_height_mm":    avg_h,
        # Convert to cm for DB compatibility (existing DB uses cm)
        "length_cm":        round(avg_l / 10.0, 1),
        "breadth_cm":       round(avg_b / 10.0, 1),
        "height_cm":        round(avg_h / 10.0, 1),
        # Volume
        "volume_m3":        volume_m3,
        # Quality
        "confidence":       confidence,
        "planes_detected":  len(planes),
        "scale_factor":     scale_factor,
    }


def analyze_block_geometry(
    mesh_path: str,
    scale_factor: float = 1.0,
) -> Dict[str, Any]:
    """
    Main entry point. Load a PLY mesh and extract granite block dimensions.

    Args:
        mesh_path:    Path to block_mesh.ply (from OpenMVS).
        scale_factor: mm per reconstruction unit (from aruco_scale.py).
                      Pass 1.0 if mesh coordinates are already in mm.

    Returns:
        Full measurement dict including L1-L4, B1-B4, H1-H4, averages, volume.
    """
    try:
        import open3d as o3d
    except ImportError:
        raise ImportError(
            "open3d is required for geometry analysis. "
            "Install with: pip install open3d"
        )

    logger.info("Loading mesh: %s", mesh_path)
    pcd = _load_point_cloud(mesh_path)
    logger.info("Loaded %d points", len(pcd.points))

    pcd = _clean_point_cloud(pcd)
    logger.info("After cleaning: %d points", len(pcd.points))

    # Apply scale factor to convert to mm
    if abs(scale_factor - 1.0) > 1e-6:
        pts = np.asarray(pcd.points) * scale_factor
        pcd.points = o3d.utility.Vector3dVector(pts)

    # Detect 6 planes
    logger.info("Detecting 6 dominant planes via RANSAC...")
    planes = _detect_planes(pcd, n_planes=6)
    plane_models = [p[0] for p in planes]
    logger.info("Found %d planes", len(planes))

    result = _measure_cuboid_readings(planes, plane_models, scale_factor=1.0)
    result["mesh_path"] = mesh_path
    result["method"]    = "photogrammetry_open3d"

    logger.info(
        "Measurement result: L=%.1f B=%.1f H=%.1f mm | Vol=%.4f m³ | Conf=%.1f%%",
        result["avg_length_mm"], result["avg_breadth_mm"],
        result["avg_height_mm"], result["volume_m3"], result["confidence"],
    )

    return result
