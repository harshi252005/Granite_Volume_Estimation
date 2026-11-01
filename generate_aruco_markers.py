"""
generate_aruco_markers.py
--------------------------
Run this once to generate the printable ArUco markers.
Print each PNG at exactly 100mm × 100mm (10cm × 10cm).
Place one at each corner of the granite block before photographing.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

try:
    import cv2
    from processing.aruco_scale import generate_aruco_marker_image, DEFAULT_MARKER_SIZE_MM
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure opencv-python is installed: pip install opencv-python-headless")
    sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "aruco_markers")
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Generating ArUco markers (DICT_4X4_50)...")
print(f"Print each at exactly {DEFAULT_MARKER_SIZE_MM:.0f}mm × {DEFAULT_MARKER_SIZE_MM:.0f}mm")
print(f"Output directory: {OUTPUT_DIR}")
print()

# Generate markers 0-3 (one for each corner of the block)
for marker_id in range(4):
    out_path = os.path.join(OUTPUT_DIR, f"aruco_marker_{marker_id}.png")
    generate_aruco_marker_image(marker_id, out_path, size_px=400)
    print(f"  ✓ Marker {marker_id} → {out_path}")

print()
print("Done. Place these 4 markers around the granite block before photographing.")
print(f"Important: Print at exactly {DEFAULT_MARKER_SIZE_MM:.0f}mm × {DEFAULT_MARKER_SIZE_MM:.0f}mm")
print("(You can change marker size in backend/processing/aruco_scale.py → DEFAULT_MARKER_SIZE_MM)")
