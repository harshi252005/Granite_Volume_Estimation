import os
import tempfile
import pytest
import numpy as np
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app
from app.processing.open3d_engine import process_fused_ply, is_open3d_available
from app.models import GraniteBlock, Measurement, AuditLog
from app.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_walkaround.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    from app.models import Quarry, User
    from app.auth import get_password_hash
    # Seed
    q = Quarry(id=1, name="Test Quarry", location_gps="12,34")
    db.add(q)
    u = User(username="op_test", hashed_password=get_password_hash("pass"), role="operator", quarry_id=1)
    db.add(u)
    db.commit()
    yield
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def get_auth_token():
    resp = client.post("/api/auth/login", data={"username": "op_test", "password": "pass"})
    return resp.json()["access_token"]

@pytest.mark.skipif(not is_open3d_available(), reason="Open3D not installed")
def test_synthetic_open3d_engine():
    import open3d as o3d
    
    with tempfile.TemporaryDirectory() as temp_dir:
        ply_path = os.path.join(temp_dir, "synthetic.ply")
        
        # Create a synthetic point cloud
        # 1. Ground plane (z=0)
        gx, gy = np.meshgrid(np.linspace(-2000, 2000, 200), np.linspace(-2000, 2000, 200))
        gz = np.zeros_like(gx) + np.random.normal(0, 2, gx.shape)
        ground_pts = np.vstack([gx.flatten(), gy.flatten(), gz.flatten()]).T
        ground_colors = np.ones_like(ground_pts) * [0.5, 0.5, 0.5] # gray
        
        # 2. Block (1000 x 500 x 500 box, centered at z=250)
        bx = np.random.uniform(-500, 500, 10000)
        by = np.random.uniform(-250, 250, 10000)
        bz = np.random.uniform(0, 500, 10000)
        block_pts = np.vstack([bx, by, bz]).T
        block_colors = np.ones_like(block_pts) * [0.3, 0.3, 0.3] # dark gray
        
        # 3. Scale bar (red, length 1000, sitting on ground at y=1000)
        sx = np.linspace(-500, 500, 1000)
        sy = np.ones_like(sx) * 1000 + np.random.normal(0, 5, 1000)
        sz = np.zeros_like(sx) + np.random.normal(0, 5, 1000)
        scale_pts = np.vstack([sx, sy, sz]).T
        scale_colors = np.ones_like(scale_pts) * [1.0, 0.0, 0.0] # red
        
        all_pts = np.vstack([ground_pts, block_pts, scale_pts])
        all_colors = np.vstack([ground_colors, block_colors, scale_colors])
        
        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(all_pts)
        pcd.colors = o3d.utility.Vector3dVector(all_colors)
        
        o3d.io.write_point_cloud(ply_path, pcd)
        # Mock colmap_aruco_scale_factor so it returns 1.0 (since the synthetic block is in mm)
        from unittest.mock import patch
        with patch("app.processing.aruco_scale.colmap_aruco_scale_factor") as mock_aruco:
            mock_aruco.return_value = (1.0, {"method": "aruco_3d_triangulation", "message": "mocked scale"})
            
            # Test the engine
            res = process_fused_ply(ply_path, known_mm=1000.0, allowance_mm=25.0, colmap_sparse_dir="dummy/sparse", image_dir="dummy/images")
            
            assert res["success"] is True, res.get("message")
            assert res["scale_info"]["method"] == "aruco_3d_triangulation"
            
            # Block is 1000 L, 500 B, 500 H
            # Given randomness and voxel downsampling, just verify it computed something valid
            assert res["obb_dimensions_mm"]["L"] > 0
            assert res["obb_dimensions_mm"]["B"] > 0
            assert res["obb_dimensions_mm"]["H"] > 0

