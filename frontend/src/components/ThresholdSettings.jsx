import React, { useState, useEffect } from 'react';
import {
  Sliders, Cpu, Layers, Box, CheckCircle2, AlertTriangle,
  RefreshCw, Save, Download, Sparkles, Activity, Info,
  Eye, Check, RotateCcw, ShieldCheck, Scale, IndianRupee,
  BarChart2, Zap, ArrowRight, Camera, ExternalLink
} from 'lucide-react';
import { api } from '../api';

export default function ThresholdSettings({ user }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Core threshold settings
  const [settings, setSettings] = useState({
    volume_threshold_low: 5.8,
    volume_threshold_high: 7.0,
    density_factor: 2.62,
    leakage_threshold_percent: 8.0,
    ai_confidence_threshold: 0.70,
    aruco_marker_size_dressed_mm: 200.0,
    aruco_marker_size_undressed_mm: 100.0,
    aruco_dict: 'DICT_4X4_50',
    perspective_ratio_length: 1.7778,
    perspective_ratio_height: 0.75,
    gangsaw_threshold_length: 270.0,
    gangsaw_threshold_breadth: 150.0,
    super_gangsaw_threshold_length: 340.0,
    super_gangsaw_threshold_breadth: 180.0,
  });

  // Simulator test volume state
  const [testVolume, setTestVolume] = useState(6.2);

  // Models status list
  const [modelsData, setModelsData] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [activeModelTab, setActiveModelTab] = useState('all');

  // Active section tab
  const [activeTab, setActiveTab] = useState('thresholds'); // 'thresholds', 'models', 'rates'

  // ── Fetch Initial Data ─────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [settingsRes, modelsRes] = await Promise.allSettled([
        api.getSettings(),
        api.getModelsStatus(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.value,
          volume_threshold_low: parseFloat(settingsRes.value.volume_threshold_low ?? 5.8),
          volume_threshold_high: parseFloat(settingsRes.value.volume_threshold_high ?? 7.0),
        }));
      }

      if (modelsRes.status === 'fulfilled' && modelsRes.value?.models) {
        setModelsData(modelsRes.value.models);
      }
    } catch (err) {
      console.error('Error loading threshold settings:', err);
      setErrorMsg('Failed to load settings from server. Displaying defaults.');
    } finally {
      setLoading(false);
    }
  };

  const refreshModels = async () => {
    setLoadingModels(true);
    try {
      const res = await api.getModelsStatus();
      if (res?.models) {
        setModelsData(res.models);
      }
    } catch (err) {
      console.error('Error refreshing model status:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Save Handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (settings.volume_threshold_low <= 0) {
      setErrorMsg('Low threshold must be greater than 0.');
      return;
    }
    if (settings.volume_threshold_high <= settings.volume_threshold_low) {
      setErrorMsg('High threshold must be strictly greater than Low threshold.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMsg(err.message || 'Failed to save settings. Please check your privileges.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(prev => ({
      ...prev,
      volume_threshold_low: 5.8,
      volume_threshold_high: 7.0,
      density_factor: 2.62,
      leakage_threshold_percent: 8.0,
      ai_confidence_threshold: 0.70,
      aruco_marker_size_dressed_mm: 200.0,
      aruco_marker_size_undressed_mm: 100.0,
      perspective_ratio_length: 1.7778,
      perspective_ratio_height: 0.75,
    }));
  };

  // ── Category Calculation Helper ────────────────────────────────────────────
  const getCategory = (vol) => {
    const v = parseFloat(vol) || 0;
    const low = parseFloat(settings.volume_threshold_low) || 5.8;
    const high = parseFloat(settings.volume_threshold_high) || 7.0;

    if (v <= low) {
      return {
        key: 'low',
        label: 'Low Category',
        badgeClass: 'badge-amber',
        bg: '#FEF3C7',
        border: '#F59E0B',
        color: '#B45309',
        tag: 'Small / Medium Transport',
        rule: `Volume ≤ ${low.toFixed(1)} m³`,
        desc: 'Boulders and single-axle quarry transports under standard seigniorage tier.'
      };
    } else if (v <= high) {
      return {
        key: 'medium',
        label: 'Medium Category',
        badgeClass: 'badge-blue',
        bg: '#DBEAFE',
        border: '#3B82F6',
        color: '#1D4ED8',
        tag: 'Standard Commercial Block',
        rule: `${low.toFixed(1)} m³ < Volume ≤ ${high.toFixed(1)} m³`,
        desc: 'Ideal gangsaw processing block size. Optimum recovery ratio for polished slabs.'
      };
    } else {
      return {
        key: 'high',
        label: 'High Category',
        badgeClass: 'badge-green',
        bg: '#D1FAE5',
        border: '#10B981',
        color: '#047857',
        tag: 'Super Gangsaw / Export Monolith',
        rule: `Volume > ${high.toFixed(1)} m³`,
        desc: 'Premium dimensioned granite. Subject to statutory high-tonnage multi-axle transit compliance.'
      };
    }
  };

  const currentTestCategory = getCategory(testVolume);

  // Model cards fallback if backend returns empty or in loading
  const displayModels = modelsData.length > 0 ? modelsData : [
    {
      id: 'opencv',
      name: 'OpenCV Vision Processing Engine',
      category: 'Computer Vision & Edge Filtering',
      status: 'Active',
      version: 'v4.8.0+',
      operational: true,
      role: '2D edge detection, Laplacian blur gating, and Andhra Pradesh granite shade classification.',
      algorithms: [
        'Canny Dual-Threshold Edge Filter (30 / 120)',
        'Laplacian Variance Sharpness Gating (>100.0 threshold)',
        'Multi-Spectral HSV Color Masking (Chimakurthy, Srikakulam)',
        'Sub-Pixel Corner Precision Refinement'
      ],
      parameters: {
        canny_low: 30,
        canny_high: 120,
        blur_kernel: '5x5 Gaussian',
        min_sharpness_score: 100.0
      }
    },
    {
      id: 'aruco',
      name: 'ArUco Metric Fiducial Scale System',
      category: 'Physical Calibration & Metric Ground Truth',
      status: 'Active',
      version: 'OpenCV ArUco Engine v4',
      operational: true,
      role: 'Calculates millimetre-per-pixel scale factor from printed quarry markers without hardware LiDAR.',
      algorithms: [
        'Predefined Dictionary DICT_4X4_50 Lookup',
        'ArucoDetector Contour & Bit-Matrix Decoding',
        'Polygon Euclidean Side Length Averaging',
        'Scale Factor Normalization (mm/px)'
      ],
      parameters: {
        dictionary: settings.aruco_dict,
        dressed_marker_size_mm: settings.aruco_marker_size_dressed_mm,
        undressed_marker_size_mm: settings.aruco_marker_size_undressed_mm,
        marker_download_url: '/api/blocks/aruco-marker.png'
      }
    },
    {
      id: 'colmap',
      name: 'COLMAP Structure-from-Motion (SfM) Pipeline',
      category: '3D Photogrammetry & Camera Pose Estimation',
      status: 'Available / Cascade Ready',
      version: 'COLMAP v3.9+ SfM',
      operational: true,
      role: 'Extracts SIFT features across multi-view quarry photos and solves incremental camera poses.',
      algorithms: [
        'SIFT (Scale-Invariant Feature Transform) Keypoint Detector',
        'Exhaustive Feature Matcher (<100 multi-view images)',
        'Incremental Bundle Adjustment & Camera Pose Solver',
        'Dense Undistorter Preparing Pinhole Projections for MVS'
      ],
      parameters: {
        binary_path: 'colmap',
        min_views_required: 4,
        matcher: 'exhaustive',
        fallback_enabled: true
      }
    },
    {
      id: 'openmvs',
      name: 'OpenMVS Multi-View Reconstruction Engine',
      category: 'Dense Volumetric Point Cloud & Surface Mesh',
      status: 'Available / Mesh Pipeline',
      version: 'OpenMVS v2.1.0',
      operational: true,
      role: 'Converts sparse SfM projections into dense 3D point clouds and watertight triangular meshes.',
      algorithms: [
        'DensifyPointCloud Multi-View Depth Map Estimation',
        'ReconstructMesh Delaunay Tetrahedral Meshing',
        'RefineMesh Surface Optimization & Laplacian Smoothing',
        'Stanford Polygon (.ply) Export'
      ],
      parameters: {
        binaries: ['InterfaceCOLMAP', 'DensifyPointCloud', 'ReconstructMesh', 'RefineMesh'],
        output_format: 'Binary Stanford PLY',
        workspace_dir: 'uploads/scan_workspaces'
      }
    },
    {
      id: 'open3d',
      name: 'Open3D Statutory Geometry Engine',
      category: 'Spatial Analysis & Orthogonal Dimensioning',
      status: 'Active',
      version: 'Open3D C++ / Geometric Core',
      operational: true,
      role: 'Executes Andhra Pradesh Rule 12 statutory dressing deductions and orthogonal plane segmentation.',
      algorithms: [
        'Statistical Outlier Removal (NB=20, StdRatio=2.0)',
        'RANSAC 6-Plane Orthogonal Fitting (dist_th=10mm)',
        '12 Edge Line Intersections (L1-L4, B1-B4, H1-H4)',
        'Statutory Rule 12 Net Dressing Allowance Deductions'
      ],
      parameters: {
        ransac_distance_threshold_mm: 10.0,
        ransac_iterations: 1000,
        readings_per_dimension: 4,
        statutory_act: 'APMMC Rules 1966 Rule 12'
      }
    },
    {
      id: 'gemini',
      name: 'Google Gemini Multimodal AI Vision System',
      category: 'Cognitive Vision & Gangsaw Suitability',
      status: 'Active (3.8 & 3.5 Flash)',
      version: 'gemini-3.8-flash / gemini-3.5-flash',
      operational: true,
      role: 'Deep multimodal visual inspection, defect detection, and gangsaw commercial suitability.',
      algorithms: [
        'Multimodal Visual Token Embeddings',
        'Perspective Ratio Perspective Calibration (L: 1.7778, H: 0.75)',
        'Granite Surface Texture & Crack Analysis',
        'Commercial Gangsaw Suitability Assessment'
      ],
      parameters: {
        primary_model: 'gemini-3.8-flash',
        fallback_model: 'gemini-3.5-flash',
        length_perspective_factor: settings.perspective_ratio_length,
        height_perspective_factor: settings.perspective_ratio_height
      }
    }
  ];

  const filteredModels = activeModelTab === 'all'
    ? displayModels
    : displayModels.filter(m => m.id === activeModelTab);

  return (
    <div className="threshold-settings-page" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              <Sliders size={22} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Threshold Settings & AI Vision Models
            </h1>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, maxWidth: '780px' }}>
            Configure statutory volume classification boundaries (Low ≤ {settings.volume_threshold_low} m³, Medium {settings.volume_threshold_low}–{settings.volume_threshold_high} m³, High &gt; {settings.volume_threshold_high} m³) and manage the entire Computer Vision &amp; photogrammetry processing pipeline.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleResetDefaults}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600'
            }}
            title="Reset to official Andhra Pradesh mining defaults"
          >
            <RotateCcw size={15} />
            Reset Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              background: savedSuccess
                ? '#10B981'
                : 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
              border: 'none',
              color: '#FFF',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : savedSuccess ? (
              <>
                <Check size={16} />
                Settings Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                Save Adjustments
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Status Alerts ──────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #F87171',
          color: '#991B1B',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <AlertTriangle size={18} color="#DC2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {savedSuccess && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #34D399',
          color: '#065F46',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>Volume thresholds updated successfully! All future block scans and OMEPS reconciliations will apply these new bounds immediately.</span>
        </div>
      )}

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #E2E8F0',
        marginBottom: '24px',
        gap: '8px'
      }}>
        <button
          onClick={() => setActiveTab('thresholds')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'thresholds' ? '3px solid #2563EB' : '3px solid transparent',
            color: activeTab === 'thresholds' ? '#1E40AF' : '#64748B',
            fontWeight: activeTab === 'thresholds' ? '700' : '500',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sliders size={18} />
          Volume Thresholds &amp; Simulator
        </button>

        <button
          onClick={() => setActiveTab('models')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'models' ? '3px solid #2563EB' : '3px solid transparent',
            color: activeTab === 'models' ? '#1E40AF' : '#64748B',
            fontWeight: activeTab === 'models' ? '700' : '500',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Cpu size={18} />
          Vision &amp; 3D Photogrammetry Models
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: '#EFF6FF',
            color: '#1D4ED8',
            fontWeight: '700'
          }}>
            6 Engines
          </span>
        </button>

        <button
          onClick={() => setActiveTab('calibration')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'calibration' ? '3px solid #2563EB' : '3px solid transparent',
            color: activeTab === 'calibration' ? '#1E40AF' : '#64748B',
            fontWeight: activeTab === 'calibration' ? '700' : '500',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Scale size={18} />
          Density &amp; Statutory Cutoffs
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: VOLUME THRESHOLDS & SIMULATOR
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'thresholds' && (
        <div>
          {/* 3 Tier Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '28px'
          }}>
            {/* LOW CATEGORY CARD */}
            <div style={{
              background: '#FFF',
              borderRadius: '14px',
              padding: '22px',
              border: '2px solid #FCD34D',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: '700',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Low Category Tier
                </span>
                <span style={{ fontSize: '13px', color: '#B45309', fontWeight: '700' }}>
                  ≤ {Number(settings.volume_threshold_low).toFixed(1)} m³
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1F2937', marginBottom: '8px' }}>
                Under Low Category
              </h3>
              <p style={{ color: '#4B5563', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                Granite blocks with net volume <strong>≤ {Number(settings.volume_threshold_low).toFixed(1)} m³</strong>. Typically suited for monument dressing, split-faced cobbles, or single-axle tippers.
              </p>
              <div style={{
                background: '#FFFBEB',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid #FDE68A',
                fontSize: '12px',
                color: '#92400E'
              }}>
                <strong>Formula:</strong> <code>Volume ≤ {settings.volume_threshold_low} m³</code>
              </div>
            </div>

            {/* MEDIUM CATEGORY CARD */}
            <div style={{
              background: '#FFF',
              borderRadius: '14px',
              padding: '22px',
              border: '2px solid #93C5FD',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: '#DBEAFE',
                  color: '#1E40AF',
                  fontWeight: '700',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Medium Category Tier
                </span>
                <span style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: '700' }}>
                  {Number(settings.volume_threshold_low).toFixed(1)} – {Number(settings.volume_threshold_high).toFixed(1)} m³
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1F2937', marginBottom: '8px' }}>
                Under Medium Category
              </h3>
              <p style={{ color: '#4B5563', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                Granite blocks with net volume between <strong>{Number(settings.volume_threshold_low).toFixed(1)} m³</strong> and <strong>{Number(settings.volume_threshold_high).toFixed(1)} m³</strong>. Standard commercial gangsaw cutting block size.
              </p>
              <div style={{
                background: '#EFF6FF',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                color: '#1E40AF'
              }}>
                <strong>Formula:</strong> <code>{settings.volume_threshold_low} m³ ≤ Volume ≤ {settings.volume_threshold_high} m³</code>
              </div>
            </div>

            {/* HIGH CATEGORY CARD */}
            <div style={{
              background: '#FFF',
              borderRadius: '14px',
              padding: '22px',
              border: '2px solid #6EE7B7',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: '#D1FAE5',
                  color: '#065F46',
                  fontWeight: '700',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  High Category Tier
                </span>
                <span style={{ fontSize: '13px', color: '#047857', fontWeight: '700' }}>
                  &gt; {Number(settings.volume_threshold_high).toFixed(1)} m³
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1F2937', marginBottom: '8px' }}>
                Under High Category
              </h3>
              <p style={{ color: '#4B5563', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                Granite blocks with net volume strictly <strong>&gt; {Number(settings.volume_threshold_high).toFixed(1)} m³</strong>. Premium export monoliths and super gangsaw slabs requiring heavy-axle transit permits.
              </p>
              <div style={{
                background: '#ECFDF5',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid #A7F3D0',
                fontSize: '12px',
                color: '#065F46'
              }}>
                <strong>Formula:</strong> <code>Volume &gt; {settings.volume_threshold_high} m³</code>
              </div>
            </div>
          </div>

          {/* Interactive Threshold Control Box */}
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
              Adjust Volume Threshold Cutoffs
            </h3>
            <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px' }}>
              Drag the boundary sliders or type custom values in cubic metres (m³). The system will automatically calibrate all AI classification engines and permit validation rules.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginBottom: '28px'
            }}>
              {/* Low Threshold Adjustment */}
              <div style={{
                background: '#F8FAFC',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                    Low Threshold Boundary (m³)
                  </label>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#B45309',
                    background: '#FEF3C7',
                    padding: '3px 10px',
                    borderRadius: '6px'
                  }}>
                    {Number(settings.volume_threshold_low).toFixed(1)} m³
                  </span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="10.0"
                  step="0.1"
                  value={settings.volume_threshold_low}
                  onChange={(e) => setSettings({
                    ...settings,
                    volume_threshold_low: parseFloat(e.target.value) || 0
                  })}
                  style={{ width: '100%', marginBottom: '12px', accentColor: '#F59E0B' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="15.0"
                    value={settings.volume_threshold_low}
                    onChange={(e) => setSettings({
                      ...settings,
                      volume_threshold_low: parseFloat(e.target.value) || 0
                    })}
                    className="form-control"
                    style={{
                      width: '120px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontWeight: '700'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#64748B' }}>
                    Cubic metres (Default: 5.8 m³)
                  </span>
                </div>
              </div>

              {/* High Threshold Adjustment */}
              <div style={{
                background: '#F8FAFC',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                    High Threshold Boundary (m³)
                  </label>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#047857',
                    background: '#D1FAE5',
                    padding: '3px 10px',
                    borderRadius: '6px'
                  }}>
                    {Number(settings.volume_threshold_high).toFixed(1)} m³
                  </span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="14.0"
                  step="0.1"
                  value={settings.volume_threshold_high}
                  onChange={(e) => setSettings({
                    ...settings,
                    volume_threshold_high: parseFloat(e.target.value) || 0
                  })}
                  style={{ width: '100%', marginBottom: '12px', accentColor: '#10B981' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="2.0"
                    max="20.0"
                    value={settings.volume_threshold_high}
                    onChange={(e) => setSettings({
                      ...settings,
                      volume_threshold_high: parseFloat(e.target.value) || 0
                    })}
                    className="form-control"
                    style={{
                      width: '120px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontWeight: '700'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#64748B' }}>
                    Cubic metres (Default: 7.0 m³)
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Continuous Range Bar */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                Continuous Classification Spectrum (0.0 m³ to 12.0+ m³)
              </div>
              <div style={{
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                border: '1px solid #CBD5E1'
              }}>
                <div style={{
                  flex: `${settings.volume_threshold_low}`,
                  background: 'linear-gradient(90deg, #FDE68A 0%, #F59E0B 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#78350F',
                  fontWeight: '700',
                  fontSize: '12px',
                  transition: 'flex 0.2s ease'
                }}>
                  LOW (≤ {settings.volume_threshold_low} m³)
                </div>
                <div style={{
                  flex: `${Math.max(0.5, settings.volume_threshold_high - settings.volume_threshold_low)}`,
                  background: 'linear-gradient(90deg, #93C5FD 0%, #3B82F6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1E3A8A',
                  fontWeight: '700',
                  fontSize: '12px',
                  transition: 'flex 0.2s ease'
                }}>
                  MEDIUM ({settings.volume_threshold_low}–{settings.volume_threshold_high} m³)
                </div>
                <div style={{
                  flex: `${Math.max(1.0, 12.0 - settings.volume_threshold_high)}`,
                  background: 'linear-gradient(90deg, #6EE7B7 0%, #10B981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064E3B',
                  fontWeight: '700',
                  fontSize: '12px',
                  transition: 'flex 0.2s ease'
                }}>
                  HIGH (&gt; {settings.volume_threshold_high} m³)
                </div>
              </div>
            </div>
          </div>

          {/* ── Interactive Volume Calculator Sandbox ─────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: '16px',
            padding: '28px',
            color: '#FFF',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.25)',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: '#3B82F6',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={18} color="#FFF" />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: '800', margin: 0, color: '#F8FAFC' }}>
                Real-Time Volume Sandbox &amp; Category Classifier
              </h3>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Slide or input any block volume to verify how the APMMC statutory rules categorise it in real time.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              alignItems: 'center'
            }}>
              {/* Slider Input Column */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: '600' }}>
                    Simulated Net Volume:
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#38BDF8' }}>
                    {Number(testVolume).toFixed(2)} m³
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="12.0"
                  step="0.05"
                  value={testVolume}
                  onChange={(e) => setTestVolume(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', marginBottom: '16px', accentColor: '#38BDF8' }}
                />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[4.2, 5.8, 6.4, 7.0, 8.5].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTestVolume(preset)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: testVolume === preset ? '#38BDF8' : '#334155',
                        color: testVolume === preset ? '#0F172A' : '#E2E8F0',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {preset} m³
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Output Column */}
              <div style={{
                background: currentTestCategory.bg,
                border: `2px solid ${currentTestCategory.border}`,
                borderRadius: '14px',
                padding: '20px',
                color: '#0F172A'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: currentTestCategory.border,
                    color: '#FFF',
                    fontWeight: '800',
                    fontSize: '11px',
                    textTransform: 'uppercase'
                  }}>
                    {currentTestCategory.tag}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: currentTestCategory.color }}>
                    {currentTestCategory.rule}
                  </span>
                </div>

                <div style={{ fontSize: '24px', fontWeight: '900', color: currentTestCategory.color, marginBottom: '6px' }}>
                  {currentTestCategory.label}
                </div>

                <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                  {currentTestCategory.desc}
                </p>

                <div style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(0,0,0,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#475569'
                }}>
                  <span>Estimated Weight: <strong>{(testVolume * settings.density_factor).toFixed(2)} MT</strong></span>
                  <span>Density: <strong>{settings.density_factor} MT/m³</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: VISION & 3D PHOTOGRAMMETRY MODELS INFRASTRUCTURE HUB
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'models' && (
        <div>
          {/* Header & Filter Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Integrated Computer Vision &amp; 3D Photogrammetry Engines
              </h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
                All 6 algorithmic systems operating in concert for physical scale calibration, feature matching, dense reconstruction, and Rule 12 dimensioning.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={refreshModels}
                disabled={loadingModels}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <RefreshCw size={14} className={loadingModels ? 'animate-spin' : ''} />
                Refresh Telemetry
              </button>
            </div>
          </div>

          {/* Model Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Engines (6)' },
              { id: 'opencv', label: 'OpenCV' },
              { id: 'aruco', label: 'ArUco Scale' },
              { id: 'colmap', label: 'COLMAP SfM' },
              { id: 'openmvs', label: 'OpenMVS' },
              { id: 'open3d', label: 'Open3D Geometry' },
              { id: 'gemini', label: 'Gemini Multimodal' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveModelTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: activeModelTab === tab.id ? '#1E40AF' : '#F1F5F9',
                  color: activeModelTab === tab.id ? '#FFF' : '#475569',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid of Model Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {filteredModels.map((model) => (
              <div
                key={model.id}
                style={{
                  background: '#FFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#2563EB',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {model.category}
                      </span>
                      <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '4px 0 0 0' }}>
                        {model.name}
                      </h4>
                    </div>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: model.status.includes('Active') ? '#D1FAE5' : '#E0E7FF',
                      color: model.status.includes('Active') ? '#065F46' : '#3730A3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: model.status.includes('Active') ? '#10B981' : '#6366F1'
                      }} />
                      {model.status}
                    </span>
                  </div>

                  <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                    {model.role}
                  </p>

                  {/* Core Algorithms List */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Key Mathematical &amp; Algorithmic Modules:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {model.algorithms.map((algo, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#1E293B',
                            background: '#F8FAFC',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #F1F5F9'
                          }}
                        >
                          <CheckCircle2 size={13} color="#2563EB" style={{ flexShrink: 0 }} />
                          <span>{algo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Parameters Box */}
                <div style={{
                  background: '#F1F5F9',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: '#334155'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600' }}>Version / Pipeline:</span>
                    <span style={{ fontWeight: '700', color: '#0F172A' }}>{model.version}</span>
                  </div>

                  {model.id === 'aruco' && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #CBD5E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600' }}>Quarry Marker Download:</span>
                      <a
                        href="/api/blocks/aruco-marker.png"
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'none'
                        }}
                      >
                        <Download size={12} />
                        Get PNG Marker
                      </a>
                    </div>
                  )}

                  {model.id === 'colmap' && (
                    <div style={{ marginTop: '6px', color: '#475569', fontSize: '11px' }}>
                      Dense pipeline: SIFT GPU Feature Extraction → Exhaustive Matching → Sparse Point Cloud Triangulation.
                    </div>
                  )}

                  {model.id === 'openmvs' && (
                    <div style={{ marginTop: '6px', color: '#475569', fontSize: '11px' }}>
                      Multi-view stereo: DensifyPointCloud → ReconstructMesh (Delaunay) → RefineMesh. Output: .ply
                    </div>
                  )}

                  {model.id === 'open3d' && (
                    <div style={{ marginTop: '6px', color: '#475569', fontSize: '11px' }}>
                      Orthogonal RANSAC: 6-plane segmentation (dist_th=10mm) → 12 edge lines → Statutory APMMC Rule 12.
                    </div>
                  )}

                  {model.id === 'gemini' && (
                    <div style={{ marginTop: '6px', color: '#475569', fontSize: '11px' }}>
                      Multimodal Fallback: Primary gemini-3.8-flash with perspective ratio calibration (L: 1.78, H: 0.75).
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Model Interconnection Architecture Diagram */}
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            marginBottom: '32px'
          }}>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
              Sequential Processing Pipeline Architecture
            </h4>
            <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
              How images captured at the quarry propagate through the 6 models to produce legally certified statutory volume:
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0'
            }}>
              {[
                { title: 'Quarry Photos (4–6 views)', sub: 'Front, Back, L/R, Top', color: '#3B82F6' },
                { title: 'OpenCV Quality Gate', sub: 'Laplacian Blur & Color Mask', color: '#6366F1' },
                { title: 'ArUco Metric Scale', sub: 'Ground Truth mm/px factor', color: '#8B5CF6' },
                { title: 'COLMAP + OpenMVS', sub: '3D Mesh Reconstruction', color: '#EC4899' },
                { title: 'Open3D Geometry', sub: 'RANSAC Rule 12 Dressing', color: '#10B981' },
                { title: 'Volume Classification', sub: 'Low / Med / High Category', color: '#F59E0B' },
              ].map((step, idx) => (
                <React.Fragment key={idx}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#FFF',
                    border: `1.5px solid ${step.color}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    minWidth: '150px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: step.color }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {step.sub}
                    </div>
                  </div>
                  {idx < 5 && (
                    <ArrowRight size={18} color="#94A3B8" style={{ flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: DENSITY & STATUTORY CALIBRATION CUTOFFS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calibration' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px'
        }}>
          {/* AP Density & Variance Tolerance */}
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
              Granite Density &amp; Tolerance Factors
            </h4>
            <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
              Standard density conversion applied between volumetric 3D reconstruction and weighbridge tonnage.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Granite Specific Gravity / Density (MT/m³)
              </label>
              <input
                type="number"
                step="0.01"
                min="2.4"
                max="3.0"
                value={settings.density_factor}
                onChange={(e) => setSettings({ ...settings, density_factor: parseFloat(e.target.value) || 0 })}
                className="form-control"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Default: 2.62 MT/m³ (Calibrated for AP Black Galaxy and Srikakulam Blue varieties).
              </span>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Weighbridge Variance Flag Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="3.0"
                max="20.0"
                value={settings.leakage_threshold_percent}
                onChange={(e) => setSettings({ ...settings, leakage_threshold_percent: parseFloat(e.target.value) || 0 })}
                className="form-control"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Default: 8.0%. Discrepancies between 3D volume weight and physical weighbridge scale above this limit trigger DMGO audit flags.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                AI Vision Confidence Gating
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="0.95"
                value={settings.ai_confidence_threshold}
                onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseFloat(e.target.value) || 0 })}
                className="form-control"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Default: 0.70 (70%). Blocks with model confidence below this are routed to field inspectors for manual tape measurement.
              </span>
            </div>
          </div>

          {/* ArUco Physical Dimensions */}
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
              ArUco Scale Calibration Markers
            </h4>
            <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
              Physical side-lengths of printed fiducial markers placed upon granite blocks during quarry photography.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Dressed Block Marker Size (mm)
              </label>
              <input
                type="number"
                step="10.0"
                min="50.0"
                max="500.0"
                value={settings.aruco_marker_size_dressed_mm}
                onChange={(e) => setSettings({ ...settings, aruco_marker_size_dressed_mm: parseFloat(e.target.value) || 0 })}
                className="form-control"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Default: 200.0 mm (Standard laminated quarry sheet).
              </span>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Undressed Boulder Marker Size (mm)
              </label>
              <input
                type="number"
                step="10.0"
                min="50.0"
                max="500.0"
                value={settings.aruco_marker_size_undressed_mm}
                onChange={(e) => setSettings({ ...settings, aruco_marker_size_undressed_mm: parseFloat(e.target.value) || 0 })}
                className="form-control"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Default: 100.0 mm (Pocket magnetic / adhesive marker).
              </span>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                ArUco Dictionary
              </label>
              <input
                type="text"
                disabled
                value={settings.aruco_dict}
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#64748B',
                  fontWeight: '600'
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Fixed: DICT_4X4_50 (Provides 50 unique IDs with high hamming distance and fast detection).
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
