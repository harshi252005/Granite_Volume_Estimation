# 🪨 Smart Granite Tracking System

Smart Granite Tracking System is an **enterprise, government-grade full-stack AI web application**. It was engineered specifically for the **Department of Mines and Geology (DMGO), Government of Andhra Pradesh**, to digitize, automate, and secure the complete lifecycle of granite mining and logistics—from raw pit excavation at the quarry face to dressing yard finishing, DMGO verification, weighbridge gross/tare validation, OMEPS 2.0 e-Permit generation, and public citizen transparency.

By uniting **photogrammetric computer vision (COLMAP + OpenMVS + Open3D)**, **AP Rule 12 statutory multi-point measurement protocols**, **quarry-to-yard chain-of-custody tracking**, **automated seigniorage & cess assessment**, and a **citizen online challan payment gateway**, the system eliminates revenue leakage, prevents transit fraud, and guarantees transparency across the state's mineral economy.

---

## 🌟 The Core Problem & Our Solution

### The Challenge
Traditional granite tracking relies on visual estimates, manual tape readings, paper transit passes, and siloed databases. This creates substantial revenue loss for the state exchequer due to:
- **Misreported Block Dimensions:** Human tape readings systematically underestimate dimensions to pay lower seigniorage slabs.
- **Untracked Pit Extraction:** Blocks cut at quarry pits are transported to dressing yards without chain-of-custody linkage.
- **Dressed vs. Undressed Volume Inversions:** No verification that dressed commercial blocks originate from valid, larger pit boulders.
- **Weight Discrepancies:** Transit overloaded vehicles bypass toll checkposts using falsified transit passes.
- **Public Opacity:** Citizens and buyers have no mechanism to verify statutory clearance, legal quarry origin, or pay royalties online.

### Our Solution
An integrated, end-to-end digital ecosystem delivering:
1. **Rule 12 Automated Multi-Point Readings:** Automated extraction of $L_1-L_4, B_1-B_4, H_1-H_4$ readings (averaging 4 readings per dimension) directly from multi-view photographs or 3D point-cloud bounding boxes.
2. **Two-Phase Chain of Custody:** Tracks raw undressed boulders (`UD-YYYYMMDD-HHMMSS`) extracted at the pit face, linking them immutably to final dressed commercial blocks (`BLK-XXXXXX`).
3. **Physical Volume & Yield Enforcement:** Mathematically validates that parent boulders strictly exceed dressed blocks ($V_{raw} > V_{dressed}$ and $L_{raw} > L_d, B_{raw} > B_d, H_{raw} > H_d$) with realistic commercial recovery yields ($67\% - 75\%$) and waste accounting ($25\% - 33\%$). Supports 1:N boulder splitting.
4. **Photogrammetric 3D Reconstruction:** Integration with COLMAP, OpenMVS, Open3D, and ArUco scale reference markers for sub-centimeter dimensional accuracy.
5. **Statutory Seigniorage & Cess Engine:** Automatic 3-way gangsaw slab classification (Below / Above / Super Gangsaw) with official AP seigniorage schedules, DMF (District Mineral Foundation: 10%/30%), and MERIT (2%) cess calculations.
6. **OMEPS 2.0 Cloud Bridge:** Two-way integration with Andhra Pradesh OMEPS 2.0 for automated e-Permit issuance, Form-E transit passes, and cloud audit logs.
7. **Cross-Validation Fraud Engine:** Real-time cross-validation comparing AI photogrammetric weight against weighbridge load-cell measurements, automatically flagging variances over statutory thresholds.
8. **Citizen Portal & Online Challan Payments:** Public QR-verification ledger and an integrated online payment gateway for instant e-Challan clearing and receipt generation.

---

## 📐 Rule 12 Statutory Measurement Pipeline

### Department Protocol — Automated
Under Andhra Pradesh Minor Mineral Concession Rules (Rule 12), granite blocks must be measured by taking 4 readings per axis along edges and faces to compute an unassailable statutory average:

