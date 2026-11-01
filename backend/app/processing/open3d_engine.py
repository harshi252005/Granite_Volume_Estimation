import numpy as np
import logging

logger = logging.getLogger(__name__)

def is_open3d_available() -> bool:
    try:
        import open3d as o3d
        return True
    except ImportError:
        return False

def detect_scale_bar_endpoints(pcd, known_mm=1000.0, color_threshold=0.5):
    """
    Automatically detects a red scale bar in the point cloud.
    Assumes the scale bar has a highly distinct red color (R > color_threshold, G & B low).
    """
    import open3d as o3d
    
    colors = np.asarray(pcd.colors)
    points = np.asarray(pcd.points)
    
    # Simple color thresholding for 'red'
    # In reality, this would use a more robust color space like HSV.
    red_mask = (colors[:, 0] > color_threshold) & (colors[:, 1] < 0.3) & (colors[:, 2] < 0.3)
    
    red_points = points[red_mask]
    if len(red_points) < 10:
        return None, "Not enough red points found to identify the scale bar."
        
    # Create a temporary point cloud for the red points to cluster them
    red_pcd = o3d.geometry.PointCloud()
    red_pcd.points = o3d.utility.Vector3dVector(red_points)
    
    # Cluster the red points to find the main scale bar (noise reduction)
    labels = np.array(red_pcd.cluster_dbscan(eps=15.0, min_points=10, print_progress=False))
    if len(labels) == 0 or labels.max() < 0:
        return None, "Scale bar points too scattered to form a valid cluster."
        
    main_cluster_idx = np.bincount(labels[labels >= 0]).argmax()
    bar_points = red_points[labels == main_cluster_idx]
    
    # Find the two furthest points in the cluster (the endpoints of the scale bar)
    # For a simple approach, just compute pairwise distances or bounding box.
    # We will use the bounding box extent.
    bar_pcd = o3d.geometry.PointCloud()
    bar_pcd.points = o3d.utility.Vector3dVector(bar_points)
    obb = bar_pcd.get_oriented_bounding_box()
    box_points = np.asarray(obb.get_box_points())
    
    # Find the longest edge of the bounding box
    max_dist = 0
    p1, p2 = None, None
    for i in range(len(box_points)):
        for j in range(i+1, len(box_points)):
            d = np.linalg.norm(box_points[i] - box_points[j])
            if d > max_dist:
                max_dist = d
                p1, p2 = box_points[i], box_points[j]
                
    if p1 is None or p2 is None:
        return None, "Could not determine scale bar endpoints."
        
    # We return the unscaled endpoints and the message
    return (p1, p2), "Automatic red scale bar detection successful."

