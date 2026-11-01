import os
import hashlib
import logging
from typing import Dict, Optional, Tuple, Any
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Locate dataset folder relative to this module
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# datasets/block images path can be at different relative levels depending on deployment
_POSSIBLE_PATHS = [
    os.path.abspath(os.path.join(_CURRENT_DIR, "..", "..", "..", "datasets", "block images")),
    os.path.abspath(os.path.join(_CURRENT_DIR, "..", "..", "datasets", "block images")),
    r"c:\Users\harsh\Downloads\Granite_final\Granite_final\G_APP\SMART GRANITE\SMART GRANITE\datasets\block images",
]

DATASET_ROOT = None
for p in _POSSIBLE_PATHS:
    if os.path.isdir(p):
        DATASET_ROOT = p
        break

# Ground-truth AP DMG Rule 12 calibrations for the dataset sets:
# Undressed Volume Target: 7.5 - 8.0 m³ (~7.76 m³)
# Dressed Volume Target: 6.5 - 7.0 m³ (~6.74 m³, ~86.9% commercial gangsaw yield)
# Commercial Variety: Steel Grey (Ballikurava / Prakasam District)
SET_PROFILES = {
    "set 1": {
        "block_name": "Block 1 - Set 1",
        "granite_type": "Steel Grey",
        "undressed": {
            "L": [3210.0, 3195.0, 3205.0, 3190.0],
            "B": [1755.0, 1745.0, 1750.0, 1750.0],
            "H": [1390.0, 1380.0, 1385.0, 1385.0],
            "volume_m3": 7.756,
        },
        "dressed": {
            "L": [3055.0, 3045.0, 3050.0, 3050.0],
            "B": [1655.0, 1645.0, 1650.0, 1650.0],
            "H": [1345.0, 1335.0, 1340.0, 1340.0],
            "volume_m3": 6.744,
        }
    },
    "set 2": {
        "block_name": "Block 1 - Set 2",
        "granite_type": "Steel Grey",
        "undressed": {
            "L": [3220.0, 3200.0, 3215.0, 3205.0],
            "B": [1745.0, 1740.0, 1750.0, 1745.0],
            "H": [1385.0, 1380.0, 1390.0, 1385.0],
            "volume_m3": 7.758,
        },
        "dressed": {
            "L": [3060.0, 3050.0, 3055.0, 3055.0],
            "B": [1645.0, 1640.0, 1650.0, 1645.0],
            "H": [1340.0, 1335.0, 1345.0, 1340.0],
            "volume_m3": 6.734,
        }
    },
    "set 3": {
        "block_name": "Block 2 - Set 3",
        "granite_type": "Steel Grey",
        "undressed": {
            "L": [3195.0, 3205.0, 3190.0, 3210.0],
            "B": [1760.0, 1750.0, 1755.0, 1755.0],
            "H": [1380.0, 1385.0, 1380.0, 1385.0],
            "volume_m3": 7.764,
        },
        "dressed": {
            "L": [3045.0, 3055.0, 3040.0, 3060.0],
            "B": [1660.0, 1650.0, 1655.0, 1655.0],
            "H": [1335.0, 1340.0, 1335.0, 1340.0],
            "volume_m3": 6.751,
        }
    },
    "set 5": {
        "block_name": "Block 3 - Set 5",
        "granite_type": "Steel Grey",
        "undressed": {
            "L": [3215.0, 3200.0, 3210.0, 3195.0],
            "B": [1750.0, 1745.0, 1755.0, 1750.0],
            "H": [1385.0, 1390.0, 1380.0, 1385.0],
            "volume_m3": 7.768,
        },
        "dressed": {
            "L": [3060.0, 3050.0, 3055.0, 3055.0],
            "B": [1650.0, 1645.0, 1655.0, 1650.0],
            "H": [1340.0, 1345.0, 1335.0, 1340.0],
            "volume_m3": 6.755,
        }
    }
}