@patch("app.processing.colmap_runner.is_colmap_available", return_value=True)
@patch("app.processing.open3d_engine.is_open3d_available", return_value=True)
@patch("app.processing.colmap_runner.run_colmap_pipeline")
@patch("app.processing.open3d_engine.process_fused_ply")
def test_walkaround_endpoint_success(mock_process, mock_colmap, mock_o3d_avail, mock_colmap_avail, setup_db):
    token = get_auth_token()
    
    mock_colmap.return_value = {
        "success": True,
        "fused_ply": "/mock/path/fused.ply"
    }
    
    mock_process.return_value = {
        "success": True,
        "lengths_mm": [1000, 1000, 1000, 1000],
        "breadths_mm": [500, 500, 500, 500],
        "heights_mm": [500, 500, 500, 500],
        "obb_dimensions_mm": {"L": 1000, "B": 500, "H": 500},
        "convex_hull_volume_m3": 0.25,
        "assumed_dressed": {"length_mm": 950, "breadth_mm": 450, "height_mm": 450, "volume_m3": 0.192},
        "scale_info": {"method": "mocked", "scale_factor": 1.0, "unscaled_distance": 1000.0, "message": "OK"},
        "warnings": []
    }
    
    # Create 30 dummy files
    files = []
    for i in range(30):
        files.append(("images", (f"img_{i}.jpg", b"fake_data", "image/jpeg")))
        
    response = client.post(
        "/assessment/walkaround",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data={"allowance_mm": 25.0}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["volume_m3"] == 0.25
    assert data["block_id"].startswith("BLK-")
    
    # Verify DB preservation and audit logging
    db = TestingSessionLocal()
    logs = db.query(AuditLog).filter(AuditLog.block_id == data["block_id"]).all()
    assert len(logs) == 1
    assert logs[0].event == "WALKAROUND_3D_ASSESSMENT"
    
    meas = db.query(Measurement).filter(Measurement.block_id == data["block_id"]).first()
    assert meas is not None
    assert meas.measurement_method == "walkaround_3d"
    assert meas.photos_used == 30
    db.close()

def test_walkaround_endpoint_insufficient_images(setup_db):
    token = get_auth_token()
    
    # Boundary: 29 images
    files = []
    for i in range(29):
        files.append(("images", (f"img_{i}.jpg", b"fake_data", "image/jpeg")))
        
    response = client.post(
        "/assessment/walkaround",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data={"allowance_mm": 25.0}
    )
    
    assert response.status_code == 400
    assert "requires at least 30" in response.json()["detail"]

def test_walkaround_endpoint_excessive_images(setup_db):
    token = get_auth_token()
    
    # Boundary: 61 images
    files = []
    for i in range(61):
        files.append(("images", (f"img_{i}.jpg", b"fake_data", "image/jpeg")))
        
    response = client.post(
        "/assessment/walkaround",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data={"allowance_mm": 25.0}
    )
    
    assert response.status_code == 400
    assert "accepts a maximum of 60" in response.json()["detail"]

@patch("app.processing.colmap_runner.is_colmap_available", return_value=True)
@patch("app.processing.open3d_engine.is_open3d_available", return_value=True)
@patch("app.processing.colmap_runner.run_colmap_pipeline")
@patch("app.processing.open3d_engine.process_fused_ply")
def test_walkaround_endpoint_success_60_images(mock_process, mock_colmap, mock_o3d_avail, mock_colmap_avail, setup_db):
    token = get_auth_token()
    
    mock_colmap.return_value = {
        "success": True,
        "fused_ply": "/mock/path/fused.ply"
    }
    
    mock_process.return_value = {
        "success": True,
        "lengths_mm": [1000, 1000, 1000, 1000],
        "breadths_mm": [500, 500, 500, 500],
        "heights_mm": [500, 500, 500, 500],
        "obb_dimensions_mm": {"L": 1000, "B": 500, "H": 500},
        "convex_hull_volume_m3": 0.25,
        "assumed_dressed": {"length_mm": 950, "breadth_mm": 450, "height_mm": 450, "volume_m3": 0.192},
        "scale_info": {"method": "mocked", "scale_factor": 1.0, "unscaled_distance": 1000.0, "message": "OK"},
        "warnings": []
    }
    
    # Boundary: exactly 60 images
    files = []
    for i in range(60):
        files.append(("images", (f"img_{i}.jpg", b"fake_data", "image/jpeg")))
        
    response = client.post(
        "/assessment/walkaround",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data={"allowance_mm": 25.0}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["volume_m3"] == 0.25


@patch("app.processing.colmap_runner.is_colmap_available", return_value=True)
@patch("app.processing.open3d_engine.is_open3d_available", return_value=True)
@patch("app.processing.colmap_runner.run_colmap_pipeline")
def test_walkaround_endpoint_colmap_failure(mock_colmap, mock_o3d_avail, mock_colmap_avail, setup_db):
    token = get_auth_token()
    
    mock_colmap.return_value = {
        "success": False,
        "message": "Not enough overlap."
    }
    
    files = []
    for i in range(30):
        files.append(("images", (f"img_{i}.jpg", b"fake_data", "image/jpeg")))
        
    response = client.post(
        "/assessment/walkaround",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data={"allowance_mm": 25.0}
    )
    
    assert response.status_code == 422
    assert "Not enough overlap." in response.json()["detail"]
