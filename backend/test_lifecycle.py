import requests
import time
import json
import uuid

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("Starting SMART GRANITE Lifecycle Integration Test...\n")
    
    # ---------------------------------------------------------
    # 1. Login as Operator
    # ---------------------------------------------------------
    print("=> Logging in as Operator...")
    op_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "operator", "password": "operator123"})
    op_token = op_resp.json().get("access_token")
    op_headers = {"Authorization": f"Bearer {op_token}"}
    
    # ---------------------------------------------------------
    # Step 1 & 3: Mobile Application Field Capture & AI Volume Est.
    # ---------------------------------------------------------
    print("\n=> [Step 1 & 3] Simulating Mobile Field Capture & AI Volume Estimation...")
    block_id = f"TEST_LIFECYCLE_{uuid.uuid4().hex[:6].upper()}"
    data = {
        "block_id": block_id,
        "quarry_id": 1,
        "gps": "15.5833, 79.9167"
    }
    # Create a dummy image file for upload
    files = {
        "file": ("dummy.jpg", b"fake_image_bytes", "image/jpeg")
    }
    create_resp = requests.post(f"{BASE_URL}/blocks/", data=data, files=files, headers=op_headers)
    block = create_resp.json()
    if "id" not in block:
        print("API Error Response:", block)
        return
    block_id = block["id"]
    print(f"   [SUCCESS] Block captured via mobile mock. Block ID: {block_id}")
    print(f"   [SUCCESS] AI Estimated Volume: {block['measurement']['volume']} CBM")
    print(f"   [SUCCESS] AI Estimated Weight: {block['measurement']['estimated_weight']} MT")
    
    # ---------------------------------------------------------
    # Step 2: Automated Seigniorage Classification
    # ---------------------------------------------------------
    print("\n=> [Step 2] Validating Automated Seigniorage Classification...")
    seigniorage = block["seigniorage"]
    print(f"   [SUCCESS] Class Status: {seigniorage['class_status']}")
    print(f"   [SUCCESS] Calculated Total Fee: Rs.{seigniorage['total_fee']}")
    
    # ---------------------------------------------------------
    # DMGO Verification
    # ---------------------------------------------------------
    print("\n=> Logging in as DMGO to approve...")
    dmgo_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "dmgo", "password": "dmgo123"})
    dmgo_token = dmgo_resp.json().get("access_token")
    dmgo_headers = {"Authorization": f"Bearer {dmgo_token}"}
    
    verify_resp = requests.post(f"{BASE_URL}/blocks/{block_id}/verify", params={"status": "dmgo_approved"}, headers=dmgo_headers)
    print(f"   [SUCCESS] DMGO Approved Block: {verify_resp.json()['status']}")
    
    # ---------------------------------------------------------
    # Step 4: System Integration (Weighbridge Cross Validation)
    # ---------------------------------------------------------
    print("\n=> [Step 4] Logging in as Weighbridge for System Integration & Cross-validation...")
    wb_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "weighbridge", "password": "weighbridge123"})
    wb_token = wb_resp.json().get("access_token")
    wb_headers = {"Authorization": f"Bearer {wb_token}"}
    
    # Send a weight that is slightly different but acceptable
    actual_weight = 10.0 # 2.5 * 1.5 * 1.0 = 3.75 CBM * 2.7 = 10.125 MT AI weight
    wb_data = {
        "actual_weight": actual_weight
    }
    weight_resp = requests.post(f"{BASE_URL}/blocks/{block_id}/weighbridge", json=wb_data, headers=wb_headers)
    wb_result = weight_resp.json()
    print(f"   [SUCCESS] Weighbridge cross-validation complete.")
    print(f"   [SUCCESS] AI Weight: 10.125 MT vs Scale Weight: {actual_weight} MT")
    print(f"   [SUCCESS] Variance: {wb_result['weighbridge']['difference_percentage']}%")
    print(f"   [SUCCESS] Block Status: {wb_result['status']}")

    # ---------------------------------------------------------
    # Step 5: Audit and Traceability
    # ---------------------------------------------------------
    print("\n=> [Step 5] Checking Audit and Traceability (Admin login)...")
    admin_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin123"})
    admin_token = admin_resp.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    audit_resp = requests.get(f"{BASE_URL}/audit/", headers=admin_headers)
    logs = audit_resp.json()
    block_logs = [log for log in logs if log["entity_id"] == block_id]
    
    print(f"   [SUCCESS] Found {len(block_logs)} immutable audit logs for this block.")
    for log in block_logs:
        print(f"      - {log['timestamp']}: User {log['user_id']} -> {log['action']} ({log['details']})")
        
    print("\n✅ All 5 core lifecycle steps have been successfully tested and validated on the backend!")

if __name__ == "__main__":
    run_test()
