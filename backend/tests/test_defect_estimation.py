import pytest
import numpy as np
from app.processing.dimensions import QuarryBlockEstimator, analyze_face_defects, assumed_dressed

def test_quarry_block_estimator_volumes():
    estimator = QuarryBlockEstimator(blade_clearance_m=0.03)
    
    front_metrics = {
        "undressed_dims": (3.10, 1.425),
        "recommended_deduction_m": 0.18,
        "h_defect_m": 0.08
    }
    
    side_metrics = {
        "undressed_dims": (1.45, 1.425),
        "recommended_deduction_m": 0.16,
        "h_defect_m": 0.08
    }
    
    results = estimator.calculate_total_volumes(front_metrics, side_metrics)
    
    assert results["undressed"]["L"] == 3.10
    assert results["undressed"]["W"] == 1.45
    assert results["undressed"]["H"] == 1.425
    assert results["undressed"]["volume_m3"] == round(3.10 * 1.45 * 1.425, 3)
    
    assert results["dressed"]["L"] == 2.92
    assert results["dressed"]["W"] == 1.29
    assert results["dressed"]["H"] == 1.345
    assert 4.8 <= results["dressed"]["volume_m3"] <= 5.1

def test_assumed_dressed_with_defects():
    L = [3100.0, 3100.0, 3100.0, 3100.0]
    B = [1450.0, 1450.0, 1450.0, 1450.0]
    H = [1425.0, 1425.0, 1425.0, 1425.0]
    
    # 1. Clean block with no defects (uses statutory 50mm deduction)
    l1, b1, h1, v1 = assumed_dressed(L, B, H, allowance_mm=25.0)
    assert l1 == 3050.0
    assert b1 == 1400.0
    assert h1 == 1375.0
    
    # 2. Block with cavities / breakout defects
    sim_defects = {
        'left': {'max_defect_depth_mm': 130.0},
        'front': {'max_defect_depth_mm': 110.0},
        'top': {'max_defect_depth_mm': 80.0}
    }
    l2, b2, h2, v2 = assumed_dressed(L, B, H, allowance_mm=25.0, faces=sim_defects)
    assert l2 < l1
    assert b2 < b1
    assert h2 < h1
    v2_m3 = v2 / 1e9
    assert 4.7 <= v2_m3 <= 5.0

def test_find_largest_inscribed_rectangle_on_cavity():
    from app.processing.dimensions import find_largest_inscribed_rectangle
    # Mask of stone (255) with cavity on top-left (0)
    mask = np.ones((140, 300), dtype=np.uint8) * 255
    # Crater cavity 40 deep, 60 wide
    mask[0:40, 0:60] = 0

    x, y, w, h = find_largest_inscribed_rectangle(mask)
    # LIR must not bridge over cavity
    # Inscribed rectangle will either start below y=40 or to the right of x=60
    assert (y >= 40) or (x >= 60)
    # Rectangle area must be entirely contained in solid stone
    sub_region = mask[y:y+h, x:x+w]
    assert np.all(sub_region == 255)

def test_cross_plane_defect_optimization_user_spec():
    from app.processing.dimensions import compute_quarry_metrics
    # Raw envelope dimensions producing ~6.47 m³:
    raw_L = 3.12
    raw_W = 1.44
    raw_H = 1.44

    # Ground truth defect penetrations observed on SVG 405:
    # - Right face taper forces 0.24m length deduction to square the end face
    # - Rear-top cavity penetrates 0.15m in depth (W) and 0.14m in height (H)
    result = compute_quarry_metrics(
        raw_L=raw_L,
        raw_W=raw_W,
        raw_H=raw_H,
        rear_top_cavity_depth_W=0.15,
        rear_top_cavity_depth_H=0.14,
        side_taper_offset_L=0.24,
        blade_margin=0.03
    )

    assert result["envelope_max_m3"] >= 6.46
    assert result["dressed_dimensions"]["L"] == 2.85
    assert result["dressed_dimensions"]["H"] == 1.27
    assert result["selected_cut_strategy"] == "Option A: Height-leveled"
    # Prevents 5.109 m³ overestimation and aligns to commercial dressed volume ~4.80 - 4.814 m³
    assert 4.80 <= result["dressed_cuboid_m3"] <= 4.82

def test_option_b_width_trimmed_when_favorable():
    from app.processing.dimensions import compute_quarry_metrics
    # Massive cavity in height (0.40m) but tiny in width (0.04m)
    result = compute_quarry_metrics(
        raw_L=3.0,
        raw_W=1.40,
        raw_H=1.40,
        rear_top_cavity_depth_W=0.04,
        rear_top_cavity_depth_H=0.40,
        side_taper_offset_L=0.10,
        blade_margin=0.03
    )
    # Trimming width (W - 0.04 - 0.03 = 1.33, H = 1.37) yields ~5.23 m³
    # Dropping height (W = 1.37, H - 0.40 - 0.03 = 0.97) yields ~3.80 m³
    # Therefore, Option B must be chosen:
    assert result["selected_cut_strategy"] == "Option B: Width-trimmed"
    assert result["dressed_dimensions"]["W"] == round(1.40 - 0.04 - 0.03, 3)

