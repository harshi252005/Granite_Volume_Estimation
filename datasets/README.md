# 🪨 Smart Granite — Dataset Repository

This directory contains the bundled datasets, multi-view calibration sets, Andhra Pradesh mining records, and reference materials for the **Smart Granite Tracking System**.

---

## 📁 Directory Structure

```
datasets/
├── sample_granite_blocks/           # Multi-view test sets for 3D photogrammetry & AI measurement
│   ├── block_01_chimakurthy_black_galaxy/   # Left, Right, Front, Rear, Top views + ArUco markers
│   ├── block_02_ballikurava_steel_grey/     # Steel grey dimensional block test set
│   ├── block_03_kuppam_green/               # Kuppam green granite multi-view set
│   └── block_04_srikakulam_blue/            # Srikakulam blue granite multi-view set
│
├── rock_textures/                   # High-resolution mineral variety texture samples
│   ├── black_galaxy_granite.jpg     # Chimakurthy Black Galaxy (Gabbro with bronzite crystals)
│   ├── absolute_black_granite.jpg   # Premium Jet Black / Nero Assoluto
│   ├── tan_brown_granite.jpg        # Tan Brown / Karimnagar porphyritic granite
│   ├── kashmir_white_granite.jpg    # White granulite / Moon White
│   └── red_multcolour_granite.jpg   # Imperial Red / Chittoor Multi-colour
│
├── ap_mining_geology/               # Official AP Department of Mines & Geology reference data
│   └── ap_granite_quarries_registry.json    # Quarry clusters, GPS coordinates, Seigniorage rates
│
└── aruco_calibration_templates/     # 100mm standard scale markers for physical site calibration
    ├── aruco_marker_0.png           # Marker ID 0 (Ground / Corner 1)
    ├── aruco_marker_1.png           # Marker ID 1 (Ground / Corner 2)
    ├── aruco_marker_2.png           # Marker ID 2 (Ground / Corner 3)
    └── aruco_marker_3.png           # Marker ID 3 (Ground / Corner 4)
```

---

## 📐 How to Test Multi-View Reconstruction in the App

1. Open the Smart Granite App at **`http://localhost:5173`**.
2. Log in as **Operator** or **Admin**.
3. Navigate to **Capture Block** (`/operator/capture`).
4. Click on each slot and upload the corresponding view photos from `datasets/sample_granite_blocks/block_01_chimakurthy_black_galaxy/`:
   - **Left Side View** ➔ `left.jpg`
   - **Right Side View** ➔ `right.jpg`
   - **Front Face View** ➔ `front.jpg`
   - **Rear Face View** ➔ `rear.jpg`
   - **Top Face View** ➔ `top.jpg`
5. Click **Next: Enter Details** ➔ Fill Quarry Details.
6. Click **Process with AI** ➔ The backend runs the photogrammetry scale engine + ArUco detector + Gemini AI to compute the $L_1-L_4$, $B_1-B_4$, $H_1-H_4$ readings, gross volume, and seigniorage assessment.

---

## 🏛️ Government & Open-Source References

- **AIKosh (IndiaAI)**: Chemical, Mining & Natural Resources datasets.
- **data.gov.in / ap.data.gov.in**: Andhra Pradesh Department of Mines and Geology District Survey Reports (DSRs).
- **APMMC Rules 1966 & AP Minor Mineral Policy 2025**: Official seigniorage fee schedules and Gangsaw size classifications.
