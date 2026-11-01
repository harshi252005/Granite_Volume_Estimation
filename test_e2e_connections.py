import sys
import requests
import json

BASE = "http://localhost:8000"

def test_workflow():
    print("=" * 60)
    print("STARTING SMART GRANITE END-TO-END CONNECTION TEST")
    print("=" * 60)

    # 1. Test Logins for each role
    roles = {
        "admin": "admin123",
        "operator": "operator123",
        "dmgo": "dmgo123",
        "weighbridge": "weighbridge123",
        "enforcement": "enforcement123",
    }
    tokens = {}
    for user, pwd in roles.items():
        res = requests.post(f"{BASE}/api/auth/login", data={"username": user, "password": pwd})
        if res.status_code == 200:
            tokens[user] = res.json()["access_token"]
            print(f"[SUCCESS] Login for {user.upper()} passed.")
        else:
            print(f"[FAIL] Login for {user.upper()} failed: {res.status_code} {res.text}")

    if "operator" not in tokens or "dmgo" not in tokens or "weighbridge" not in tokens:
        print("[ABORT] Cannot continue without core role tokens.")
        return

    # Check 'me' endpoint for each token
    for user, token in tokens.items():
        me_res = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        if me_res.status_code == 200:
            data = me_res.json()
            print(f"  -> Profile for {user}: role={data.get('role')}, quarry_id={data.get('quarry_id')}")
        else:
            print(f"  -> Profile fetch failed for {user}: {me_res.status_code}")

    # 2. Test Dashboard Stats
    print("\n--- Testing Analytics & Dashboard ---")
    dash_res = requests.get(f"{BASE}/api/analytics/dashboard/stats", headers={"Authorization": f"Bearer {tokens['admin']}"})
    print(f"Admin Dashboard Stats: {dash_res.status_code}")
    if dash_res.status_code != 200:
        # Check /api/dashboard/stats
        dash_res2 = requests.get(f"{BASE}/api/dashboard/stats", headers={"Authorization": f"Bearer {tokens['admin']}"})
        print(f"Alternative /api/dashboard/stats: {dash_res2.status_code}")

    # 3. Test Block Creation by Quarry Operator
    print("\n--- Step 1: Quarry Operator Block Registration ---")
    import io
    test_block_id = f"TEST-BLK-{int(requests.get(f'{BASE}/').elapsed.total_seconds() * 1000) % 1000000}"
    dummy_img = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xFF\xD9")
    
    files = {"file": ("test_block.jpg", dummy_img, "image/jpeg")}
    data = {
        "block_id": test_block_id,
        "quarry_id": 1,
        "gps": "15.4889,79.8732",
        "granite_type": "Black Galaxy Granite",
        "block_type": "dressed",
    }
    reg_res = requests.post(
        f"{BASE}/api/blocks",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {tokens['operator']}"}
    )
    print(f"Operator Block Register: {reg_res.status_code}")
    if reg_res.status_code not in [200, 201]:
        print(f"[FAIL] Register error: {reg_res.text}")
        return
    block_data = reg_res.json()
    print(f"Created Block: ID={block_data.get('id')}, Status={block_data.get('status')}")

    # Check Challan endpoint
    challan_res = requests.get(f"{BASE}/api/blocks/{test_block_id}/challan", headers={"Authorization": f"Bearer {tokens['operator']}"})
    print(f"Challan breakdown endpoint: {challan_res.status_code}")
    if challan_res.status_code == 200:
        print(f"  -> Challan details: {challan_res.json()}")

    # 4. Step 2: Operator raises Check Measurement Request
    print("\n--- Step 2: Operator Raises Check Measurement Request ---")
    check_payload = {
        "block_ids": [test_block_id],
        "remarks": "Block dressed and ready for DMGO statutory verification"
    }
    check_res = requests.post(
        f"{BASE}/api/blocks/raise-check-request",
        json=check_payload,
        headers={"Authorization": f"Bearer {tokens['operator']}"}
    )
    print(f"Raise Check Request: {check_res.status_code}, Response: {check_res.json()}")

    # 5. Step 3: DMGO Officer verifies and approves
    print("\n--- Step 3: DMGO Officer Verifies & Approves ---")
    verify_payload = {
        "action": "approve",
        "remarks": "Verified dimensions match standard gangsaw specifications."
    }
    verify_res = requests.post(
        f"{BASE}/api/blocks/{test_block_id}/dmgo-verify",
        json=verify_payload,
        headers={"Authorization": f"Bearer {tokens['dmgo']}"}
    )
    print(f"DMGO Verify & Approve: {verify_res.status_code}")
    if verify_res.status_code == 200:
        print(f"  -> Block Status now: {verify_res.json().get('status')}")
    else:
        print(f"[FAIL] DMGO verify failed: {verify_res.text}")
        return

    # 6. Step 4: DMGO issues e-Transit Pass
    print("\n--- Step 4: DMGO Issues e-Transit Pass ---")
    transit_data = {
        "vehicle_number": "AP27TX9999",
        "driver_name": "Ramu Naidu",
        "destination": "Visakhapatnam Port",
        "validity_hours": 48
    }
    pass_res = requests.post(
        f"{BASE}/api/dispatch/{test_block_id}/issue-pass",
        data=transit_data,
        headers={"Authorization": f"Bearer {tokens['dmgo']}"}
    )
    print(f"DMGO Issue Transit Pass: {pass_res.status_code}")
    if pass_res.status_code == 200:
        pass_data = pass_res.json()
        print(f"  -> Transit Form No: {pass_data.get('transit_form_no')}, e-Permit: {pass_data.get('e_permit_number')}")
    else:
        print(f"[FAIL] Issue pass failed: {pass_res.text}")

    # 7. Step 5: Weighbridge Operator Validates Weight
    print("\n--- Step 5: Weighbridge Operator Validates Weight ---")
    # Fetch block measurement weight
    block_check = requests.get(f"{BASE}/api/blocks/{test_block_id}", headers={"Authorization": f"Bearer {tokens['weighbridge']}"}).json()
    ai_weight = block_check.get("measurement", {}).get("estimated_weight", 15.0) if block_check.get("measurement") else 15.0
    print(f"AI Estimated Weight: {ai_weight} MT")

    # First test: test variance > 8% (flagged)
    heavy_weight = round(ai_weight * 1.15, 2) # 15% difference
    wb_flag_res = requests.post(
        f"{BASE}/api/weighbridge/{test_block_id}",
        data={"actual_weight": heavy_weight},
        headers={"Authorization": f"Bearer {tokens['weighbridge']}"}
    )
    print(f"Weighbridge entry (heavy/flagged): {wb_flag_res.status_code}, Status={wb_flag_res.json().get('status')}")

    # Test Re-weigh with valid weight (within 2% difference)
    good_weight = round(ai_weight * 1.02, 2) # 2% difference
    wb_reweigh_res = requests.put(
        f"{BASE}/api/weighbridge/{test_block_id}/reweigh",
        data={"actual_weight": good_weight, "remarks": "Re-weighed on calibrated scale 2"},
        headers={"Authorization": f"Bearer {tokens['weighbridge']}"}
    )
    print(f"Weighbridge Re-weigh (valid/approved): {wb_reweigh_res.status_code}, Status={wb_reweigh_res.json().get('status')}")

    # 8. Step 6: Operator Confirms Gate Dispatch
    print("\n--- Step 6: Operator Confirms Gate Dispatch ---")
    dispatch_confirm = requests.post(
        f"{BASE}/api/dispatch/{test_block_id}",
        data={
            "vehicle_number": "AP27TX9999",
            "driver_name": "Ramu Naidu",
            "destination": "Visakhapatnam Port"
        },
        headers={"Authorization": f"Bearer {tokens['operator']}"}
    )
    print(f"Operator Confirm Dispatch: {dispatch_confirm.status_code}")
    if dispatch_confirm.status_code == 200:
        print(f"  -> Dispatched successfully! Block status is now: dispatched")
    else:
        print(f"  -> Dispatch response: {dispatch_confirm.text}")

    # 9. Step 7: Road Enforcement Scan & Inspection
    print("\n--- Step 7: Road Enforcement Highway Scan ---")
    enf_scan = requests.get(f"{BASE}/api/enforcement/scan/{test_block_id}", headers={"Authorization": f"Bearer {tokens['enforcement']}"})
    print(f"Enforcement Scan: {enf_scan.status_code}")
    if enf_scan.status_code == 200:
        scan_data = enf_scan.json()
        print(f"  -> Enforcement verified: Permit Valid={scan_data.get('permit_valid')}, Status OK={scan_data.get('status_ok')}")
    else:
        print(f"  -> Enforcement scan failed: {enf_scan.text}")

    # 10. Step 8: Public / Citizen Block Tracking
    print("\n--- Step 8: Public / Citizen Block Tracking ---")
    pub_track = requests.get(f"{BASE}/api/blocks/{test_block_id}/track")
    print(f"Public /track: {pub_track.status_code}")
    if pub_track.status_code == 200:
        print(f"  -> Public track data: Quarry={pub_track.json().get('quarry', {}).get('name')}, Status={pub_track.json().get('status')}")

    # 11. Step 9: Citizen Portal Plans & Calculation
    print("\n--- Step 9: Citizen Portal Plans & Calculation ---")
    calc_res = requests.post(
        f"{BASE}/api/citizen/calculate",
        json={"granite_type": "Black Galaxy Granite", "monthly_tonnage": 10.0, "duration_months": 3}
    )
    print(f"Citizen Royalty Calculation: {calc_res.status_code}")
    if calc_res.status_code == 200:
        print(f"  -> Calculation Result: Total Monthly Amount=Rs.{calc_res.json().get('total_monthly_amount')}")

    print("\n" + "=" * 60)
    print("ALL END-TO-END PIPELINE CHECKS COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    test_workflow()
