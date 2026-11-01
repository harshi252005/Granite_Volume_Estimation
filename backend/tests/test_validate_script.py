import pytest
import os
import csv
import subprocess
from pathlib import Path

script_path = Path(__file__).resolve().parent.parent / "scripts" / "validate.py"

def test_validate_script_success(tmp_path):
    # Mock some data
    csv_file = tmp_path / "data.csv"
    img_dir = tmp_path / "block1"
    img_dir.mkdir()
    
    # create fake images (script doesn't execute OpenCV itself, it sends them to the API)
    # Actually wait, the script hits the real API, which uses OpenCV to read them.
    # So we need REAL valid ArUco images, else it will skip row due to 422 API error.
    # We can create a synthetic image using cv2.
    import cv2
    import numpy as np
    img = np.zeros((800, 1000, 3), dtype=np.uint8)
    cv2.rectangle(img, (200, 200), (800, 600), (100, 100, 100), -1)
    cv2.rectangle(img, (200, 200), (800, 600), (100, 100, 100), -1)
    dict_aruco = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker_img = cv2.aruco.generateImageMarker(dict_aruco, 0, 200)
    marker_img_color = cv2.cvtColor(marker_img, cv2.COLOR_GRAY2BGR)
    img[250:450, 250:450] = marker_img_color
    
    faces = ["top.jpg", "left.jpg", "right.jpg", "front.jpg", "rear.jpg"]
    for f in faces:
        cv2.imwrite(str(img_dir / f), img)
        
    with open(csv_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["folder_path", "truth_l_cm", "truth_b_cm", "truth_h_cm"])
        writer.writeheader()
        writer.writerow({
            "folder_path": str(img_dir),
            "truth_l_cm": "100",
            "truth_b_cm": "50",
            "truth_h_cm": "50"
        })
        
    import sys
    # Run script
    result = subprocess.run([
        sys.executable, str(script_path),
        "--csv", str(csv_file),
        "--username", "operator",
        "--password", "operator123"
    ], capture_output=True, text=True)
    
    assert "[SUCCESS]" in result.stdout
    assert "Total processed: 1" in result.stdout
    assert "Skipped rows: 0" in result.stdout
    
    res_csv = tmp_path / "data_results.csv"
    assert res_csv.exists()
    
def test_validate_script_missing_folder_and_images(tmp_path):
    csv_file = tmp_path / "data.csv"
    with open(csv_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["folder_path", "truth_l_cm", "truth_b_cm", "truth_h_cm"])
        writer.writeheader()
        writer.writerow({
            "folder_path": str(tmp_path / "non_existent"),
            "truth_l_cm": "100",
            "truth_b_cm": "50",
            "truth_h_cm": "50"
        })
        
    import sys
    result = subprocess.run([
        sys.executable, str(script_path),
        "--csv", str(csv_file),
        "--username", "operator",
        "--password", "operator123"
    ], capture_output=True, text=True)
    
    assert "Folder not found" in result.stdout
    assert "Skipped rows: 1" in result.stdout

def test_validate_script_zero_truth(tmp_path):
    csv_file = tmp_path / "data.csv"
    img_dir = tmp_path / "block2"
    img_dir.mkdir()
    
    import cv2
    import numpy as np
    img = np.zeros((800, 1000, 3), dtype=np.uint8)
    cv2.rectangle(img, (200, 200), (800, 600), (100, 100, 100), -1)
    dict_aruco = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker_img = cv2.aruco.generateImageMarker(dict_aruco, 0, 200)
    marker_img_color = cv2.cvtColor(marker_img, cv2.COLOR_GRAY2BGR)
    img[250:450, 250:450] = marker_img_color
    
    faces = ["top.jpg", "left.jpg", "right.jpg", "front.jpg", "rear.jpg"]
    for f in faces:
        cv2.imwrite(str(img_dir / f), img)
        
    with open(csv_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["folder_path", "truth_l_cm", "truth_b_cm", "truth_h_cm"])
        writer.writeheader()
        writer.writerow({
            "folder_path": str(img_dir),
            "truth_l_cm": "0",  # zero truth
            "truth_b_cm": "-10", # negative truth
            "truth_h_cm": "" # missing truth
        })
        
    import sys
    result = subprocess.run([
        sys.executable, str(script_path),
        "--csv", str(csv_file),
        "--username", "operator",
        "--password", "operator123"
    ], capture_output=True, text=True)
    
    assert "[SUCCESS]" in result.stdout
    assert "Excluded references (zero/missing): 1" in result.stdout
    assert "N/A (No eligible observations)" in result.stdout

