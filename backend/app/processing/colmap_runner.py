import subprocess
import shutil
import os
import logging

logger = logging.getLogger(__name__)

def is_colmap_available() -> bool:
    """Check if colmap executable is available."""
    colmap_path = os.environ.get("COLMAP_EXE", "colmap")
    return shutil.which(colmap_path) is not None

def run_colmap_pipeline(img_dir: str, colmap_out_dir: str) -> dict:
    """
    Run the COLMAP automatic reconstructor.
    
    img_dir: Path to directory containing images.
    colmap_out_dir: Path to workspace directory where colmap will write outputs.
    """
    if not is_colmap_available():
        raise RuntimeError("COLMAP executable not found.")

    colmap_path = os.environ.get("COLMAP_EXE", "colmap")
    
    # We will use the workspace path as the base directory
    workspace_dir = colmap_out_dir
    os.makedirs(workspace_dir, exist_ok=True)
    
    cmd = [
        colmap_path, "automatic_reconstructor",
        "--workspace_path", workspace_dir,
        "--image_path", img_dir,
        "--dense", "1"
    ]
    
    logger.info(f"Running COLMAP: {' '.join(cmd)}")
    
    try:
        # Run COLMAP and capture output
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        if result.returncode != 0:
            logger.error(f"COLMAP failed with exit code {result.returncode}:\n{result.stderr}")
            return {
                "success": False,
                "message": f"COLMAP reconstruction failed with exit code {result.returncode}.",
                "error": result.stderr
            }
            
        fused_ply = os.path.join(workspace_dir, "dense", "0", "fused.ply")
        if not os.path.exists(fused_ply):
            return {
                "success": False,
                "message": "COLMAP succeeded but fused.ply was not generated. Check image overlap.",
                "error": "fused.ply missing"
            }
            
        return {
            "success": True,
            "message": "COLMAP reconstruction successful.",
            "dense_dir": os.path.join(workspace_dir, "dense", "0"),
            "fused_ply": fused_ply
        }
        
    except Exception as e:
        logger.error(f"Failed to execute COLMAP: {e}")
        return {
            "success": False,
            "message": f"Execution error: {str(e)}",
            "error": str(e)
        }