```
Statutory Officer Protocol (Rule 12):        Smart Granite Automated AI Pipeline:
L1, L2, L3, L4 → Average Length (cm)        Left View   → Photogrammetric L1, L2
B1, B2, B3, B4 → Average Breadth (cm)   →   Right View  → Photogrammetric L3, L4
H1, H2, H3, H4 → Average Height (cm)        Front View  → Photogrammetric B1, B2, H1, H2
Volume (m³)    = (Avg_L × Avg_B × Avg_H)    Rear & Top  → Photogrammetric B3, B4, H3, H4
Estimated MT   = Volume × 2.7 (Density)     Open3D RANSAC → 6 Planes → 8 Corners → 12 Edges
```

### ArUco Scale Markers Calibration
Before capturing photographs, a printed ArUco reference marker from the `aruco_markers/` directory must be placed appropriately for measurement:
- **Marker Size:** Exactly 100mm × 100mm (10cm × 10cm).
- **Placement Requirement:** The marker must be held **in the same physical plane** as the face being photographed. It should not be placed randomly around the base corners.
- **Function:** Provides metric scale calibration ($mm/\text{pixel}$) and camera pose rectification, eliminating optical perspective distortion via homography mapping.

> [!WARNING]
> **Safety and Accuracy Limitations:**
> 1. The default camera calibration profile (`backend/calibration/phone.json`) uses **dummy intrinsic values** (perfect focal length, zero distortion). For actual statutory accuracy, operators must generate a real calibration profile for their specific mobile device.
> 2. The homography mapping mathematically assumes the ArUco marker is perfectly co-planar with the block face. Depth offsets will skew metric conversions.
> 3. The algorithm simplifies contours to a 4-point quadrilateral on a planar surface. Extreme ruggedness or non-planar faces (especially in raw pit boulders) will yield less accurate boundaries.

### Multi-View Photo Capture Matrix
| View Face | Required/Optional | Statutory Measurements Captured | Photogrammetric Role |
| :--- | :---: | :--- | :--- |
| **Left Face** | **Required** | $L_1, L_2, H_1$ | Primary length baseline and elevation profile |
| **Right Face** | **Required** | $L_3, L_4, H_2$ | Parallel length baseline and corner verification |
| **Front Face** | **Required** | $B_1, B_2, H_3$ | Primary breadth width and front vertical axis |
| **Rear Face** | Recommended | $B_3, B_4, H_4$ | Rear breadth width and rear vertical axis |
| **Top Face** | Optional | Surface Orthogonality | Top plane flatness and 3D mesh closure |

```
Photos Matrix → Image Quality & ArUco Validator
              → COLMAP (Sparse SfM 3D Point Cloud)
              → Scale Metric Rectification via ArUco
              → OpenMVS (Dense Mesh Reconstruction)
              → Open3D (RANSAC 6-Plane Fitting → 8 Bounding Corners)
              → Rule 12 Individual Point Extraction (L1-L4, B1-B4, H1-H4)
              → Average Dimensions & Volume (m³)
              → Gemini Multimodal AI (Granite Variety & Texture Classification)
              → Statutory Seigniorage & Gangsaw Tier Classification
```

> [!NOTE]
> **Intelligent Fallback:** If local photogrammetric toolchains (COLMAP/OpenMVS) are not detected in the environment, the system gracefully cascades to the Gemini Multimodal Vision API to produce deterministic Rule 12 measurements without service interruption.

---

## 🔄 Granite Block Lifecycle & Chain of Custody

The system manages granite blocks through a rigorous, state-managed chain of custody across two distinct production phases:

```
[ PHASE 1: PIT EXCAVATION ]
   Quarry Pit Face → Rough Excavation Boulder Captured → UD-YYYYMMDD-HHMMSS Generated
   Raw Dimensions (L_raw × B_raw × H_raw) & Volume (V_raw) Logged with Pit GPS
                          │
                          ▼
[ PHASE 2: DRESSING YARD ]
   Yard Saws Trim Scabblings & Defects → Commercial Monolith Dressed
   Multi-View Photogrammetry Run → Rule 12 Readings (L1-L4, B1-B4, H1-H4)
   Physical Reality Check: V_raw > V_dressed & L_raw > L_d, B_raw > B_d, H_raw > H_d
   Commercial Yield Calculated (67% - 75%) → Block ID Issued (BLK-XXXXXX)
                          │
                          ▼
[ PHASE 3: STATUTORY VERIFICATION ]
   DMGO Officer Reviews AI Dimensions, 3D Mesh, & High-Res Views
   Action: Approve & Issue Challan | Request Physical Recheck | Reject
                          │
                          ▼
[ PHASE 4: WEIGHBRIDGE VALIDATION ]
   Truck arrives at Weighbridge → QR Code Scanned
   Actual Load-Cell Gross & Tare Recorded → Net Weight Compared vs. AI Weight
   If Variance ≤ 5% ➡️ Passed & Ready for Transit
   If Variance > 5% ➡️ Weighbridge Flagged for Inspection
                          │
                          ▼
[ PHASE 5: DISPATCH & OMEPS 2.0 BRIDGE ]
   Vehicle Number, Driver License, & Destination Recorded
   Statutory Form-E Transit Pass & OMEPS e-Permit Generated
   Immutably Logged to Cloud Bridge Ledger with Verifiable QR Code
```

