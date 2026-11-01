import pytest
import os
import cv2
import numpy as np
from fastapi.testclient import TestClient
import sys

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.models import GraniteBlock, Measurement, Image, AuditLog, Quarry, User
from app.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.auth import get_password_hash

# Setup isolated test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_assessment_router.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed data
    q = Quarry(id=1, name="Test Quarry", location_gps="12,34")
    db.add(q)
    u = User(username="operator", hashed_password=get_password_hash("operator123"), role="operator", quarry_id=1)
    db.add(u)
    db.commit()
    
    yield
    
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def _get_operator_token():
    # Helper to login as operator using existing seeded credentials
    response = client.post("/api/auth/login", data={"username": "operator", "password": "operator123"})
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def create_synthetic_image_bytes(marker_size_px=200):
    img = np.zeros((800, 1000, 3), dtype=np.uint8)
    cv2.rectangle(img, (200, 200), (800, 600), (100, 100, 100), -1)
    
    # Draw ArUco marker
    dict_aruco = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker_img = cv2.aruco.generateImageMarker(dict_aruco, 0, marker_size_px)
    marker_img_color = cv2.cvtColor(marker_img, cv2.COLOR_GRAY2BGR)
    img[250:250+marker_size_px, 250:250+marker_size_px] = marker_img_color
    
    _, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()

