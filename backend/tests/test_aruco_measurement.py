import sys
import os
import cv2
import numpy as np
import pytest

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.processing.aruco_scale import find_marker, plane_homography, marker_side_px, ARUCO_DICT
from app.processing.segment import segment_block
from app.processing.dimensions import measure, volume_mm3, quad_px, edges_mm

def create_synthetic_image(marker_id=0, marker_size_px=200, block_w=600, block_h=400):
    # Create black background
    img = np.zeros((800, 1000, 3), dtype=np.uint8)
    
    # Draw a "block" (a gray rectangle)
    cv2.rectangle(img, (200, 200), (200 + block_w, 200 + block_h), (100, 100, 100), -1)
    
    # Draw ArUco marker
    dict_aruco = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)
    marker_img = cv2.aruco.generateImageMarker(dict_aruco, marker_id, marker_size_px)
    marker_img_color = cv2.cvtColor(marker_img, cv2.COLOR_GRAY2BGR)
    
    # Place marker on the block
    img[250:250+marker_size_px, 250:250+marker_size_px] = marker_img_color
    
    return img

def test_marker_detection():
    img = create_synthetic_image()
    corners = find_marker(img)
    side_px = marker_side_px(corners)
    
    # side should be around 200 px
    assert abs(side_px - 200) < 5

def test_missing_marker():
    img = np.zeros((800, 1000, 3), dtype=np.uint8)
    cv2.rectangle(img, (200, 200), (800, 600), (100, 100, 100), -1)
    
    with pytest.raises(ValueError, match="ArUco marker not found"):
        find_marker(img)

def test_segmentation():
    img = create_synthetic_image()
    corners = find_marker(img)
    mask = segment_block(img, corners)
    
    # The block is 600x400 = 240000 px, minus marker area if poly was excluded, but mask is 255 where block is.
    area = np.count_nonzero(mask)
    assert area > 200000

def test_segmentation_failure():
    # noisy small image to avoid GrabCut hanging on solid uniform colors
    img = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    # fake corners
    corners = np.array([[[0,0], [10,0], [10,10], [0,10]]])
    with pytest.raises(ValueError, match="block not found by grabcut"):
        segment_block(img, corners)

def test_dimension_calculation():
    marker_size_mm = 100.0
    # True scale: 200 px = 100 mm -> 1 px = 0.5 mm
    # Block is 600 px wide -> 300 mm
    # Block is 400 px high -> 200 mm
    
    img = create_synthetic_image(marker_size_px=200, block_w=600, block_h=400)
    corners = find_marker(img)
    mask = segment_block(img, corners)
    hom = plane_homography(corners, marker_size_mm)
    
    q_px = quad_px(mask)
    edges = edges_mm(q_px, hom)
    
    assert abs(edges['top'] - 300) < 15
    assert abs(edges['left'] - 200) < 15

def test_measure_pipeline():
    marker_size_mm = 100.0
    
    # To avoid warnings, let's create a perfect block representation:
    # 3000x1500x1500 mm block (Length=3000, Breadth=1500, Height=1500)
    # So top is 3000x1500
    # front/rear is 3000x1500
    # left/right is 1500x1500
    
    img_top = create_synthetic_image(block_w=600, block_h=300) # 3000x1500 (1 px = 5 mm, so marker 200px = 1000mm)
    img_front = create_synthetic_image(block_w=600, block_h=300) # 3000x1500
    img_side = create_synthetic_image(block_w=300, block_h=300) # 1500x1500
    
    # But wait, marker_size_mm = 100.0. 
    # If marker is 200px = 100mm -> 1px = 0.5mm.
    # Block 600x300px -> 300x150mm.
    
    faces = {}
    for name, img in [('top', img_top), ('front', img_front), ('rear', img_front), ('left', img_side), ('right', img_side)]:
        corners = find_marker(img)
        mask = segment_block(img, corners)
        hom = plane_homography(corners, marker_size_mm)
        faces[name] = (mask, hom)
    
    L, B, Hh, warns = measure(faces)
    
    # Length (from top and front/rear horizontal edges) = 300 mm
    for l in L:
        assert abs(l - 300) < 15
        
    # Breadth (from top vertical edges and left/right horizontal edges) = 150 mm
    for b in B:
        assert abs(b - 150) < 15
        
    # Height (from front/rear vertical edges) = 150 mm
    for h in Hh:
        assert abs(h - 150) < 15

    assert len(warns) == 0

if __name__ == '__main__':
    pytest.main([__file__, "-v"])