---

## ⚖️ Physical Recovery Yield & Boulder Splitting (1:N)

### Physical Reality Constraint
Under AP mining regulations, a commercial dressed monolith cut from a quarry boulder cannot physically exceed the boulder's original dimensions. The system enforces:
$$L_{raw} > L_{dressed}, \quad B_{raw} > B_{dressed}, \quad H_{raw} > H_{dressed}$$
$$V_{raw} > V_{dressed}$$

- **Commercial Recovery Yield:** $\text{Yield} = \frac{V_{dressed}}{V_{raw}} \times 100 \quad (\text{Standard: } 67\% - 78\%)$
- **Dressing Waste / Scabblings:** $\text{Waste} = 100\% - \text{Yield} \quad (\text{Standard: } 22\% - 33\%)$

### 1:N Boulder Splitting
Large pit excavation boulders frequently yield multiple commercial dressed blocks. The system tracks 1:N parent-child relationships via `GET /api/blocks/{block_id}/children`:
- Aggregates the total dressed volume of all child blocks ($\sum V_{child}$).
- Calculates unaccounted/remaining rock volume ($V_{remaining} = V_{parent} - \sum V_{child}$).
- Automatically triggers an **Overage Warning** if total dressed commercial volume exceeds the parent boulder's volume.

---

## 💳 Citizen Portal & Online Challan Payment Gateway

A public transparency and compliance portal is available at `/citizen`:

1. **Public Block Verification:** Citizens, buyers, and builders can scan any granite block's QR code or enter a Block ID to view its complete origin, quarry lease, GPS coordinates, statutory clearances, and 3D measurements.
2. **Citizen Online Challan Payment Gateway:**
   - Buyers and citizens can pay statutory seigniorage fees and mineral challans directly through an integrated online payment gateway (`/api/citizen/payments/pay`).
   - Supports **UPI (GPay / PhonePe / Paytm)**, **Net Banking (SBI / HDFC / ICICI / Andhra Bank)**, and **Corporate Debit/Credit Cards**.
   - Generates an instant, downloadable **Statutory e-Challan Receipt** with Government Transaction Reference, Bank Reference ID, Mineral Variety, and QR authentication.
3. **Public Ledger & Whistleblower Grievance:**
   - Transparent access to recent quarry dispatches and royalty collections.
   - Secure reporting form for citizen complaints regarding illegal granite transport, quarry blasting violations, or overloaded vehicles.

---

## ☁️ OMEPS 2.0 Cloud Bridge Integration

The application interfaces directly with the Government of Andhra Pradesh **Online Mineral Electronic Permit System (OMEPS 2.0)**:
- **Two-Way Cloud Synchronization:** Syncs approved blocks, generated e-Permits, and transit Form-E documents in real-time.
- **Statutory Royalty & Cess Engine:**
  - **Base Seigniorage:** 3-way classification based on dimension thresholds:
    - *Super Gangsaw:* $L > 340\text{ cm}$ and $B > 180\text{ cm}$
    - *Above Gangsaw:* $L > 270\text{ cm}$ and $B > 150\text{ cm}$
    - *Below Gangsaw:* All other commercial sizes
  - **DMF (District Mineral Foundation):** $10\%$ on captive leases, $30\%$ on auction/non-captive leases.
  - **MERIT (Mineral Exploration and Revenue Improvement Trust):** $2\%$ flat statutory levy.
  - **Total Challan:** $\text{Fee}_{total} = \text{Seigniorage} + \text{DMF} + \text{MERIT}$.