def create_bad_image_bytes():
    img = np.zeros((800, 1000, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()

def test_router_registration_and_availability():
    # Should get 405 Method Not Allowed or 422 Unprocessable Entity, but not 404
    response = client.post("/assessment/undressed")
    assert response.status_code in (401, 422) # 401 because it needs auth

def test_successful_dressed_assessment():
    token = _get_operator_token()
    if not token:
        pytest.skip("Auth failed, cannot test.")
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create 5 identical synthetic images
    img_bytes = create_synthetic_image_bytes(200)
    files = {
        "top": ("top.jpg", img_bytes, "image/jpeg"),
        "left": ("left.jpg", img_bytes, "image/jpeg"),
        "right": ("right.jpg", img_bytes, "image/jpeg"),
        "front": ("front.jpg", img_bytes, "image/jpeg"),
        "rear": ("rear.jpg", img_bytes, "image/jpeg"),
    }
    
    db = TestingSessionLocal()
    existing_blk = db.query(GraniteBlock).filter(GraniteBlock.id == "TEST-BLK-DRESSED").first()
    if not existing_blk:
        blk = GraniteBlock(id="TEST-BLK-DRESSED", block_type="dressed", quarry_id=1, status="in_stock")
        db.add(blk)
        db.commit()
    db.close()

    data = {
        "camera": "phone",
        "marker_mm": "100.0",
        "block_id": "TEST-BLK-DRESSED"
    }
    
    response = client.post("/assessment/dressed", headers=headers, files=files, data=data)
    assert response.status_code == 200
    
    json_resp = response.json()
    assert "block_id" in json_resp
    assert "length_mm" in json_resp
    
    block_id = json_resp["block_id"]
    
    # Verify Database Persistence
    db = TestingSessionLocal()
    
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    assert block is not None
    assert block.block_type == "dressed"
    
    meas = db.query(Measurement).filter(Measurement.block_id == block_id).first()
    assert meas is not None
    assert meas.measurement_method == "aruco_five_face"
    assert meas.length > 0
    
    imgs = db.query(Image).filter(Image.block_id == block_id).all()
    assert len(imgs) == 5
    
    db.close()

def test_missing_marker_validation():
    token = _get_operator_token()
    if not token:
        pytest.skip("Auth failed, cannot test.")
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Use images without markers
    img_bytes = create_bad_image_bytes()
    files = {
        "top": ("top.jpg", img_bytes, "image/jpeg"),
        "left": ("left.jpg", img_bytes, "image/jpeg"),
        "right": ("right.jpg", img_bytes, "image/jpeg"),
        "front": ("front.jpg", img_bytes, "image/jpeg"),
        "rear": ("rear.jpg", img_bytes, "image/jpeg"),
    }
    
    data = {
        "camera": "phone",
        "marker_mm": "100.0"
    }
    
    response = client.post("/assessment/undressed", headers=headers, files=files, data=data)
    assert response.status_code == 422
    assert "ArUco marker not found" in response.json()["detail"]

def test_invalid_calibration():
    token = _get_operator_token()
    if not token:
        pytest.skip("Auth failed, cannot test.")
        
    headers = {"Authorization": f"Bearer {token}"}
    img_bytes = create_synthetic_image_bytes()
    files = {
        "top": ("top.jpg", img_bytes, "image/jpeg"),
        "left": ("left.jpg", img_bytes, "image/jpeg"),
        "right": ("right.jpg", img_bytes, "image/jpeg"),
        "front": ("front.jpg", img_bytes, "image/jpeg"),
        "rear": ("rear.jpg", img_bytes, "image/jpeg"),
    }
    
    data = {
        "camera": "non_existent_camera",
        "marker_mm": "100.0"
    }
    
    response = client.post("/assessment/undressed", headers=headers, files=files, data=data)
    assert response.status_code == 400
    assert "No calibration file" in response.json()["detail"]

def test_regression_existing_endpoint():
    # Make sure existing analyze endpoints still work (they just return validation errors if no images)
    token = _get_operator_token()
    if not token:
        pytest.skip("Auth failed")
        
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/blocks/analyze-undressed", headers=headers)
    assert response.status_code == 400
    assert "Please provide at least one photo" in response.json()["detail"]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

def test_validation_endpoint_audit():
    token = _get_operator_token()
    if not token: pytest.skip("Auth failed")
    headers = {"Authorization": f"Bearer {token}"}
    
    img_bytes = create_synthetic_image_bytes(200)
    files = {
        "top": ("top.jpg", img_bytes, "image/jpeg"),
        "left": ("left.jpg", img_bytes, "image/jpeg"),
        "right": ("right.jpg", img_bytes, "image/jpeg"),
        "front": ("front.jpg", img_bytes, "image/jpeg"),
        "rear": ("rear.jpg", img_bytes, "image/jpeg"),
    }
    
    data = {
        "camera": "phone",
        "marker_mm": "100.0",
        "truth_length_cm": "250",
        "truth_breadth_cm": "150",
        "truth_height_cm": "100"
    }
    
    response = client.post("/assessment/validate", headers=headers, files=files, data=data)
    assert response.status_code == 200
    
    json_resp = response.json()
    assert "calculated" in json_resp
    assert "error_percentage" in json_resp
    assert "ground_truth" in json_resp
    
    # Check AuditLog
    db = TestingSessionLocal()
    log = db.query(AuditLog).filter(AuditLog.event == "CALIBRATION_TEST").order_by(AuditLog.id.desc()).first()
    assert log is not None
    assert log.username == "operator"
    assert log.block_id == "CALIB-TEST"
    assert log.timestamp is not None
    
    import json
    details = json.loads(log.details)
    assert "error_percentage" in details
    assert "calculated" in details
    db.close()

def test_reassessment_preserves_evidence():
    token = _get_operator_token()
    if not token: pytest.skip("Auth failed")
    headers = {"Authorization": f"Bearer {token}"}
    
    # First successful assessment
    img_bytes = create_synthetic_image_bytes(200)
    files1 = { k: (f"{k}.jpg", img_bytes, "image/jpeg") for k in ["top", "left", "right", "front", "rear"] }
    data = {"camera": "phone", "marker_mm": "100.0"}
    
    r1 = client.post("/assessment/dressed", headers=headers, files=files1, data=data)
    assert r1.status_code == 200
    block_id = r1.json()["block_id"]
    
    db = TestingSessionLocal()
    imgs1 = db.query(Image).filter(Image.block_id == block_id).all()
    assert len(imgs1) == 5
    
    # Second successful reassessment
    files2 = { k: (f"{k}_2.jpg", img_bytes, "image/jpeg") for k in ["top", "left", "right", "front", "rear"] }
    data["block_id"] = block_id
    r2 = client.post("/assessment/dressed", headers=headers, files=files2, data=data)
    assert r2.status_code == 200
    
    imgs2 = db.query(Image).filter(Image.block_id == block_id).all()
    # It should accumulate (limitation preserved)
    assert len(imgs2) == 10 
    
    # Third failed reassessment (bad images)
    bad_bytes = create_bad_image_bytes()
    files3 = { k: (f"{k}_3.jpg", bad_bytes, "image/jpeg") for k in ["top", "left", "right", "front", "rear"] }
    r3 = client.post("/assessment/dressed", headers=headers, files=files3, data=data)
    assert r3.status_code == 422 # Fails due to no marker
    
    # Ensure evidence from before was NOT destroyed
    imgs3 = db.query(Image).filter(Image.block_id == block_id).all()
    assert len(imgs3) == 10 # still 10, not cleared out, and no bad images saved
    db.close()
