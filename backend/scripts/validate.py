import csv
import sys
import os
import argparse
import json
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import AuditLog

def main():
    parser = argparse.ArgumentParser(description="Batch Validation and Assessment Audit Verification")
    parser.add_argument("--csv", required=True, help="Path to input CSV file")
    parser.add_argument("--username", required=True, help="Operator username for authentication")
    parser.add_argument("--password", required=True, help="Operator password for authentication")
    args = parser.parse_args()

    client = TestClient(app)

    # Login
    resp = client.post("/api/auth/login", data={"username": args.username, "password": args.password})
    if resp.status_code != 200:
        print(f"Authentication failed: {resp.text}")
        sys.exit(1)
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"CSV file {csv_path} not found.")
        sys.exit(1)

    results = []
    face_names = ["top", "left", "right", "front", "rear"]

    # Metrics accumulators
    err_l = []
    err_b = []
    err_h = []
    err_v = []
    
    skipped_count = 0
    excluded_refs = 0

    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            folder_path = row.get("folder_path")
            truth_l = row.get("truth_l_cm")
            truth_b = row.get("truth_b_cm")
            truth_h = row.get("truth_h_cm")
            camera = row.get("camera", "phone")
            marker_mm = row.get("marker_mm", "100.0")

            if not folder_path or not os.path.isdir(folder_path):
                print(f"[SKIPPED] {folder_path}: Folder not found or invalid.")
                skipped_count += 1
                continue
            
            # Find images
            files_to_upload = {}
            missing_faces = []
            
            # Basic discovery: Look for files containing face name
            folder_files = os.listdir(folder_path)
            for face in face_names:
                found = False
                for fname in folder_files:
                    if face in fname.lower() and fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                        file_path = os.path.join(folder_path, fname)
                        files_to_upload[face] = (fname, open(file_path, 'rb'), 'image/jpeg')
                        found = True
                        break
                if not found:
                    missing_faces.append(face)
            
            if missing_faces:
                print(f"[SKIPPED] {folder_path}: Missing faces {missing_faces}")
                skipped_count += 1
                # Close already opened files
                for _, f_obj, _ in files_to_upload.values():
                    f_obj.close()
                continue
            
            # Convert truths
            def parse_truth(val):
                try:
                    v = float(val)
                    if v <= 0: return None
                    return v
                except (ValueError, TypeError):
                    return None
            
            tl = parse_truth(truth_l)
            tb = parse_truth(truth_b)
            th = parse_truth(truth_h)

            if tl is None or tb is None or th is None:
                excluded_refs += 1

            form_data = {
                "camera": camera,
                "marker_mm": marker_mm
            }
            if tl: form_data["truth_length_cm"] = str(tl)
            if tb: form_data["truth_breadth_cm"] = str(tb)
            if th: form_data["truth_height_cm"] = str(th)

            # Hit API
            res = client.post("/assessment/validate", files=files_to_upload, data=form_data, headers=headers)
            
            for _, f_obj, _ in files_to_upload.values():
                f_obj.close()

            if res.status_code != 200:
                print(f"[SKIPPED] {folder_path}: API Error {res.text}")
                skipped_count += 1
                continue

            data = res.json()
            
            if "error_percentage" in data:
                ep = data["error_percentage"]
                if tl and "length" in ep: err_l.append(ep["length"])
                if tb and "breadth" in ep: err_b.append(ep["breadth"])
                if th and "height" in ep: err_h.append(ep["height"])
                if tl and tb and th and "volume" in ep: err_v.append(ep["volume"])
            
            row_result = {
                "folder": folder_path,
                "calc_l": data["calculated"]["length_cm"],
                "calc_b": data["calculated"]["breadth_cm"],
                "calc_h": data["calculated"]["height_cm"],
                "calc_v": data["calculated"]["volume_m3"]
            }
            if "error_absolute_cm" in data:
                ea = data["error_absolute_cm"]
                row_result.update({
                    "err_abs_l": ea.get("length", "N/A"),
                    "err_abs_b": ea.get("breadth", "N/A"),
                    "err_abs_h": ea.get("height", "N/A")
                })
            results.append(row_result)
            print(f"[SUCCESS] {folder_path}: Processed.")

    print("\n--- SUMMARY REPORT ---")
    print(f"Total processed: {len(results)}")
    print(f"Skipped rows: {skipped_count}")
    print(f"Excluded references (zero/missing): {excluded_refs}")

    def report_dim(name, arr):
        if not arr: return "N/A (No eligible observations)"
        mape = sum(arr) / len(arr)
        worst = max(arr)
        return f"MAPE: {mape:.2f}%, Worst-case: {worst:.2f}% (n={len(arr)})"

    print(f"Length -> {report_dim('Length', err_l)}")
    print(f"Breadth -> {report_dim('Breadth', err_b)}")
    print(f"Height -> {report_dim('Height', err_h)}")
    print(f"Volume -> {report_dim('Volume', err_v)}")

    out_csv = csv_path.with_name(f"{csv_path.stem}_results.csv")
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        if results:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
    
    print(f"Per-block results saved to {out_csv}")

if __name__ == '__main__':
    main()
