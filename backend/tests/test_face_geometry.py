import math
import numpy as np
import pytest

from app.processing.face_geometry import extract_candidate_readings, QUALITY_GOOD, QUALITY_MISSING, QUALITY_SPARSE, QUALITY_POOR

def make_cuboid_cloud(size_L, size_B, size_H, n_points_per_face=500):
    """Generate a simple axis-aligned cuboid point cloud centered at origin."""
    pts = []
    rng = np.random.default_rng(42)
    
    # helper for a face
    def make_face(axis, val, extent_1, extent_2, name):
        face_pts = np.zeros((n_points_per_face, 3))
        face_pts[:, axis] = val
        axes = [i for i in range(3) if i != axis]
        face_pts[:, axes[0]] = rng.uniform(-extent_1/2, extent_1/2, n_points_per_face)
        face_pts[:, axes[1]] = rng.uniform(-extent_2/2, extent_2/2, n_points_per_face)
        return face_pts
        
    pts.append(make_face(0, size_L/2, size_B, size_H, "right"))
    pts.append(make_face(0, -size_L/2, size_B, size_H, "left"))
    pts.append(make_face(1, size_B/2, size_L, size_H, "front"))
    pts.append(make_face(1, -size_B/2, size_L, size_H, "rear"))
    pts.append(make_face(2, size_H/2, size_L, size_B, "top"))
    pts.append(make_face(2, -size_H/2, size_L, size_B, "bottom"))
    
    return np.vstack(pts)

def test_perfect_cuboid_ransac():
    size_L, size_B, size_H = 1000.0, 500.0, 400.0
    pts = make_cuboid_cloud(size_L, size_B, size_H)
    
    # OBB is aligned with world axes for a perfect, unrotated cuboid
    obb_R = np.eye(3)
    obb_extent = np.array([size_L, size_B, size_H])
    obb_center = np.array([0.0, 0.0, 0.0])
    
    res = extract_candidate_readings(pts, obb_R, obb_extent, obb_center, allowance_mm=25.0)
    
    assert res["n_good_faces"] == 6
    assert all(q == QUALITY_GOOD for q in res["face_quality"].values())
    
    # Check L edges
    for l in res["L_mm"]:
        assert l is not None
        assert math.isclose(l, size_L, rel_tol=0.02)
        
    # Check B edges
    for b in res["B_mm"]:
        assert b is not None
        assert math.isclose(b, size_B, rel_tol=0.02)
        
    # Check H edges
    for h in res["H_mm"]:
        assert h is not None
        assert math.isclose(h, size_H, rel_tol=0.02)
        
    assert res["axis_quality"]["L"] == QUALITY_GOOD
    assert res["axis_quality"]["B"] == QUALITY_GOOD
    assert res["axis_quality"]["H"] == QUALITY_GOOD

def test_rotated_cuboid():
    size_L, size_B, size_H = 1000.0, 500.0, 400.0
    pts = make_cuboid_cloud(size_L, size_B, size_H)
    
    # Rotate by 30 deg around Z
    theta = math.radians(30)
    c, s = math.cos(theta), math.sin(theta)
    R_z = np.array([
        [c, -s, 0],
        [s,  c, 0],
        [0,  0, 1]
    ])
    pts_rot = pts @ R_z.T
    
    obb_R = R_z
    obb_extent = np.array([size_L, size_B, size_H])
    obb_center = np.array([0.0, 0.0, 0.0])
    
    res = extract_candidate_readings(pts_rot, obb_R, obb_extent, obb_center)
    
    assert res["n_good_faces"] == 6
    for l in res["L_mm"]:
        assert math.isclose(l, size_L, rel_tol=0.02)

def test_sparse_face():
    size_L, size_B, size_H = 1000.0, 500.0, 400.0
    
    # Generate face by face so we can modify one
    rng = np.random.default_rng(42)
    def make_face(axis, val, extent_1, extent_2, n=500):
        face_pts = np.zeros((n, 3))
        face_pts[:, axis] = val
        axes = [i for i in range(3) if i != axis]
        face_pts[:, axes[0]] = rng.uniform(-extent_1/2, extent_1/2, n)
        face_pts[:, axes[1]] = rng.uniform(-extent_2/2, extent_2/2, n)
        return face_pts
        
    pts = [
        make_face(0, size_L/2, size_B, size_H),      # right
        make_face(0, -size_L/2, size_B, size_H),     # left
        make_face(1, size_B/2, size_L, size_H),      # front
        make_face(1, -size_B/2, size_L, size_H, 10), # rear - SPARSE! (only 10 points)
        make_face(2, size_H/2, size_L, size_B),      # top
        make_face(2, -size_H/2, size_L, size_B)      # bottom
    ]
    pts = np.vstack(pts)
    
    obb_R = np.eye(3)
    obb_extent = np.array([size_L, size_B, size_H])
    obb_center = np.array([0.0, 0.0, 0.0])
    
    res = extract_candidate_readings(pts, obb_R, obb_extent, obb_center)
    
    assert res["n_good_faces"] == 5
    assert res["face_quality"]["rear"] in (QUALITY_MISSING, QUALITY_SPARSE, QUALITY_POOR)
    
    # Edges involving the rear face should be None
    # L2 (top ∩ rear) and L4 (bottom ∩ rear)
    assert res["L_mm"][1] is None
    assert res["L_mm"][3] is None
    
    # H3 (rear ∩ right) and H4 (rear ∩ left)
    assert res["H_mm"][2] is None
    assert res["H_mm"][3] is None

def test_scale_error_propagation():
    size_L, size_B, size_H = 1000.0, 500.0, 400.0
    pts = make_cuboid_cloud(size_L, size_B, size_H)
    
    # Apply a 2x scale error to the cloud
    pts_scaled = pts * 2.0
    
    obb_R = np.eye(3)
    obb_extent = np.array([size_L * 2, size_B * 2, size_H * 2])
    obb_center = np.array([0.0, 0.0, 0.0])
    
    res = extract_candidate_readings(pts_scaled, obb_R, obb_extent, obb_center)
    
    # All dimensions should be 2x the physical reference
    for l in res["L_mm"]:
        assert math.isclose(l, size_L * 2.0, rel_tol=0.02)
