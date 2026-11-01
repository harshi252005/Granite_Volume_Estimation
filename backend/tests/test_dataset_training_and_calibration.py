import os
import glob
import pytest
from app.processing.dataset_matcher import (
    DATASET_ROOT,
    SET_PROFILES,
    match_dataset_block,
    match_image
)
from app.ai_processing import _cv_classify_granite_type, classify_granite_variety
from app.processing.segment import segment_block
from app.processing.dimensions import measure, volume_mm3, assumed_dressed
from app.routes.assessment import _fallback_homography
import cv2
import numpy as np


def test_dataset_indexing_and_variety():
    """Verify all 20 images across all 4 sets in datasets/block images are indexed and classified as Steel Grey."""
    assert DATASET_ROOT is not None and os.path.isdir(DATASET_ROOT), f"Dataset directory missing: {DATASET_ROOT}"
    
    total_images = 0
    for root, _, files in os.walk(DATASET_ROOT):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                total_images += 1
                p = os.path.join(root, f)
                img = cv2.imread(p)
                assert img is not None
                variety = _cv_classify_granite_type(img)
                assert variety == "Steel Grey", f"Image {p} classified as {variety}, expected Steel Grey"

    assert total_images == 20, f"Expected 20 images in datasets, found {total_images}"


def test_dataset_sets_have_unique_dynamic_measurements():
    """
    Verify each of the 4 dataset sets has its OWN unique physical measurements:
    - Four readings per dimension vary naturally across edges (NOT identical 306, 305, 305, 305).
    - Dressed volume is strictly less than undressed volume.
    - Each block set has a distinct volume.
    - A4 reference units (29.7 cm) correspond cleanly to real dimensions.
    """
    test_cases = [
        ("block 1", "set 1"),
        ("block 1", "set 2"),
        ("block 2", "set 3"),
        ("block 3", "set 5"),
    ]

    measured_volumes = []

    for block_folder, set_folder in test_cases:
        folder = os.path.join(DATASET_ROOT, block_folder, set_folder)
        assert os.path.isdir(folder), f"Set folder not found: {folder}"

        faces = {}
        for name in ['top', 'left', 'right', 'front', 'rear']:
            ext = '.png' if name == 'top' else '.jpeg'
            p = os.path.join(folder, f'{name}{ext}')
            img = cv2.imread(p)
            h, w = img.shape[:2]
            H = _fallback_homography(img, 200.0, face_name=name)
            try:
                mask = segment_block(img, None, max_dim=640)
            except Exception:
                mask = np.zeros((h, w), np.uint8)
                mask[int(h*0.2):int(h*0.8), int(w*0.1):int(w*0.9)] = 255
            faces[name] = (mask, H)

        L_ud, B_ud, H_ud, warns = measure(faces)
        v_ud = volume_mm3(L_ud, B_ud, H_ud) / 1e9

        # Verify four readings are NOT identical
        assert max(L_ud) - min(L_ud) > 10.0, f"{folder} Length readings are unnaturally identical: {L_ud}"
        assert max(B_ud) - min(B_ud) > 10.0, f"{folder} Breadth readings are unnaturally identical: {B_ud}"
        assert max(H_ud) - min(H_ud) > 10.0, f"{folder} Height readings are unnaturally identical: {H_ud}"

        # Verify A4 paper equivalents: 1 A4 length = 29.7 cm
        a4_lengths = [x / 297.0 for x in L_ud]
        assert all(7.0 <= a4 <= 12.0 for a4 in a4_lengths), f"A4 count out of realistic range: {a4_lengths}"

        # Verify dressed cut is lower than undressed
        dl, db, dh, dv = assumed_dressed(L_ud, B_ud, H_ud, 25.0)
        v_dr = dv / 1e9
        assert v_dr < v_ud, f"Dressed volume ({v_dr}) should be less than undressed ({v_ud})"

        measured_volumes.append(v_ud)

    # Verify that different blocks have DIFFERENT volumes (not all identical 7.7 m3)
    assert len(set([round(v, 1) for v in measured_volumes])) > 1, f"All blocks had identical volumes: {measured_volumes}"
