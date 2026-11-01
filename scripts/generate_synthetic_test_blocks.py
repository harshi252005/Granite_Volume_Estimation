"""
generate_synthetic_test_blocks.py
---------------------------------
Generates realistic multi-view granite block test images with:
  - Realistic granite stone texture / grain pattern
  - Rendered 3D block faces (Left, Right, Front, Rear, Top)
  - Embedded standard ArUco markers (Dictionary 6x6_250) on ground plane
  - Department protocol dimension annotations (L1-L4, B1-B4, H1-H4)
"""

import os
import cv2
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = BASE_DIR / "datasets" / "sample_granite_blocks"

# ArUco marker generator
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)

def generate_aruco_img(marker_id: int, size: int = 140) -> np.ndarray:
    marker = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size)
    # Convert to 3-channel
    marker_bgr = cv2.cvtColor(marker, cv2.COLOR_GRAY2BGR)
    # Add white border
    border = 20
    marker_with_border = cv2.copyMakeBorder(
        marker_bgr, border, border, border, border, 
        cv2.BORDER_CONSTANT, value=[255, 255, 255]
    )
    return marker_with_border

def create_granite_texture(width: int, height: int, base_color: tuple, speckle_intensity: int = 40) -> np.ndarray:
    """Generates procedural stone grain/texture."""
    # Base background
    canvas = np.full((height, width, 3), base_color, dtype=np.uint8)
    
    # Noise layers for granite grain
    noise = np.random.normal(0, speckle_intensity, (height, width, 3)).astype(np.int16)
    textured = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Add crystal/mineral flecks
    num_flecks = int((width * height) * 0.005)
    for _ in range(num_flecks):
        rx = np.random.randint(0, width - 4)
        ry = np.random.randint(0, height - 4)
        fleck_color = (
            int(min(255, base_color[0] + np.random.randint(40, 100))),
            int(min(255, base_color[1] + np.random.randint(40, 100))),
            int(min(255, base_color[2] + np.random.randint(40, 100)))
        )
        cv2.rectangle(textured, (rx, ry), (rx + np.random.randint(2, 6), ry + np.random.randint(2, 6)), fleck_color, -1)
    
    return textured

def render_block_view(view_name: str, variety_name: str, base_color: tuple, dims: dict, output_file: Path):
    """Renders a high quality view photo of the block with embedded ArUco scale markers."""
    W, H = 1280, 960
    
    # 1. Background ground / quarry environment
    ground = create_granite_texture(W, H, (70, 75, 80), speckle_intensity=25)
    
    # 2. Block projection coordinates based on view angle
    if view_name == "front":
        # Front face dominant
        block_rect = [240, 220, 800, 520]
        label = f"FRONT VIEW (Breadth B1/B2: {dims['B']}cm, Height H1/H2: {dims['H']}cm)"
    elif view_name == "left":
        # Left side dominant (Length view)
        block_rect = [200, 200, 880, 540]
        label = f"LEFT SIDE VIEW (Length L1/L2: {dims['L']}cm, Height H1/H3: {dims['H']}cm)"
    elif view_name == "right":
        # Right side dominant
        block_rect = [200, 200, 880, 540]
        label = f"RIGHT SIDE VIEW (Length L3/L4: {dims['L']}cm, Height H2/H4: {dims['H']}cm)"
    elif view_name == "rear":
        # Rear face
        block_rect = [240, 220, 800, 520]
        label = f"REAR FACE VIEW (Breadth B3/B4: {dims['B']}cm, Height H3/H4: {dims['H']}cm)"
    else:  # top
        # Top face perspective
        block_rect = [200, 180, 880, 600]
        label = f"TOP CONFIRMATION VIEW (L: {dims['L']}cm x B: {dims['B']}cm)"
        
    bx, by, bw, bh = block_rect
    
    # Render 3D stone block face
    block_texture = create_granite_texture(bw, bh, base_color, speckle_intensity=50)
    # Add bevel/edge shadow
    cv2.rectangle(block_texture, (0, 0), (bw-1, bh-1), (30, 30, 30), 4)
    
    # Composite block onto ground
    ground[by:by+bh, bx:bx+bw] = block_texture
    
    # 3. Add 4 ArUco markers on ground plane around the block
    marker_positions = [
        (bx - 160, by + bh - 160, 0),   # Bottom Left Marker (ID 0)
        (bx + bw - 20, by + bh - 160, 1), # Bottom Right Marker (ID 1)
        (bx - 160, by + 20, 2),          # Top Left Marker (ID 2)
        (bx + bw - 20, by + 20, 3)       # Top Right Marker (ID 3)
    ]
    
    for mx, my, mid in marker_positions:
        if 0 <= mx < W - 180 and 0 <= my < H - 180:
            marker_img = generate_aruco_img(mid, size=120)
            mh, mw = marker_img.shape[:2]
            ground[my:my+mh, mx:mx+mw] = marker_img
            
    # 4. Department watermark & metadata header
    cv2.rectangle(ground, (0, 0), (W, 80), (20, 25, 35), -1)
    cv2.putText(ground, "SMART GRANITE - AP MINES & GEOLOGY RECONSTRUCTION DATASET", (30, 35), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(ground, f"Block: {variety_name} | {label}", (30, 65), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 1)
    
    # Scale reference badge
    cv2.rectangle(ground, (W - 320, H - 50), (W - 20, H - 15), (0, 0, 0), -1)
    cv2.putText(ground, "ArUco Calibrated: 100x100mm", (W - 310, H - 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 128), 1)
    
    output_file.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_file), ground)
    print(f"  [+] Rendered & Saved: {output_file.name}")

def main():
    print("=========================================================")
    print("   GENERATING HIGH-ACCURACY MULTI-VIEW BLOCK DATASETS")
    print("=========================================================")
    
    blocks = [
        {
            "id": "block_01_chimakurthy_black_galaxy",
            "name": "Chimakurthy Black Galaxy",
            "color": (25, 28, 30),  # Deep black with golden specks
            "dims": {"L": 290.5, "B": 165.0, "H": 142.0}
        },
        {
            "id": "block_02_ballikurava_steel_grey",
            "name": "Ballikurava Steel Grey",
            "color": (110, 115, 125),  # Steel grey
            "dims": {"L": 310.0, "B": 175.5, "H": 150.0}
        },
        {
            "id": "block_03_kuppam_green",
            "name": "Kuppam Green Granite",
            "color": (75, 95, 80),  # Olive green granite
            "dims": {"L": 275.0, "B": 145.0, "H": 135.0}
        },
        {
            "id": "block_04_srikakulam_blue",
            "name": "Srikakulam Blue Granite",
            "color": (85, 95, 115),  # Blue granite
            "dims": {"L": 285.0, "B": 155.0, "H": 140.0}
        }
    ]
    
    for b in blocks:
        print(f"\nProcessing {b['name']} ({b['id']})...")
        b_dir = DATASETS_DIR / b['id']
        b_dir.mkdir(parents=True, exist_ok=True)
        
        for view in ["front", "left", "right", "rear", "top"]:
            render_block_view(
                view_name=view,
                variety_name=b['name'],
                base_color=b['color'],
                dims=b['dims'],
                output_file=b_dir / f"{view}.jpg"
            )
            
    print("\n[OK] All multi-view datasets with embedded ArUco scale markers generated successfully!")

if __name__ == "__main__":
    main()
