# pyrefly: ignore [missing-import]
import cv2
import numpy as np
import os

def create_printable_marker(marker_id=0, marker_size_mm=200, output_path="aruco_marker.png"):
    # Generate 4x4 marker
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker_size_px = 1200
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, marker_id, marker_size_px)
    
    # Create white canvas with border and instructions (A4 style)
    canvas_w = 1600
    canvas_h = 2000
    canvas = np.ones((canvas_h, canvas_w), dtype=np.uint8) * 255
    
    # Place marker in center
    start_x = (canvas_w - marker_size_px) // 2
    start_y = 350
    canvas[start_y:start_y + marker_size_px, start_x:start_x + marker_size_px] = marker_img
    
    # Convert to BGR for clean colored annotations
    canvas_bgr = cv2.cvtColor(canvas, cv2.COLOR_GRAY2BGR)
    
    # Draw reference border around marker
    cv2.rectangle(canvas_bgr, (start_x - 10, start_y - 10), 
                  (start_x + marker_size_px + 10, start_y + marker_size_px + 10), 
                  (0, 102, 204), 4)
    
    # Top Header
    cv2.putText(canvas_bgr, "ANDHRA PRADESH MINES & GEOLOGY DEPARTMENT", 
                (120, 120), cv2.FONT_HERSHEY_DUPLEX, 1.3, (15, 23, 42), 3)
    cv2.putText(canvas_bgr, "SMART GRANITE - STATUTORY 3D PHOTOGRAMMETRIC CALIBRATION MARKER", 
                (100, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (180, 83, 9), 2)
    
    # Subtitle with physical dimension specification
    cv2.putText(canvas_bgr, f"PHYSICAL PRINT SIZE: {marker_size_mm} mm x {marker_size_mm} mm (20 cm x 20 cm)", 
                (260, 260), cv2.FONT_HERSHEY_DUPLEX, 1.0, (0, 150, 0), 2)
    cv2.putText(canvas_bgr, f"Dictionary: DICT_4X4_50 | Marker ID: {marker_id}", 
                (500, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (70, 70, 70), 2)
    
    # Footer guidelines for quarry workers
    cv2.putText(canvas_bgr, "INSTRUCTIONS FOR QUARRY OPERATOR / DMGO INSPECTION:", 
                (140, 1650), cv2.FONT_HERSHEY_DUPLEX, 0.9, (15, 23, 42), 2)
    cv2.putText(canvas_bgr, "1. Print this sheet at 100% scale (Do NOT select 'Fit to page').", 
                (140, 1710), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (50, 50, 50), 2)
    cv2.putText(canvas_bgr, "2. Measure inner black square with a ruler: it MUST equal exactly 200 mm (20 cm).", 
                (140, 1760), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (180, 0, 0), 2)
    cv2.putText(canvas_bgr, "3. Place or tape this sheet onto the granite block face before taking photos.", 
                (140, 1810), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (50, 50, 50), 2)
    cv2.putText(canvas_bgr, "4. The AI system will detect this marker and calculate volume with mm precision.", 
                (140, 1860), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 120, 0), 2)
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, canvas_bgr)
    print(f"Generated printable marker at: {output_path}")

if __name__ == "__main__":
    # Generate for frontend public folder
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "aruco_marker_200mm.png")
    create_printable_marker(0, 200, frontend_path)
    
    # Also generate in backend uploads
    backend_path = os.path.join(os.path.dirname(__file__), "..", "backend", "uploads", "aruco_marker_200mm.png")
    create_printable_marker(0, 200, backend_path)
