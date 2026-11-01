"""
colmap_runner.py
----------------
Python wrapper around the COLMAP command-line interface.
Runs the full Structure-from-Motion pipeline:
  1. Feature extraction  (SIFT keypoints per image)
  2. Feature matching    (exhaustive for small sets, sequential for large)
  3. Incremental mapper  (camera poses + sparse 3D point cloud)
  4. Image undistorter   (prepares output for OpenMVS)

Prerequisites:
  - COLMAP installed and `colmap` binary on PATH
    Windows: download from https://demuc.de/colmap/
    or set COLMAP_EXE environment variable to the full path.
"""
import os
import subprocess
import shutil
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Allow overriding the binary path via env var
COLMAP_EXE = os.environ.get("COLMAP_EXE", "colmap")


def _run(cmd: list, cwd: str = None) -> subprocess.CompletedProcess:
    """Run a shell command and raise on non-zero exit."""
    logger.info("Running: %s", " ".join(str(c) for c in cmd))
    result = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        logger.error("COLMAP error output:\n%s", result.stdout[-3000:])
        raise RuntimeError(
            f"COLMAP step failed (exit {result.returncode}). "
            f"Last output:\n{result.stdout[-1000:]}"
        )
    return result


def run_colmap_pipeline(
    image_dir: str,
    workspace_dir: str,
    use_gpu: bool = True,
    matcher: str = "exhaustive",   # "exhaustive" or "sequential"
) -> Dict[str, Any]:
    """
    Run the full COLMAP SfM pipeline on a directory of images.

    Args:
        image_dir:      Directory containing the input JPG/PNG images.
        workspace_dir:  Output directory for COLMAP database + sparse model.
        use_gpu:        Use GPU for feature extraction/matching (faster).
        matcher:        "exhaustive" for <100 images, "sequential" for video.

    Returns:
        {
            "success":       bool,
            "sparse_dir":    str,   # path to sparse/0/ (camera poses + points3D)
            "dense_dir":     str,   # path to dense/ (undistorted images for OpenMVS)
            "num_images":    int,
            "num_points3d":  int,
            "message":       str
        }
    """
    os.makedirs(workspace_dir, exist_ok=True)

    db_path    = os.path.join(workspace_dir, "database.db")
    sparse_dir = os.path.join(workspace_dir, "sparse")
    dense_dir  = os.path.join(workspace_dir, "dense")

    os.makedirs(sparse_dir, exist_ok=True)
    os.makedirs(dense_dir,  exist_ok=True)

    gpu_flag = "1" if use_gpu else "0"

    # ── Step 1: Feature extraction ─────────────────────────────────────────────
    _run([
        COLMAP_EXE, "feature_extractor",
        "--database_path", db_path,
        "--image_path",    image_dir,
        "--ImageReader.single_camera", "1",
        "--SiftExtraction.use_gpu",    gpu_flag,
    ])

    # ── Step 2: Feature matching ───────────────────────────────────────────────
    if matcher == "sequential":
        _run([
            COLMAP_EXE, "sequential_matcher",
            "--database_path", db_path,
            "--SiftMatching.use_gpu", gpu_flag,
        ])
    else:
        _run([
            COLMAP_EXE, "exhaustive_matcher",
            "--database_path", db_path,
            "--SiftMatching.use_gpu", gpu_flag,
        ])

    # ── Step 3: Incremental mapper (sparse reconstruction) ────────────────────
    _run([
        COLMAP_EXE, "mapper",
        "--database_path", db_path,
        "--image_path",    image_dir,
        "--output_path",   sparse_dir,
    ])

    # ── Step 4: Image undistorter (for OpenMVS) ────────────────────────────────
    sparse_model = os.path.join(sparse_dir, "0")
    if not os.path.isdir(sparse_model):
        raise RuntimeError(
            "COLMAP mapper produced no reconstruction. "
            "Ensure images have sufficient overlap and texture."
        )

    _run([
        COLMAP_EXE, "image_undistorter",
        "--image_path",      image_dir,
        "--input_path",      sparse_model,
        "--output_path",     dense_dir,
        "--output_type",     "COLMAP",
    ])

    # ── Count output ───────────────────────────────────────────────────────────
    points3d_path = os.path.join(sparse_model, "points3D.bin")
    num_points3d  = 0
    if os.path.exists(points3d_path):
        num_points3d = os.path.getsize(points3d_path) // 43  # approx

    num_images = len([
        f for f in os.listdir(image_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ])

    return {
        "success":      True,
        "sparse_dir":   sparse_model,
        "dense_dir":    dense_dir,
        "num_images":   num_images,
        "num_points3d": num_points3d,
        "message":      (
            f"COLMAP SfM complete. "
            f"{num_images} images processed, "
            f"~{num_points3d} sparse 3D points."
        ),
    }


def is_colmap_available() -> bool:
    """Return True if the COLMAP binary is on PATH or exists at COLMAP_EXE."""
    exe = os.environ.get("COLMAP_EXE", COLMAP_EXE)
    return os.path.exists(exe) or shutil.which(exe) is not None