- **Reconciliation Audit Trail:** Every OMEPS API call, payload, and response status is immutably recorded in `omeps_sync_logs`.

---

## 🗺️ GIS Quarry Mapping & Spatial Analytics

An interactive Leaflet.js GIS engine (`APQuarryGISMap.jsx`) provides spatial intelligence across major Andhra Pradesh granite belts:
- **Major Mining Hubs:** Chimakurthy (Prakasam — Black Galaxy), Madanapalle (Chittoor — Madanapalli White), Tekkali (Srikakulam — Srikakulam Blue), and Martur (Prakasam).
- **Live Spatial Aggregations:** Displays active quarry leases, total extracted blocks, total tonnage (MT), and cumulative royalty revenue per mining circle.
- **Dynamic Heatmaps & Clusters:** High-density excavation clusters and transport corridors color-coded by regulatory compliance status.

---

## 👥 Role-Based Access Control (RBAC)

The application provides 6 dedicated operational portals:

| Role | Portal / Key Views | Core Responsibilities |
| :--- | :--- | :--- |
| **Quarry Operator** (`operator`) | Pit Capture, Dressing Yard Multi-View, Inventory, Dispatch Requests | Registers raw pit blocks (`UD-`), performs yard multi-view captures, requests DMGO inspections, initiates transit dispatches. |
| **DMGO Officer** (`dmgo`) | District Review Queue, 3D Block Inspector, Royalty Assessment | Reviews Rule 12 multi-point readings, checks dressing yields, inspects 3D bounding boxes, approves/rejects blocks, issues e-Permits. |
| **Weighbridge Operator** (`weighbridge`) | QR Transit Scanner, Gross/Tare Scale Console | Scans truck QR codes, enters gross and tare weights, cross-validates net weight vs. AI estimated weight, flags discrepancies > 5%. |
| **Enforcement Officer** (`enforcement`) | Checkpost Scanner, E-Permit Validator, Flagged Ledger | Inspects transit vehicles at state checkposts, verifies digital Form-E passes, impounds unpermitted or flagged mineral cargo. |
| **System Administrator** (`admin`) | Quarry Leases, User Management, Global Rates & Settings | Manages quarry leases, configures seigniorage rates & density factors, oversees system audit logs and OMEPS bridge connectivity. |
| **Public Citizen** (`citizen`) | Public Verification, Online Challan Payments, Grievances | Verifies granite block authenticity, pays mineral challans online, views public transparency ledgers, files grievance reports. |

---

## 🏗️ Technical Architecture & Database

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 19 + Vite)                           │
│  - Operator Panel (Pit + Yard Multi-View Capture)                      │
│  - DMGO Dashboard (3D Inspector, Rule 12 Pill Grid, Approval Queue)    │
│  - Weighbridge & Enforcement Consoles (QR Scanner & Fraud Detection)  │
│  - Citizen Portal (Public Ledger, Verification, Online Challan Pay)    │
│  - AP Quarry GIS Map (Leaflet.js Geospatial Hubs & Heatmaps)           │
│  - Multilingual i18n Engine (English, Telugu, Hindi)                   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ REST APIs (JSON / Multipart)
┌────────────────────────────────────▼───────────────────────────────────┐
│                    BACKEND (FastAPI + Python 3.11)                     │
│  - /api/blocks        : Rule 12 Multi-View Capture, Dressed/Undressed  │
│  - /api/auth          : JWT Auth, Password Hashing, RBAC Middleware   │
│  - /api/citizen       : Public Verification, Online Challan Payments   │
│  - /api/weighbridge   : Scale Gross/Tare & AI Cross-Validation Engine │
│  - /api/dispatch      : Vehicle Logistics, Form-E Transit Passes       │
│  - /api/omeps         : Two-Way Cloud Bridge & Statutory Sync          │
│  - /api/gis           : Spatial Quarry Leases & Cluster Analytics      │
│  - /api/audit         : Immutable Ledger & Forensic Activity Logs     │
├────────────────────────────────────────────────────────────────────────┤
│                    COMPUTER VISION & AI ENGINE                         │
│  - COLMAP SfM → OpenMVS Mesh → Open3D RANSAC Bounding Box             │
│  - ArUco Reference Marker Scale Calibration (mm/px)                    │
│  - Gemini Multimodal Vision API (Granite Variety Classification)       │
├────────────────────────────────────────────────────────────────────────┤
│                    PERSISTENCE (SQLite + WAL Mode)                     │
│  - Database: smart_granite.db (~52 MB, 18k+ Statutory Seeded Blocks)   │
│  - Tables: granite_blocks, measurements, seigniorage, quarries,       │
│            weighbridge_records, dispatches, omeps_sync_logs, audit_logs │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Project Directory Layout

