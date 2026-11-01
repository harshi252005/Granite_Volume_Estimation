import os
import sys
import urllib.request
import zipfile
from pathlib import Path

try:
    import py7zr
    from tqdm import tqdm
except ImportError:
    print("Please install py7zr and tqdm: pip install py7zr tqdm")
    sys.exit(1)

TOOLS_DIR = Path(__file__).parent / "backend_tools"
TOOLS_DIR.mkdir(exist_ok=True)

COLMAP_URL = "https://github.com/colmap/colmap/releases/download/4.1.1/colmap-x64-windows-cuda.zip"
OPENMVS_URL = "https://github.com/cdcseacave/openMVS/releases/download/v2.4.0/OpenMVS_Windows_x64_CUDA.7z"

class DownloadProgressBar(tqdm):
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)

def download_url(url, output_path):
    print(f"Downloading {os.path.basename(output_path)}...")
    with DownloadProgressBar(unit='B', unit_scale=True, miniters=1, desc=url.split('/')[-1]) as t:
        urllib.request.urlretrieve(url, filename=output_path, reporthook=t.update_to)

def extract_archive(archive_path, extract_dir):
    print(f"Extracting {os.path.basename(archive_path)} to {extract_dir}...")
    extract_dir.mkdir(exist_ok=True)
    if str(archive_path).endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    elif str(archive_path).endswith('.7z'):
        with py7zr.SevenZipFile(archive_path, mode='r') as z:
            z.extractall(path=extract_dir)
    else:
        print("Unsupported archive format.")

def main():
    colmap_zip = TOOLS_DIR / "colmap_cuda.zip"
    colmap_dir = TOOLS_DIR / "colmap"
    
    openmvs_7z = TOOLS_DIR / "openmvs_cuda.7z"
    openmvs_dir = TOOLS_DIR / "openmvs"

    if not colmap_zip.exists():
        download_url(COLMAP_URL, colmap_zip)
    if not colmap_dir.exists():
        extract_archive(colmap_zip, colmap_dir)

    if not openmvs_7z.exists():
        download_url(OPENMVS_URL, openmvs_7z)
    if not openmvs_dir.exists():
        extract_archive(openmvs_7z, openmvs_dir)

    print("Installation of CUDA tools complete!")

    # Find the executables
    colmap_exe = next(colmap_dir.rglob("COLMAP.bat"), None)
    if not colmap_exe:
        colmap_exe = colmap_dir / "COLMAP.bat"
        
    openmvs_bin = next(openmvs_dir.rglob("DensifyPointCloud.exe"), None)
    if openmvs_bin:
        openmvs_bin_dir = openmvs_bin.parent
    else:
        openmvs_bin_dir = openmvs_dir / "bin"

    env_path = Path(__file__).parent / "backend" / ".env"
    print(f"Updating {env_path}...")
    
    # Read existing content and append
    env_content = f"\nCOLMAP_EXE=\"{colmap_exe}\"\nOPENMVS_BIN_DIR=\"{openmvs_bin_dir}\"\n"
    with open(env_path, "a") as f:
        f.write(env_content)
        
    print(f"COLMAP_EXE={colmap_exe}")
    print(f"OPENMVS_BIN_DIR={openmvs_bin_dir}")
    print("Done! Restart your backend server to use photogrammetry with CUDA.")

if __name__ == "__main__":
    main()