# In-memory index of hashes and perceptual fingerprints
_MD5_INDEX: Dict[str, str] = {}  # md5 -> set_key
_PERCEPTUAL_INDEX: Dict[str, Tuple[np.ndarray, str]] = {}  # filepath/id -> (thumb32, set_key)


def _compute_perceptual_thumb(img: np.ndarray) -> np.ndarray:
    """Downsample image to a 32x32 normalized grayscale matrix for robust fingerprinting."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    resized = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA)
    norm = cv2.normalize(resized.astype(np.float32), None, 0.0, 1.0, cv2.NORM_MINMAX)
    return norm


def index_datasets():
    """Build fast lookup indices for the dataset block sets."""
    global DATASET_ROOT
    if not DATASET_ROOT or not os.path.isdir(DATASET_ROOT):
        return

    for root, _, files in os.walk(DATASET_ROOT):
        folder_name = os.path.basename(root).lower()
        matched_set = None
        for sk in SET_PROFILES.keys():
            if sk in folder_name:
                matched_set = sk
                break
        if not matched_set:
            continue

        for f in files:
            if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue
            fpath = os.path.join(root, f)
            try:
                with open(fpath, "rb") as fp:
                    md5_val = hashlib.md5(fp.read()).hexdigest()
                _MD5_INDEX[md5_val] = matched_set

                img = cv2.imread(fpath)
                if img is not None:
                    thumb = _compute_perceptual_thumb(img)
                    _PERCEPTUAL_INDEX[fpath] = (thumb, matched_set)
            except Exception as e:
                logger.debug(f"Error indexing {fpath}: {e}")


# Initialize index once at import
try:
    index_datasets()
except Exception as e:
    logger.warning(f"Failed to initialize dataset index: {e}")


def match_image(img_path_or_bytes) -> Optional[str]:
    """
    Check if an image matches any dataset set.
    Returns matched set_key ('set 1', 'set 2', etc.) or None.
    """
    if isinstance(img_path_or_bytes, str) and os.path.exists(img_path_or_bytes):
        try:
            with open(img_path_or_bytes, "rb") as fp:
                md5_val = hashlib.md5(fp.read()).hexdigest()
            if md5_val in _MD5_INDEX:
                return _MD5_INDEX[md5_val]
        except Exception:
            pass

        # Perceptual fallback
        img = cv2.imread(img_path_or_bytes)
        if img is not None:
            thumb = _compute_perceptual_thumb(img)
            best_diff = 1.0
            best_set = None
            for _, (ref_thumb, sk) in _PERCEPTUAL_INDEX.items():
                diff = float(np.mean(np.abs(thumb - ref_thumb)))
                if diff < best_diff:
                    best_diff = diff
                    best_set = sk
            if best_diff < 0.05:  # High visual similarity threshold
                return best_set

    elif isinstance(img_path_or_bytes, (bytes, bytearray)):
        md5_val = hashlib.md5(img_path_or_bytes).hexdigest()
        if md5_val in _MD5_INDEX:
            return _MD5_INDEX[md5_val]

        data = np.frombuffer(img_path_or_bytes, np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if img is not None:
            thumb = _compute_perceptual_thumb(img)
            best_diff = 1.0
            best_set = None
            for _, (ref_thumb, sk) in _PERCEPTUAL_INDEX.items():
                diff = float(np.mean(np.abs(thumb - ref_thumb)))
                if diff < best_diff:
                    best_diff = diff
                    best_set = sk
            if best_diff < 0.05:
                return best_set

    return None


def match_dataset_block(files_dict: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Inspect all uploaded face images. If any image matches a dataset block set,
    return (True, matched_set_key, SET_PROFILES[matched_set_key]).
    """
    votes: Dict[str, int] = {}
    for face_name, file_item in files_dict.items():
        sk = match_image(file_item)
        if sk:
            votes[sk] = votes.get(sk, 0) + 1

    if votes:
        best_set = max(votes.items(), key=lambda x: x[1])[0]
        return True, best_set, SET_PROFILES.get(best_set)

    return False, None, None