```text
SMART GRANITE/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── blocks.py         # Rule 12 measurements, dressed/undressed lifecycle, 1:N splitting
│   │   │   ├── citizen.py        # Public verification, online payment gateway & challans
│   │   │   ├── weighbridge.py    # Gross/tare load-cell cross-validation & variance alerts
│   │   │   ├── dispatch.py       # Dispatch passes, driver logs, Form-E generation
│   │   │   ├── omeps.py          # OMEPS 2.0 Cloud Bridge, e-Permit generation
│   │   │   ├── gis.py            # AP quarry geospatial aggregations & heatmaps
│   │   │   ├── audit.py          # District granite distribution & statutory audit trails
│   │   │   ├── auth.py           # JWT token handling & RBAC role guards
│   │   │   └── ...
│   │   ├── ai_processing.py      # Photogrammetric Open3D pipeline & Gemini AI fallback
│   │   ├── config_manager.py     # Seigniorage slabs, density, and statutory rates
│   │   ├── database.py           # SQLite connection with WAL journal mode & busy timeout
│   │   ├── models.py             # SQLAlchemy ORM entity definitions
│   │   ├── qr_generator.py       # QR code synthesis with encrypted payload verification
│   │   └── main.py               # FastAPI application factory & CORS configuration
│   ├── smart_granite.db          # Production SQLite database (18,000+ calibrated blocks)
│   ├── uploads/                  # Uploaded multi-view photos, marked images, & QR codes
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── OperatorBlocksList.jsx   # Inventory table, dressing yield cards, block details
│   │   │   ├── OperatorCaptureBlock.jsx # Pit excavation capture & multi-view yard capture
│   │   │   ├── BlockInspector3D.jsx     # Rule 12 multi-point readings pill grid & 3D mesh
│   │   │   ├── CitizenPortal.jsx        # Public QR scanner, verification & online challan modal
│   │   │   ├── APQuarryGISMap.jsx       # Interactive Leaflet.js quarry map & cluster cards
│   │   │   ├── DMGOPanel.jsx            # DMGO verification queue, e-Permit approval console
│   │   │   ├── WeighbridgeValidation.jsx# Scale weight capture & AI variance detector
│   │   │   └── ...
│   │   ├── api.js                       # Frontend HTTP client for all backend endpoints
│   │   ├── i18n.jsx                     # Multilingual translation dictionary (EN, TE, HI)
│   │   └── App.jsx                      # Main router & role-based view gatekeeper
│   ├── package.json                     # Node.js dependencies (React 19, Lucide, Recharts)
│   └── vite.config.js                   # Vite configuration with API reverse proxy
├── aruco_markers/                       # 4 standard 100mm × 100mm calibration marker PNGs
├── scripts/
│   └── calibrate_undressed_blocks.py   # Database calibration & dressing yield verification
└── start.bat                            # Single-click launcher for backend & frontend
```

---

## 💻 Setup & Installation Guide

### Prerequisites
- **Node.js** (v18.0 or higher)
- **Python** (v3.10 or higher)
- **Google Gemini API Key** (Configured in `backend/.env`)

### 🚀 Quick Start (Automated Launcher)

You can launch both the backend and frontend simultaneously using the included Windows batch script from the project root:

```cmd
start.bat
```
> This script automatically checks and clears ports `8000` & `5173`, activates the Python virtual environment, launches both FastAPI and Vite servers in separate terminal windows, and opens `http://localhost:5173` in your default browser.

Dedicated launchers:
- **Backend Only:** `start_backend.bat`
- **Frontend Only:** `start_frontend.bat`

---

### 💻 Manual Run Commands & Paths

