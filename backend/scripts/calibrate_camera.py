import cv2
import numpy as np
import glob
import json
import argparse
import os

def calibrate_camera(image_dir, pattern_size, square_size_mm, output_file):
    # termination criteria
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

    # prepare object points, like (0,0,0), (1,0,0), (2,0,0) ....,(6,5,0)
    objp = np.zeros((pattern_size[0] * pattern_size[1], 3), np.float32)
    objp[:, :2] = np.mgrid[0:pattern_size[0], 0:pattern_size[1]].T.reshape(-1, 2)
    objp *= square_size_mm

    # Arrays to store object points and image points from all the images.
    objpoints = [] # 3d point in real world space
    imgpoints = [] # 2d points in image plane.

    images = glob.glob(os.path.join(image_dir, '*.jpg'))
    if not images:
        images = glob.glob(os.path.join(image_dir, '*.png'))
        
    if not images:
        print(f"No images found in {image_dir}")
        return

    gray_shape = None
    success_count = 0

    print(f"Found {len(images)} images. Processing...")

    for fname in images:
        img = cv2.imread(fname)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if gray_shape is None:
            gray_shape = gray.shape[::-1]

        # Find the chess board corners
        ret, corners = cv2.findChessboardCorners(gray, pattern_size, None)

        # If found, add object points, image points (after refining them)
        if ret == True:
            objpoints.append(objp)
            corners2 = cv2.cornerSubPix(gray, corners, (11,11), (-1,-1), criteria)
            imgpoints.append(corners2)
            success_count += 1
            print(f"Success: {fname}")
        else:
            print(f"Failed: {fname}")

    if success_count == 0:
        print("Could not find checkerboard in any of the images.")
        return

    print(f"\nCalibrating with {success_count} images...")
    ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, gray_shape, None, None)

    print(f"RMS Re-projection Error: {ret:.4f}")

    calib_data = {
        "rms": float(ret),
        "K": mtx.tolist(),
        "dist": dist.tolist(),
        "size": [gray_shape[0], gray_shape[1]]
    }

    with open(output_file, 'w') as f:
        json.dump(calib_data, f, indent=4)
        
    print(f"Calibration saved to {output_file}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Calibrate camera using a checkerboard pattern")
    parser.add_argument('--image_dir', type=str, required=True, help="Directory containing checkerboard images")
    parser.add_argument('--pattern_size', type=str, default="9,6", help="Checkerboard inner corners (width, height), e.g., 9,6")
    parser.add_argument('--square_size_mm', type=float, default=25.0, help="Size of a checkerboard square in mm")
    parser.add_argument('--output', type=str, default="../calibration/phone.json", help="Output JSON file name (default is ../calibration/phone.json)")

    args = parser.parse_args()
    pattern_size = tuple(map(int, args.pattern_size.split(',')))
    calibrate_camera(args.image_dir, pattern_size, args.square_size_mm, args.output)
