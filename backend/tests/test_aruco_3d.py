import pytest
import numpy as np
from pathlib import Path
from app.processing.aruco_scale import _triangulate_marker_corner, colmap_aruco_scale_factor, ArucoScaleCalibrationError

def test_triangulate_marker_corner():
    # Simple synthetic test for DLT triangulation
    # Put a marker at (0, 0, 100) in world coordinates.
    # Camera 1 at origin, looking at Z
    R1 = np.eye(3)
    t1 = np.zeros(3)
    K = np.array([[1000, 0, 500], [0, 1000, 500], [0, 0, 1]])
    
    # Camera 2 at (10, 0, 0)
    R2 = np.eye(3)
    t2 = np.array([-10.0, 0.0, 0.0]) # world to cam translation is -cam_pos
    
    # Project point (0, 0, 100)
    pt = np.array([0, 0, 100, 1])
    
    P1 = K @ np.hstack([R1, t1.reshape(3, 1)])
    p1 = P1 @ pt
    u1, v1 = p1[0]/p1[2], p1[1]/p1[2]
    
    P2 = K @ np.hstack([R2, t2.reshape(3, 1)])
    p2 = P2 @ pt
    u2, v2 = p2[0]/p2[2], p2[1]/p2[2]
    
    obs = [
        (R1, t1, K, np.array([[u1, v1], [0,0], [0,0], [0,0]])),
        (R2, t2, K, np.array([[u2, v2], [0,0], [0,0], [0,0]]))
    ]
    
    pt_3d = _triangulate_marker_corner(obs, corner_idx=0)
    assert pt_3d is not None
    assert np.allclose(pt_3d, [0, 0, 100], atol=1e-3)

def test_colmap_aruco_scale_factor_missing_model(tmp_path):
    sparse_dir = tmp_path / "sparse"
    sparse_dir.mkdir()
    
    with pytest.raises(ArucoScaleCalibrationError, match="COLMAP sparse model files not found"):
        colmap_aruco_scale_factor(sparse_dir, tmp_path, 100.0)

def test_colmap_aruco_scale_factor_empty_model(tmp_path):
    sparse_dir = tmp_path / "sparse"
    sparse_dir.mkdir()
    
    import struct
    with open(sparse_dir / "cameras.bin", "wb") as f:
        f.write(struct.pack("<Q", 0))
    with open(sparse_dir / "images.bin", "wb") as f:
        f.write(struct.pack("<Q", 0))
        
    with pytest.raises(ArucoScaleCalibrationError, match="empty"):
        colmap_aruco_scale_factor(sparse_dir, tmp_path, 100.0)
