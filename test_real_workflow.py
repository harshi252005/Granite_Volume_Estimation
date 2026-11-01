import os
import requests
import json

BASE = "http://localhost:8000"

def test_real_photos_and_weighbridge_variance():
    print("=" * 60)
    print("TESTING MULTI-VIEW & WEIGHBRIDGE TOLERANCE WITH REAL DATA")
    print("=" * 60)

    # Login Operator, DMGO, Weighbridge
    op_res = requests.post(f"{BASE}/api/auth/login", data={"username": "operator", "password": "operator123"})
    op_token = op_res.json()["access_token"]

    dmgo_res = requests.post(f"{BASE}/api/auth/login", data={"username": "dmgo", "password": "dmgo123"})
    dmgo_token = dmgo_res.json()["access_token"]

    wb_res = requests.post(f"{BASE}/api/auth/login", data={"username": "weighbridge", "password": "weighbridge123"})
    wb_token = wb_res.json()["access_token"]

    block_dir = r"c:\Users\bidal\Downloads\SMART GRANITE\SMART GRANITE\datasets\sample_granite_blocks\block_01_chimakurthy_black_galaxy"
    
    files = {
        "left": open(os.path.join(block_dir, "left.jpg"), "rb"),
        "right": open(os.path.join(block_dir, "right.jpg"), "rb"),
        "front": open(os.path.join(block_dir, "front.jpg"), "rb"),
        "rear": open(os.path.join(block_dir, "rear.jpg"), "rb"),
        "top": open(os.path.join(block_dir, "top.jpg"), "rb"),
    }

    print("\n1. Testing Multi-View Photogrammetric AI Analysis (/api/blocks/analyze-multi)...")
    res = requests.post(
        f"{BASE}/api/blocks/analyze-multi",
        files=files,
        headers={"Authorization": f"Bearer {op_token}"}
    )
    print(f"Analyze multi status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        print(f"  -> Method: {data.get('measurement_method')}")
        print(f"  -> Lengths (L1-L4): {data.get('length_readings')} => Avg L: {data.get('length')} cm")
        print(f"  -> Breadths (B1-B4): {data.get('breadth_readings')} => Avg B: {data.get('breadth')} cm")
        print(f"  -> Heights (H1-H4): {data.get('height_readings')} => Avg H: {data.get('height')} cm")
        print(f"  -> Volume: {data.get('volume')} m3, Est. Weight: {data.get('estimated_weight')} MT")
        print(f"  -> Size Category: {data.get('size_category')}, Seigniorage: Rs. {data.get('estimated_seigniorage')}")
    else:
        print(f"Analyze multi failed: {res.text}")

    # Now let's register a real block with front.jpg
    print("\n2. Registering Block with Real Quarry Photo...")
    import time
    blk_id = f"REAL-BLK-{int(time.time()) % 100000}"
    files_reg = {"file": ("front.jpg", open(os.path.join(block_dir, "front.jpg"), "rb"), "image/jpeg")}
    reg_data = {
        "block_id": blk_id,
        "quarry_id": 301,
        "gps": "15.5923,79.6421",
        "granite_type": "Black Galaxy Granite",
        "block_type": "dressed",
    }
    r = requests.post(f"{BASE}/api/blocks", data=reg_data, files=files_reg, headers={"Authorization": f"Bearer {op_token}"})
    print(f"Register status: {r.status_code}")
    reg_resp = r.json()
    meas = reg_resp.get("measurement", {})
    est_weight = meas.get("estimated_weight", 0.0)
    print(f"  -> Registered Block {blk_id}: L={meas.get('length')}cm, B={meas.get('breadth')}cm, H={meas.get('height')}cm, Weight={est_weight} MT")

    # Raise check request
    requests.post(
        f"{BASE}/api/blocks/raise-check-request",
        json={"block_ids": [blk_id], "remarks": "Real block check request"},
        headers={"Authorization": f"Bearer {op_token}"}
    )
    print("  -> Check measurement request raised.")

    # DMGO Approves
    requests.post(
        f"{BASE}/api/blocks/{blk_id}/dmgo-verify",
        json={"action": "approve", "remarks": "DMGO verified real dimensions."},
        headers={"Authorization": f"Bearer {dmgo_token}"}
    )
    print("  -> DMGO approved block.")

    # Issue transit pass
    requests.post(
        f"{BASE}/api/dispatch/{blk_id}/issue-pass",
        data={"vehicle_number": "AP27TT1122", "driver_name": "Sivaiah", "destination": "Chennai Port", "validity_hours": 48},
        headers={"Authorization": f"Bearer {dmgo_token}"}
    )
    print("  -> e-Transit Pass issued by DMGO.")

    # 3. Test Weighbridge Flagging when Actual Weight is 20% overloaded
    print("\n3. Testing Weighbridge Overload Flagging...")
    overloaded_weight = round(est_weight * 1.20, 2)  # 20% heavier
    wb_flag = requests.post(
        f"{BASE}/api/weighbridge/{blk_id}",
        data={"actual_weight": overloaded_weight},
        headers={"Authorization": f"Bearer {wb_token}"}
    )
    wb_res_data = wb_flag.json()
    print(f"  -> Weighbridge actual: {overloaded_weight} MT (AI was {est_weight} MT)")
    print(f"  -> Difference: {wb_res_data.get('difference_percentage')}%, Status: {wb_res_data.get('status')}")
    assert wb_res_data.get("status") == "flagged", "Expected status to be 'flagged'!"
    print("  [PASSED] Overload correctly trapped and FLAGGED by Weighbridge system!")

    # 4. Operator tries to dispatch while flagged (MUST FAIL)
    print("\n4. Verifying Anti-Fraud Dispatch Blockade...")
    disp_blocked = requests.post(
        f"{BASE}/api/dispatch/{blk_id}",
        data={"vehicle_number": "AP27TT1122", "driver_name": "Sivaiah", "destination": "Chennai Port"},
        headers={"Authorization": f"Bearer {op_token}"}
    )
    print(f"  -> Dispatch attempt while flagged: HTTP {disp_blocked.status_code}")
    assert disp_blocked.status_code == 400, "Flagged block was dispatched! Anti-fraud failed!"
    print("  [PASSED] Operator dispatch is strictly BLOCKED while weighbridge is flagged!")

    # 5. DMGO Override with Official Justification
    print("\n5. Testing DMGO Official Override...")
    override_res = requests.put(
        f"{BASE}/api/weighbridge/{blk_id}/override",
        data={"remarks": "Scale calibration checked by Senior Inspector; approved variance due to heavy rain moisture content."},
        headers={"Authorization": f"Bearer {dmgo_token}"}
    )
    print(f"  -> DMGO Override status: {override_res.status_code}, New Status: {override_res.json().get('status')}")

    # 6. Now operator can dispatch!
    disp_cleared = requests.post(
        f"{BASE}/api/dispatch/{blk_id}",
        data={"vehicle_number": "AP27TT1122", "driver_name": "Sivaiah", "destination": "Chennai Port"},
        headers={"Authorization": f"Bearer {op_token}"}
    )
    print(f"  -> Dispatch after DMGO override: HTTP {disp_cleared.status_code}")
    assert disp_cleared.status_code == 200, "Dispatch failed after valid DMGO override!"
    print("  [PASSED] Dispatch succeeded following authorized DMGO override!")

    print("\n" + "=" * 60)
    print("REAL DATA PIPELINE AND ANTI-FRAUD TESTS 100% SUCCESSFUL!")
    print("=" * 60)

if __name__ == "__main__":
    test_real_photos_and_weighbridge_variance()
