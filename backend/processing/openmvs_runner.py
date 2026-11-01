"""
openmvs_runner.py
-----------------
Python wrapper around the OpenMVS command-line tools.
Takes the COLMAP dense output and produces a dense 3D mesh.

Pipeline:
  1. InterfaceCOLMAP   → convert COLMAP format to OpenMVS scene
  2. DensifyPointCloud → generate dense point cloud from MVS
  3. ReconstructMesh   → surface mesh from dense cloud
  4. RefineMesh        → improve mesh quality

Prerequisites:
  - OpenMVS installed and binaries on PATH (or set via env vars below).
    Windows: https://github.com/cdcseacave/openMVS/releases
    Or set OPENMVS_BIN_DIR environment variable to the folder containing
    the OpenMVS executables.
"""
import os
import subprocess
import shutil
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Allow overriding the bin directory via env var
_BIN = os.environ.get("OPENMVS_BIN_DIR", "")


def _exe(name: str) -> str:
    """Return full path to an OpenMVS executable."""
    bin_dir = os.environ.get("OPENMVS_BIN_DIR", _BIN)
    if bin_dir:
        candidate = os.path.join(bin_dir, name)
        if os.path.exists(candidate):
            return candidate
        if os.path.exists(candidate + ".exe"):
            return candidate + ".exe"
        return candidate
    return name   # assume on PATH



def _run(cmd: list, cwd: str = None) -> subprocess.CompletedProcess:
    logger.info("Running: %s", " ".join(str(c) for c in cmd))
    result = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        logger.error("OpenMVS error:\n%s", result.stdout[-3000:])
        raise RuntimeError(
            f"OpenMVS step failed (exit {result.returncode}). "
            f"Last output:\n{result.stdout[-1000:]}"
        )
    return result


def run_openmvs_pipeline(
    dense_dir: str,
    output_dir: str,
) -> Dict[str, Any]:
    """
    Run OpenMVS dense reconstruction on COLMAP undistorted output.

    Args:
        dense_dir:  Path to COLMAP dense/ directory (contains images/ + sparse/).
        output_dir: Where to write the final mesh files.

    Returns:
        {
            "success":    bool,
            "mesh_path":  str,   # path to block_mesh.ply
            "message":    str
        }
    """
    os.makedirs(output_dir, exist_ok=True)

    scene_file = os.path.join(output_dir, "scene.mvs")
    dense_cloud = os.path.join(output_dir, "scene_dense.mvs")
    mesh_file   = os.path.join(output_dir, "scene_mesh.ply")
    refined_ply = os.path.join(output_dir, "block_mesh.ply")

    # ── Step 1: Convert COLMAP → OpenMVS ──────────────────────────────────────
    _run([
        _exe("InterfaceCOLMAP"),
        "-i", dense_dir,
        "-o", scene_file,
        "--image-folder", os.path.join(dense_dir, "images"),
    ])

    # ── Step 2: Dense point cloud ──────────────────────────────────────────────
    _run([
        _exe("DensifyPointCloud"),
        "-i", scene_file,
        "-o", dense_cloud,
        "--resolution-level", "1",   # 0=full, 1=half, 2=quarter
    ])

    # ── Step 3: Mesh reconstruction ────────────────────────────────────────────
    _run([
        _exe("ReconstructMesh"),
        "-i", dense_cloud,
        "-o", mesh_file,
    ])

    # ── Step 4: Mesh refinement ────────────────────────────────────────────────
    _run([
        _exe("RefineMesh"),
        "-i", mesh_file,
        "--mesh", mesh_file,
        "-o", refined_ply,
    ])

    if not os.path.exists(refined_ply):
        raise RuntimeError(
            f"OpenMVS mesh not produced at expected path: {refined_ply}"
        )

    return {
        "success":   True,
        "mesh_path": refined_ply,
        "message":   f"Dense mesh generated: {refined_ply}",
    }


def is_openmvs_available() -> bool:
    """Return True if InterfaceCOLMAP binary is available."""
    target = _exe("InterfaceCOLMAP")
    return os.path.exists(target) or shutil.which(target) is not None