def process_fused_ply(ply_path: str, colmap_sparse_dir: str, image_dir: str, known_mm: float = 100.0, allowance_mm: float = 25.0):
    """
    Process the COLMAP output point cloud.
    1. Detects ArUco marker in 3D and scales the point cloud.
    2. Segments ground and isolates block.
    3. Computes oriented bounding box and convex hull.
    4. Computes face planes to extract 4 dimensions per axis.
    """
    if not is_open3d_available():
        raise RuntimeError("Open3D is not installed.")
        
    import open3d as o3d
    
    pcd = o3d.io.read_point_cloud(ply_path)
    if not pcd.has_points():
        return {"success": False, "message": "Point cloud is empty or unreadable."}

    warnings = []
    
    # 1. Scale Bar Detection using 3D ArUco
    from pathlib import Path
    from .aruco_scale import colmap_aruco_scale_factor, ArucoScaleCalibrationError, diagnostic_red_scale_bar_distance
    
    try:
        scale_factor, scale_info = colmap_aruco_scale_factor(
            colmap_sparse_dir=Path(colmap_sparse_dir),
            image_dir=Path(image_dir),
            marker_mm=known_mm
        )
    except ArucoScaleCalibrationError as e:
        return {
            "success": False, 
            "message": f"Scale validation failed: {str(e)}",
            "warnings": warnings
        }
        
    pcd.scale(scale_factor, center=(0, 0, 0))
    
    # Run diagnostic red scale bar check for logging, if requested
    red_dist, red_msg = diagnostic_red_scale_bar_distance(pcd)
    if red_dist is not None:
        logger.info(f"Diagnostic red scale bar check: {red_dist} -> {red_msg}")
    
    # 2. Downsample and Denoise
    pcd = pcd.voxel_down_sample(5.0)
    pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=30, std_ratio=2.0)
    
    if len(pcd.points) < 100:
        return {"success": False, "message": "Too few points remain after filtering."}
        
    # 3. Ground Plane Segmentation
    _, ground_idx = pcd.segment_plane(distance_threshold=10, ransac_n=3, num_iterations=2000)
    block_pcd = pcd.select_by_index(ground_idx, invert=True)
    
    # 4. Isolate the main block cluster
    labels = np.array(block_pcd.cluster_dbscan(eps=50.0, min_points=30))
    if len(labels) == 0 or labels.max() < 0:
        return {"success": False, "message": "Could not isolate the granite block."}
        
    main_cluster = np.bincount(labels[labels >= 0]).argmax()
    block_pcd = block_pcd.select_by_index(np.where(labels == main_cluster)[0])
    
    # 5. Extract Dimensions
    obb = block_pcd.get_oriented_bounding_box()
    ext = sorted(obb.extent, reverse=True) # L, B, H in descending order
    L_obb, B_obb, H_obb = ext[0], ext[1], ext[2]
    
    hull, _ = block_pcd.compute_convex_hull()
    hull_volume_m3 = hull.get_volume() / 1e9
    
    dl, db, dh = [max(x - 2 * allowance_mm, 0) for x in ext]
    assumed_dressed_volume_m3 = dl * db * dh / 1e9
    
    # 6. Candidate statutory edge measurements (PROTOTYPE — not statutory)
    # extract_candidate_readings() fits one RANSAC plane per block face and
    # intersects adjacent plane pairs to derive candidate L/B/H edge lengths.
    # Each measurement carries an explicit quality grade.
    # This output MUST NOT drive seigniorage or statutory volume decisions.
    from .face_geometry import extract_candidate_readings

    block_pts = np.asarray(block_pcd.points)
    obb_R = np.asarray(obb.R)           # (3,3) rotation matrix
    obb_extent = np.asarray(obb.extent) # (3,) extents in world units (mm after scaling)
    obb_center = np.asarray(obb.center)

    geo = extract_candidate_readings(
        block_pts=block_pts,
        obb_R=obb_R,
        obb_extent=obb_extent,
        obb_center=obb_center,
        allowance_mm=allowance_mm,
    )
    warnings.extend(geo["warnings"])

    # L_array / B_array / H_array contain None for edges that could not be measured.
    # They are CANDIDATE readings, not confirmed statutory values.
    L_array = geo["L_mm"]
    B_array = geo["B_mm"]
    H_array = geo["H_mm"]

    # Compute mean of valid (non-None) readings for DB scalar fields.
    def _safe_mean(arr):
        valid = [v for v in arr if v is not None]
        return float(np.mean(valid)) if valid else L_obb

    return {
        "success": True,
        # ── Candidate edge readings (PROTOTYPE, provisional axis mapping) ──────
        "lengths_mm": L_array,
        "breadths_mm": B_array,
        "heights_mm": H_array,
        # ── OBB — geometry reference, distinct from edge readings ─────────────
        "obb_dimensions_mm": {"L": L_obb, "B": B_obb, "H": H_obb},
        # ── Volumetrics ───────────────────────────────────────────────────────
        "convex_hull_volume_m3": hull_volume_m3,
        # ── Provisional dressed estimate (formula UNCONFIRMED) ─────────────────
        "assumed_dressed": {
            "length_mm": dl,
            "breadth_mm": db,
            "height_mm": dh,
            "volume_m3": assumed_dressed_volume_m3,
        },
        "assumed_dressed_provisional": geo["assumed_dressed_provisional"],
        # ── Quality metadata ──────────────────────────────────────────────────
        "edge_quality": {
            "face_quality": geo["face_quality"],
            "axis_quality": geo["axis_quality"],
            "n_good_faces": geo["n_good_faces"],
            "method": geo["method"],
        },
        # ── Scale info ────────────────────────────────────────────────────────
        "scale_info": scale_info,
        "warnings": warnings,
    }