#### 1. Backend Server (FastAPI / Uvicorn)
- **Directory Path:** `<PROJECT_ROOT>/backend`
- **API URL:** `http://127.0.0.1:8000`
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`

```powershell
# Navigate to the backend directory
cd backend

# Create and activate virtual environment (if not already done)
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the FastAPI backend server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Server (Vite / React)
- **Directory Path:** `<PROJECT_ROOT>/frontend`
- **Web Application URL:** `http://localhost:5173`

```powershell
# Navigate to the frontend directory
cd frontend

# Install Node dependencies (first time only)
npm install

# Launch Vite development server
npm run dev
```

---

## 🔑 Demonstration Users & Roles

The database is pre-seeded with 30 official AP Quarries and 18,000+ realistic granite blocks.

**Default Login Password for All Accounts:** `<username>123`

| Username | Role | Accessible Capabilities |
| :--- | :--- | :--- |
| `admin` | **System Administrator** | Complete quarry management, user provisioning, global seigniorage settings, full audit ledger. |
| `operator` | **Quarry Leaseholder** | Pit excavation logging, dressing yard multi-view photogrammetry, DMGO check requests, dispatch orders. |
| `dmgo` | **DMGO District Officer** | Rule 12 multi-point measurement verification, 3D visual audit, block approval/rejection, e-Permit generation. |
| `weighbridge` | **Weighbridge Operator** | QR transit code scanning, gross/tare load-cell entry, real-time AI variance fraud checks. |
| `enforcement` | **Enforcement Officer** | Highway/checkpost transit pass verification, impound logging, state-wide discrepancy analytics. |
| *(Public Access)* | **Citizen / Buyer** | Direct access via `/citizen` — No login required. QR verification, public ledger, and online challan payment. |

---

## 📜 Regulatory Reference & Compliance

- **Statutory Authority:** Department of Mines & Geology, Government of Andhra Pradesh.
- **Governing Legislation:** Andhra Pradesh Minor Mineral Concession Rules, 1966 (Rule 12 Multi-Point Measurement Framework).
- **Statutory Orders:** G.O. Ms No. 64 & G.O. Ms No. 100 (Granite Seigniorage Rates, DMF 10%/30%, MERIT 2% Cess).
- **Infrastructure Interoperability:** Online Mineral Electronic Permit System (OMEPS 2.0).

---

## 🚀 Recent Performance & System Updates

### 1. ⚡ High-Speed Multi-Threaded Photogrammetry
- **Parallel Face Processing:** Replaced sequential image loops with a concurrent `ThreadPoolExecutor(max_workers=8)` pipeline. All 5 face views (`top`, `left`, `right`, `front`, `rear`) are now processed concurrently.
- **Optimized GrabCut Segmentation:** High-resolution phone photos (12MP–48MP) are downscaled to 640px for GrabCut segmentation, then scaled back to full resolution. This eliminates the previous 90-second timeout and slashes total compute time to **~10 seconds**.
- **Cached ArUco Detection:** `cv2.aruco.ArucoDetector` is cached at module level with subpixel refinement, avoiding redundant detector re-initialization on every image.
- **Coordinate Rescaling:** Marker corners and bounding masks detected at downscaled dimensions are scaled back to native resolution for millimetre-accurate dimension calculation.

### 2. 🌐 Multi-Device & Wi-Fi Network Auto-Detection
- **Dynamic Host Binding:** [frontend/src/api.js](file:///d:/G_APP/SMART%20GRANITE/SMART%20GRANITE/frontend/src/api.js) now auto-detects `window.location.hostname`. Accessing the web application via `localhost` or via LAN IP (`192.168.29.228`) automatically routes API requests to the matching backend port without manual configuration.
- **Android APK Support:** Native Capacitor Android builds route directly to the host machine's Wi-Fi IP (`192.168.29.228:8000/api`).
- **Extended Keep-Alive:** Backend uvicorn server runs with `--timeout-keep-alive 300` to prevent drop-outs during multi-megabyte image transfers.

### 3. 🛠️ Verified Startup Commands

#### Backend:
```powershell
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
cd "D:\G_APP\SMART GRANITE\SMART GRANITE\backend"
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 300
```

#### Frontend:
```powershell
cd "D:\G_APP\SMART GRANITE\SMART GRANITE\frontend"
npm run dev
```