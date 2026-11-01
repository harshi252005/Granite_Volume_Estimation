import json
import os
from threading import Lock

CONFIG_FILE = "config.json"

DEFAULT_CONFIG = {
    "ai_confidence_threshold": 0.70,
    # Real AP granite density range: 2.55–2.65 MT/m³. Using 2.62 as calibrated default.
    # Note: 2.7 was causing systematic AI overestimation, leading to excessive variance flagging.
    "density_factor": 2.62,
    # Raised from 5% to 8% to account for inherent photo-based AI measurement uncertainty.
    # Photo estimation without ArUco scale markers has ±5–15% error; 8% threshold is practical.
    "leakage_threshold_percent": 8.0,
    # Volume Category Thresholds (m³):
    # Low: volume <= volume_threshold_low (default <= 5.8 m³)
    # Medium: volume_threshold_low < volume <= volume_threshold_high (default 5.8 – 7.0 m³)
    # High: volume > volume_threshold_high (default > 7.0 m³)
    "volume_threshold_low": 5.8,
    "volume_threshold_high": 7.0,
    # Vision & Photogrammetry Model Configurations
    "aruco_marker_size_dressed_mm": 200.0,
    "aruco_marker_size_undressed_mm": 100.0,
    "aruco_dict": "DICT_4X4_50",
    "perspective_ratio_length": 1.7778,
    "perspective_ratio_height": 0.75,
    "gangsaw_threshold_length": 270.0,
    "gangsaw_threshold_breadth": 150.0,
    "super_gangsaw_threshold_length": 340.0,
    "super_gangsaw_threshold_breadth": 180.0,
    "seigniorage_rates": {
        "super_gangsaw": {
            "Black Galaxy Granite": 2200,
            "Black Granite (Other than Black Galaxy)": 1820,
            "Premium Colour Granite": 1990,
            "Standard Colour Granite": 1630,
            "Other Colour Granite": 1130
        },
        "above_gangsaw": {
            "Black Galaxy Granite": 1830,
            "Black Granite (Other than Black Galaxy)": 1520,
            "Premium Colour Granite": 1660,
            "Standard Colour Granite": 1360,
            "Other Colour Granite": 940
        },
        "below_gangsaw": {
            "Black Galaxy Granite": 1530,
            "Black Granite (Other than Black Galaxy)": 1300,
            "Premium Colour Granite": 1410,
            "Standard Colour Granite": 1200,
            "Other Colour Granite": 720
        }
    }
}

def classify_volume_category(volume_m3: float, settings: dict = None) -> dict:
    if settings is None:
        settings = load_settings()
    vol = float(volume_m3 or 0)
    low_th = float(settings.get("volume_threshold_low", 5.8))
    high_th = float(settings.get("volume_threshold_high", 7.0))
    if vol <= low_th:
        return {
            "category": "low",
            "label": "Low Category",
            "threshold_applied": f"≤ {low_th} m³",
            "low_threshold": low_th,
            "high_threshold": high_th,
            "color": "#F59E0B"
        }
    elif vol <= high_th:
        return {
            "category": "medium",
            "label": "Medium Category",
            "threshold_applied": f"{low_th} – {high_th} m³",
            "low_threshold": low_th,
            "high_threshold": high_th,
            "color": "#3B82F6"
        }
    else:
        return {
            "category": "high",
            "label": "High Category",
            "threshold_applied": f"> {high_th} m³",
            "low_threshold": low_th,
            "high_threshold": high_th,
            "color": "#10B981"
        }

_lock = Lock()

def load_settings():
    with _lock:
        if not os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_CONFIG, f, indent=4)
            return DEFAULT_CONFIG
            
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
                
                # Merge with defaults in case of new keys
                updated = False
                for k, v in DEFAULT_CONFIG.items():
                    if k not in settings:
                        settings[k] = v
                        updated = True
                
                if updated:
                    with open(CONFIG_FILE, "w", encoding="utf-8") as fw:
                        json.dump(settings, fw, indent=4)
                        
                return settings
        except Exception as e:
            print(f"Error loading config: {e}")
            return DEFAULT_CONFIG

def save_settings(new_settings):
    with _lock:
        current = load_settings()
        # Update current with new settings
        for k, v in new_settings.items():
            if k in current:
                current[k] = v
                
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=4)
        return current
