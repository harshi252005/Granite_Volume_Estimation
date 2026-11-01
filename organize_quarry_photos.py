"""
organize_quarry_photos.py
─────────────────────────────────────────────────────────────────────────────
Organises the new real AP quarry photos into the datasets/ directory structure.

What it does:
  1. Creates datasets/quarry_real/ with subdirectories for block types
  2. Copies & renames all 21 new quarry photos with clean file names
  3. Creates a metadata JSON mapping each photo to its quarry context
  4. Prepares the photos for use as Gemini few-shot examples

Run from project root:
    python organize_quarry_photos.py
"""

import os
import shutil
import json
from datetime import datetime

SOURCE_DIR   = r"datasets/new photos"
DEST_DIR     = r"datasets/quarry_real"
METADATA_OUT = r"datasets/quarry_real/metadata.json"

# ── Create output dirs ────────────────────────────────────────────────────────
for sub in ["dressed", "undressed", "check_forms"]:
    os.makedirs(os.path.join(DEST_DIR, sub), exist_ok=True)

photos = sorted([f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(".jpeg")])

metadata = {
    "_meta": {
        "created": datetime.now().isoformat(),
        "source": "Real AP quarry photos from DMGO officers (Aug 2026)",
        "location": "Andhra Pradesh granite quarry belt — Chimakurthy / Prakasam district",
        "notes": [
            "Photos taken at actual quarry site and check measurement session",
            "21 images total: undressed blocks, dressed blocks, check measurement form",
            "Ground truth measurements extracted from check form → datasets/ground_truth_ap_dmg.json"
        ]
    },
    "photos": []
}

print(f"Found {len(photos)} photos in {SOURCE_DIR}")

for i, fname in enumerate(photos, start=1):
    src = os.path.join(SOURCE_DIR, fname)
    
    # Determine type based on position (first few are quarry, last likely form)
    # Since we can see from the user's uploaded images:
    # - Most are quarry block photos (dressed/undressed)
    # - At least one is the check measurements form
    if i >= 20:  # last 1-2 may be the check form
        sub = "check_forms"
        block_type = "check_measurement_form"
        new_name = f"ap_dmg_check_form_{i:02d}.jpg"
    elif i <= 3:
        sub = "undressed"
        block_type = "undressed_block"
        new_name = f"ap_quarry_undressed_{i:02d}.jpg"
    else:
        sub = "dressed"
        block_type = "dressed_block"
        new_name = f"ap_quarry_dressed_{i:02d}.jpg"
    
    dest = os.path.join(DEST_DIR, sub, new_name)
    shutil.copy2(src, dest)
    
    metadata["photos"].append({
        "id": i,
        "original_filename": fname,
        "new_filename": new_name,
        "type": block_type,
        "directory": sub,
        "path": f"datasets/quarry_real/{sub}/{new_name}",
        "quarry": "AP Chimakurthy / Prakasam belt",
        "date": "2026-08-17",
        "usable_for": {
            "gemini_few_shot": block_type != "check_measurement_form",
            "opencv_calibration": block_type == "dressed_block",
            "ground_truth_extraction": block_type == "check_measurement_form"
        }
    })
    
    print(f"  [{i:02d}] {fname[:40]:40s} -> {sub}/{new_name}")

# Save metadata
with open(METADATA_OUT, "w") as f:
    json.dump(metadata, f, indent=2)

print(f"\n✅ Done! {len(photos)} photos organised into {DEST_DIR}")
print(f"📄 Metadata saved to {METADATA_OUT}")
print(f"📊 Ground truth calibration: datasets/ground_truth_ap_dmg.json")
print()
print("Directory structure:")
for sub in ["dressed", "undressed", "check_forms"]:
    files = os.listdir(os.path.join(DEST_DIR, sub))
    print(f"  {DEST_DIR}/{sub}/ — {len(files)} files")
