import cv2
print("OpenCV version:", cv2.__version__)
print("Has aruco:", hasattr(cv2, 'aruco'))
aruco_attrs = [a for a in dir(cv2.aruco) if not a.startswith('_')]
print("ArUco classes with 'ArucoDetector':", [a for a in aruco_attrs if 'Aruco' in a or 'Detector' in a])
print("ArUco dicts:", [a for a in aruco_attrs if 'DICT' in a][:5])
print("DetectorParameters:", 'DetectorParameters' in aruco_attrs)
print("ArucoDetector:", 'ArucoDetector' in aruco_attrs)
try:
    params = cv2.aruco.DetectorParameters()
    print("DetectorParameters() works:", True)
except Exception as e:
    print("DetectorParameters() error:", e)
try:
    det = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), cv2.aruco.DetectorParameters())
    print("ArucoDetector() works:", True)
except Exception as e:
    print("ArucoDetector() error:", e)
