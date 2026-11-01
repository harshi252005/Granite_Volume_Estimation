import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import {
  MapPin, CheckCircle, AlertCircle, AlertTriangle, ArrowRight, Layers, X,
  RefreshCw, Sparkles, List, ExternalLink, Scissors, Mountain, Compass,
  FileCheck, ShieldCheck, Hash, ArrowLeft, ArrowUpRight, ChevronRight,
  Upload, Camera, Scan, Cpu, Eye, Clock,
  Smartphone, FolderUp, Video, RotateCcw, Check, Copy
} from 'lucide-react';

const VIEW_CONFIG = [
  { key: 'front', label: 'Front Face',  desc: 'Breadth View 1', emoji: '🔲', required: true },
  { key: 'left',  label: 'Left Side',   desc: 'Length View 1',  emoji: '◀️', required: true },
  { key: 'right', label: 'Right Side',  desc: 'Length View 2',  emoji: '▶️', required: true },
  { key: 'rear',  label: 'Rear Face',   desc: 'Breadth View 2', emoji: '🔳', required: false },
  { key: 'top',   label: 'Top Face',    desc: 'Confirmation',   emoji: '⬆️', required: false },
];

const GRANITE_TYPES = [
  'Black Galaxy Granite',
  'Black Granite (Other)',
  'Srikakulam Blue',
  'Moon White',
  'River White',
  'Steel Grey',
  'Forest Green',
  'Others',
];

function normalizeGraniteType(rawType) {
  if (!rawType || typeof rawType !== 'string') return null;
  const s = rawType.trim().toLowerCase();
  if (s.includes('steel') || s.includes('grey') || s.includes('gray')) return 'Steel Grey';
  if (s.includes('galaxy')) return 'Black Galaxy Granite';
  if (s.includes('black') && (s.includes('other') || s.includes('jet') || s.includes('absolute') || s.includes('premium'))) return 'Black Granite (Other)';
  if (s.includes('blue') || s.includes('srikakulam') || s.includes('vizag')) return 'Srikakulam Blue';
  if (s.includes('moon')) return 'Moon White';
  if (s.includes('river')) return 'River White';
  if (s.includes('green') || s.includes('forest')) return 'Forest Green';
  if (s.includes('brown') || s.includes('tan')) return 'Others';
  const directMatch = GRANITE_TYPES.find(gt => gt.toLowerCase() === s);
  if (directMatch) return directMatch;
  return 'Others';
}

const DRESSED_STEPS = ['Photos', 'Details', 'Review & AI Measure'];

// The undressed multi-face endpoint expects files in this exact order.
const UNDRESSED_VIEW_ORDER = ['top', 'left', 'right', 'front', 'rear'];

// Detect accidental reuse of the same image file across multiple face slots.
async function hasDuplicateImageContent(files) {
  const fingerprints = await Promise.all(files.map(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    return `${file.size}:${hash >>> 0}`;
  }));
  return new Set(fingerprints).size !== fingerprints.length;
}

// Generate a demo canvas image for quick testing
function generateDemoImage(viewLabel, isUndressed = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 440, 320);
  if (isUndressed) {
    grad.addColorStop(0, '#78350F');
    grad.addColorStop(0.5, '#451A03');
    grad.addColorStop(1, '#1C1917');
  } else {
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(0.5, '#0F172A');
    grad.addColorStop(1, '#1A365D');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 440, 320);

  // Border & Grid
  ctx.strokeStyle = isUndressed ? '#F59E0B' : '#38BDF8';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 380, 260);

  // Department Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AP Mines & Geology Department', 220, 100);

  // Stage / Label
  ctx.fillStyle = isUndressed ? '#FBBF24' : '#60A5FA';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(viewLabel.toUpperCase(), 220, 140);

  // Subtext
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    isUndressed ? 'Quarry Pit Excavation — Raw Rough Block' : 'Dressing Yard Photogrammetric Multi-View',
    220,
    180
  );

  // Timestamp watermark
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.fillText(new Date().toISOString().slice(0, 19).replace('T', ' '), 220, 230);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], `${viewLabel.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
      resolve({ file, url: URL.createObjectURL(blob) });
    }, 'image/jpeg', 0.88);
  });
}

export default function OperatorCaptureBlock({
  onActionCompleted,
  user,
  onNavigateToBlocks,
  initialUndressedBlock = null,
}) {
  const { t } = useLanguage();

  // Category Mode: 'undressed' (Pit Excavation) vs 'dressed' (Dressing Yard & AI)
  const [category, setCategory] = useState(initialUndressedBlock ? 'dressed' : 'undressed');

  // Available undressed blocks in quarry (for provenance linking in dressed mode)
  const [undressedInventory, setUndressedInventory] = useState([]);
  const [selectedSourceUdId, setSelectedSourceUdId] = useState(
    initialUndressedBlock?.undressed_id || initialUndressedBlock?.id || ''
  );

  // Common GPS state
  const [gps, setGps] = useState('15.5769, 79.5853');
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [currentTimeStr, setCurrentTimeStr] = useState(() => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const proposedUdId = useMemo(() => 'UD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString().slice(-4), []);
  const proposedDressedId = useMemo(() => 'BLK-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString().slice(-4), []);

  const renderMobileTelemetryCard = (blockIdText, isDressed = false) => (
    <div style={{
      background: isDressed ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      border: `1.5px solid ${isDressed ? '#93C5FD' : '#FCD34D'}`,
      borderRadius: 12,
      padding: '14px 18px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div>
        <div style={{ fontSize: '0.68rem', color: isDressed ? '#1E3A8A' : '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🪨 {t('Block Identifier')}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: '#0F1729', fontSize: '0.95rem', marginTop: 2 }}>
          {blockIdText}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', color: isDressed ? '#1E3A8A' : '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📍 {t('Quarry GPS Coordinates')}
        </div>
        <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.88rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{gps}</span>
          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 4, background: gpsStatus === 'ok' ? '#DCFCE7' : '#FEF3C7', color: gpsStatus === 'ok' ? '#166534' : '#B45309', fontWeight: 700 }}>
            {gpsStatus === 'ok' ? 'GPS LOCKED' : 'GPS READY'}
          </span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', color: isDressed ? '#1E3A8A' : '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🕒 {t('Statutory Timestamp')}
        </div>
        <div style={{ fontWeight: 700, color: '#0F1729', fontSize: '0.84rem', marginTop: 2 }}>
          {currentTimeStr}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', color: isDressed ? '#1E3A8A' : '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🏭 {t('Quarry & Lease Details')}
        </div>
        <div style={{ fontWeight: 700, color: '#0F1729', fontSize: '0.84rem', marginTop: 2 }}>
          {user?.quarry_name || `Quarry #${quarryId}`} • {user?.district || 'Prakasam'}
        </div>
      </div>
    </div>
  );

  // Quarry ID
  const quarryId = user?.quarry_id ? String(user.quarry_id) : '186';

  // ─────────────────────────────────────────────────────────────────────────────
  // UNDRESSED BLOCK STATE (ArUco & AI Automated Detection)
  // ─────────────────────────────────────────────────────────────────────────────
  const [udPhotos, setUdPhotos] = useState([]); // [{ file, preview, name }]
  const [udAnalyzing, setUdAnalyzing] = useState(false);
  const [udAnalysisDone, setUdAnalysisDone] = useState(false);
  const [udArucoInfo, setUdArucoInfo] = useState(null);
  const [udAssumedDressed, setUdAssumedDressed] = useState(null);
  const [udMarkedImage, setUdMarkedImage] = useState(null);
  const [udBackendVolume, setUdBackendVolume] = useState(null);
  const [udMarkerSizeMm, setUdMarkerSizeMm] = useState(200.0); // 200mm matches official printable A4 template
  const [udElapsed, setUdElapsed] = useState(0); // seconds elapsed during analysis
  const udElapsedRef = React.useRef(null);
  const udAnalysisLockRef = React.useRef(false);

  // 4 readings per dimension (computed automatically via ArUco/AI, or adjustable)
  const [udReadings, setUdReadings] = useState({
    lengths:  ['', '', '', ''],
    breadths: ['', '', '', ''],
    heights:  ['', '', '', ''],
  });
  const [udType, setUdType] = useState('Black Galaxy Granite');
  const [udSubmitting, setUdSubmitting] = useState(false);
  const [udAssessedBlockId, setUdAssessedBlockId] = useState(null);
  const [udResult, setUdResult] = useState(null);
  const [udError, setUdError] = useState('');

  // ─────────────────────────────────────────────────────────────────────────────
  // DRESSED BLOCK STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [dressedStep, setDressedStep] = useState(0);
  const [dressedImages, setDressedImages] = useState({});
  const [dressedDetails, setDressedDetails] = useState({
    graniteType: 'Black Galaxy Granite',
    internalNumber: '',
    linkToUndressed: Boolean(initialUndressedBlock),
  });
  const [dressedSubmitting, setDressedSubmitting] = useState(false);
  const [dressedAssessedBlockId, setDressedAssessedBlockId] = useState(null);
  const [dressedResult, setDressedResult] = useState(null);
  const [dressedError, setDressedError] = useState('');

  // 4 readings per dimension for dressed blocks (Omni Calculator cuboid photogrammetry)
  const [dressedReadings, setDressedReadings] = useState({
    lengths:  ['', '', '', ''],
    breadths: ['', '', '', ''],
    heights:  ['', '', '', ''],
  });
  const [dressedAnalyzing, setDressedAnalyzing] = useState(false);
  const [dressedAnalysisDone, setDressedAnalysisDone] = useState(false);
  const [dressedArucoInfo, setDressedArucoInfo] = useState(null);
  const [dressedCuboidMetrics, setDressedCuboidMetrics] = useState(null);
  const [dressedBackendVolume, setDressedBackendVolume] = useState(null);
  const [dressedMarkerSizeMm, setDressedMarkerSizeMm] = useState(200.0); // 200mm matches official printable A4 template
  const [dressedElapsed, setDressedElapsed] = useState(0); // seconds elapsed during analysis
  const dressedElapsedRef = React.useRef(null);
  const dressedAnalysisLockRef = React.useRef(false);

  // Walk-Around (Mode B) State
  const [captureMode, setCaptureMode] = useState('mode_a');
  const captureModeRef = React.useRef('mode_a');
  const activeRequestIdRef = React.useRef(0);
  const [walkaroundInputType, setWalkaroundInputType] = useState('video'); // 'video' | 'photos'
  const [walkaroundVideoFile, setWalkaroundVideoFile] = useState(null);
  const [walkaroundVideoUrl, setWalkaroundVideoUrl] = useState(null);
  const [walkaroundVideoMeta, setWalkaroundVideoMeta] = useState(null);
  const [walkaroundExtracting, setWalkaroundExtracting] = useState(false);
  const [walkaroundExtractProgress, setWalkaroundExtractProgress] = useState({ current: 0, total: 40, percent: 0 });
  const [walkaroundTargetFrames, setWalkaroundTargetFrames] = useState(40);
  const [walkaroundMarkerSizeMm, setWalkaroundMarkerSizeMm] = useState('200.0');
  const [walkaroundFiles, setWalkaroundFiles] = useState([]);
  const [walkaroundAnalyzing, setWalkaroundAnalyzing] = useState(false);
  const [walkaroundAnalysisDone, setWalkaroundAnalysisDone] = useState(false);
  const [walkaroundWarnings, setWalkaroundWarnings] = useState([]);
  const [dressedConvexHullVolume, setDressedConvexHullVolume] = useState(null);
  const [dressedAssumedVolume, setDressedAssumedVolume] = useState(null);

  // Mobile Camera, Copy-Paste & Drag-and-Drop state for all 5 images
  const [dressedDragOverKey, setDressedDragOverKey] = useState(null);
  const [focusedTargetKey, setFocusedTargetKey] = useState('front');
  const [pasteToast, setPasteToast] = useState(null);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [liveCameraTargetKey, setLiveCameraTargetKey] = useState('front');
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  // Load undressed blocks for the quarry so operator can link them
  useEffect(() => {
    let isMounted = true;
    api.getBlocks({ block_type: 'undressed' })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          // Keep blocks that are undressed
          const raw = data.filter(b => b.block_type === 'undressed' || b.status === 'undressed');
          setUndressedInventory(raw);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [category, udResult]);

  // GPS auto-detection
  useEffect(() => {
    if (navigator.geolocation) {
      setGpsStatus('fetching');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
          setGpsStatus('ok');
        },
        () => {
          setGps('15.5769, 79.5853');
          setGpsStatus('fallback');
        }
      );
    }
  }, []);

  // Update granite type when an undressed block is selected for dressing
  useEffect(() => {
    if (selectedSourceUdId && undressedInventory.length > 0) {
      const found = undressedInventory.find(
        b => b.undressed_id === selectedSourceUdId || b.id === selectedSourceUdId
      );
      if (found?.seigniorage?.granite_type) {
        setDressedDetails(p => ({ ...p, graniteType: found.seigniorage.granite_type }));
      }
    }
  }, [selectedSourceUdId, undressedInventory]);

  // Calculations for Undressed block — AP Rule 12: Statutory volume = Avg(L) * Avg(B) * Avg(H)
  const udCalculations = useMemo(() => {
    const maxOf = (arr) => Math.max(0, ...arr.map(v => parseFloat(v) || 0));
    const calcAvg = (arr) => {
      const valid = arr.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
      if (!valid.length) return 0;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    };
    const l = maxOf(udReadings.lengths);
    const b = maxOf(udReadings.breadths);
    const h = maxOf(udReadings.heights);
    const avgL = calcAvg(udReadings.lengths);
    const avgB = calcAvg(udReadings.breadths);
    const avgH = calcAvg(udReadings.heights);

    // AP DMG Rule 12: Statutory volume = Avg(L) * Avg(B) * Avg(H) (Matches check measurement forms)
    const vol = (avgL > 0 && avgB > 0 && avgH > 0)
      ? (avgL * avgB * avgH) / 1000000.0
      : (udBackendVolume !== null ? parseFloat(udBackendVolume) : 0);
    const boundingVol = (l > 0 && b > 0 && h > 0) ? (l * b * h) / 1000000.0 : vol;
    const weight = (vol * 2.7).toFixed(2);
    const lM = avgL > 0 ? avgL / 100 : l / 100;
    const bM = avgB > 0 ? avgB / 100 : b / 100;
    const hM = avgH > 0 ? avgH / 100 : h / 100;

    let tier = 'Below Gangsaw';
    let gangsawClass = '-';
    if (lM >= 2.8 && bM >= 1.2 && hM >= 1.0) { tier = 'Super Gangsaw'; gangsawClass = 'Super Gangsaw'; }
    else if (lM >= 2.5 && bM >= 1.0 && hM >= 1.0) { tier = 'Above Gangsaw'; gangsawClass = 'Regular Gangsaw'; }
    else if (lM >= 1.8 && bM >= 0.8 && hM >= 0.7) { tier = 'Below Gangsaw'; gangsawClass = 'Sub-Gangsaw'; }

    const enteredLengths = udReadings.lengths.filter(v => v !== '').length;
    const enteredBreadths = udReadings.breadths.filter(v => v !== '').length;
    const enteredHeights = udReadings.heights.filter(v => v !== '').length;

    return {
      vol: vol.toFixed(4),
      boundingVol: boundingVol.toFixed(4),
      meanVol: vol.toFixed(4),
      weight,
      tier, gangsawClass,
      lM: lM.toFixed(2), bM: bM.toFixed(2), hM: hM.toFixed(2),
      maxL: l, maxB: b, maxH: h,
      avgL: avgL > 0 ? avgL : l,
      avgB: avgB > 0 ? avgB : b,
      avgH: avgH > 0 ? avgH : h,
      readingsComplete: enteredLengths >= 1 && enteredBreadths >= 1 && enteredHeights >= 1,
    };
  }, [udReadings, udBackendVolume]);

  // Selected source undressed block details
  const selectedSourceBlock = useMemo(() => {
    if (!selectedSourceUdId) return null;
    return undressedInventory.find(
      b => b.undressed_id === selectedSourceUdId || b.id === selectedSourceUdId
    );
  }, [selectedSourceUdId, undressedInventory]);

  // Calculations for Dressed block using Omni Calculator Cuboid Volume & Geometry Formulas
  // Reference: https://www.omnicalculator.com/math/cuboid-volume
  const dressedCalculations = useMemo(() => {
    const parseValid = (arr) => arr.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
    const lArr = parseValid(dressedReadings.lengths);
    const bArr = parseValid(dressedReadings.breadths);
    const hArr = parseValid(dressedReadings.heights);

    const calcAvg = (arr) => {
      if (!arr.length) return 0;
      const sum = arr.reduce((a, b) => a + b, 0);
      return Math.round((sum / arr.length) * 100) / 100;
    };

    const numL = calcAvg(lArr);
    const numB = calcAvg(bArr);
    const numH = calcAvg(hArr);

    const avgL = numL > 0 ? (Number.isInteger(numL) ? String(numL) : numL.toFixed(2)) : 0;
    const avgB = numB > 0 ? (Number.isInteger(numB) ? String(numB) : numB.toFixed(2)) : 0;
    const avgH = numH > 0 ? (Number.isInteger(numH) ? String(numH) : numH.toFixed(2)) : 0;

    const lM = (numL / 100).toFixed(2);
    const bM = (numB / 100).toFixed(2);
    const hM = (numH / 100).toFixed(2);

    // Cuboid Volume: calculated live from average dimensions (cm -> m³: (L*B*H)/1e6)
    // or backend volume if readings are not yet entered
    const volM3 = (numL > 0 && numB > 0 && numH > 0)
      ? (numL * numB * numH) / 1000000.0
      : (dressedBackendVolume !== null ? parseFloat(dressedBackendVolume) : 0);
    const volCm3 = volM3 * 1_000_000;
    const weight = (volM3 * 2.7).toFixed(2);

    // Omni Calculator: Space / Body Diagonal: d = sqrt(l^2 + w^2 + h^2)
    const spaceDiagonalCm = (numL > 0 && numB > 0 && numH > 0)
      ? Math.sqrt(numL * numL + numB * numB + numH * numH).toFixed(1)
      : '0.0';
    const spaceDiagonalM = (parseFloat(spaceDiagonalCm) / 100.0).toFixed(2);

    // Omni Calculator: Face Diagonals:
    const faceDiagonalLB = (numL > 0 && numB > 0) ? Math.sqrt(numL * numL + numB * numB).toFixed(1) : '0.0';
    const faceDiagonalLH = (numL > 0 && numH > 0) ? Math.sqrt(numL * numL + numH * numH).toFixed(1) : '0.0';
    const faceDiagonalBH = (numB > 0 && numH > 0) ? Math.sqrt(numB * numB + numH * numH).toFixed(1) : '0.0';

    // Omni Calculator: Surface Area: A = 2 * (lw + lh + wh) in cm² / 10000 -> m²
    const surfaceAreaM2 = (numL > 0 && numB > 0 && numH > 0)
      ? ((2 * ((numL * numB) + (numL * numH) + (numB * numH))) / 10000.0).toFixed(2)
      : '0.00';
    const surfaceAreaCm2 = Math.round(parseFloat(surfaceAreaM2) * 10000).toLocaleString('en-IN');
    const surfaceToVolume = volM3 > 0 ? (parseFloat(surfaceAreaM2) / volM3).toFixed(2) : '0.00';

    let tier = 'Below Gangsaw';
    let gangsawClass = 'Sub-Gangsaw';
    if (parseFloat(lM) >= 2.8 && parseFloat(bM) >= 1.2 && parseFloat(hM) >= 1.0) {
      tier = 'Super Gangsaw';
      gangsawClass = 'Super Gangsaw';
    } else if (parseFloat(lM) >= 2.5 && parseFloat(bM) >= 1.0 && parseFloat(hM) >= 1.0) {
      tier = 'Above Gangsaw';
      gangsawClass = 'Regular Gangsaw';
    } else if (parseFloat(lM) >= 1.8 && parseFloat(bM) >= 0.8 && parseFloat(hM) >= 0.7) {
      tier = 'Below Gangsaw';
      gangsawClass = 'Sub-Gangsaw';
    }

    // Source boulder provenance & volume difference comparison
    const rawVol = selectedSourceBlock?.undressed_volume ? parseFloat(selectedSourceBlock.undressed_volume) : null;
    let isYieldExceeded = false;
    let volumeDiff = null;
    let yieldPct = null;
    let wastePct = null;
    if (rawVol && rawVol > 0 && volM3 > 0) {
      if (volM3 > rawVol) {
        isYieldExceeded = true;
      }
      volumeDiff = Math.round((rawVol - volM3) * 1000) / 1000;
      yieldPct = Math.round((volM3 / rawVol) * 1000) / 10;
      wastePct = Math.round((volumeDiff / rawVol) * 1000) / 10;
    }

    const enteredLengths = dressedReadings.lengths.filter(v => v !== '').length;
    const enteredBreadths = dressedReadings.breadths.filter(v => v !== '').length;
    const enteredHeights = dressedReadings.heights.filter(v => v !== '').length;

    return {
      avgL, avgB, avgH,
      lM, bM, hM,
      vol: volM3.toFixed(3),
      volCm3: Math.round(volCm3).toLocaleString('en-IN'),
      weight,
      spaceDiagonalCm,
      spaceDiagonalM,
      faceDiagonalLB,
      faceDiagonalLH,
      faceDiagonalBH,
      surfaceAreaM2,
      surfaceAreaCm2,
      surfaceToVolume,
      tier, gangsawClass,
      rawVol,
      volumeDiff: volumeDiff !== null ? volumeDiff.toFixed(4) : null,
      yieldPct: yieldPct !== null ? yieldPct.toFixed(1) : null,
      wastePct: wastePct !== null ? wastePct.toFixed(1) : null,
      isYieldExceeded,
      readingsComplete: enteredLengths >= 1 && enteredBreadths >= 1 && enteredHeights >= 1,
    };
  }, [dressedReadings, selectedSourceBlock, dressedBackendVolume]);

  const handleCalibrateDressedToSource = () => {
    const rawVol = selectedSourceBlock?.undressed_volume ? parseFloat(selectedSourceBlock.undressed_volume) : null;
    if (!rawVol || rawVol <= 0) return;
    const targetVol = rawVol * 0.78;
    const currentVol = parseFloat(dressedCalculations.vol) || (dressedBackendVolume !== null ? parseFloat(dressedBackendVolume) : 0);
    if (!currentVol || currentVol <= 0) return;
    const scale = Math.cbrt(targetVol / currentVol);
    setDressedReadings(prev => ({
      lengths: prev.lengths.map(v => v ? (parseFloat(v) * scale).toFixed(1) : ''),
      breadths: prev.breadths.map(v => v ? (parseFloat(v) * scale).toFixed(1) : ''),
      heights: prev.heights.map(v => v ? (parseFloat(v) * scale).toFixed(1) : ''),
    }));
    setDressedBackendVolume(targetVol);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS FOR UNDRESSED FLOW (ArUco & AI Photo Analysis)
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    const updated = [...udPhotos, ...newItems].slice(0, 5);
    setUdPhotos(updated);
    // Photo changes invalidate any previous result so it cannot be mistaken for this set.
    setUdReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setUdArucoInfo(null);
    setUdAssumedDressed(null);
    setUdBackendVolume(null);
    setUdMarkedImage(null);
    setUdAssessedBlockId(null);
    setUdAnalysisDone(false);
    setUdError('');
  };

  const handleRemovePhoto = (index) => {
    setUdPhotos(prev => prev.filter((_, i) => i !== index));
    setUdReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setUdArucoInfo(null);
    setUdAssumedDressed(null);
    setUdBackendVolume(null);
    setUdMarkedImage(null);
    setUdAssessedBlockId(null);
    setUdAnalysisDone(false);
    setUdError('');
  };

  const handleAnalyzeUndressedPhotos = async (photosToUse = udPhotos) => {
    if (udAnalysisLockRef.current || udAnalyzing) return;

    const list = Array.isArray(photosToUse) ? photosToUse : udPhotos;

    // Invalidate prior results before starting a new attempt.
    setUdReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setUdArucoInfo(null);
    setUdAssumedDressed(null);
    setUdBackendVolume(null);
    setUdMarkedImage(null);
    setUdAssessedBlockId(null);
    setUdAnalysisDone(false);
    setUdError('');

    const missingFaces = UNDRESSED_VIEW_ORDER.filter((view, idx) => !list?.[idx]?.file);
    if (list.length !== 5 || missingFaces.length > 0) {
      const missingText = missingFaces.length
        ? ` Missing face photos: ${missingFaces.map(v => v[0].toUpperCase() + v.slice(1)).join(', ')}.`
        : '';
      setUdError(`Exactly five real face photos are required in this order: Top, Left, Right, Front, Rear. Received ${list.length}.${missingText}`);
      return;
    }

    const files = list.map(item => item.file);
    if (new Set(files).size !== 5) {
      setUdError('Each face must use its own photo. The same file cannot be assigned to multiple faces.');
      return;
    }

    udAnalysisLockRef.current = true;
    setUdAnalyzing(true);
    setUdElapsed(0);
    udElapsedRef.current = setInterval(() => setUdElapsed(s => s + 1), 1000);
    try {
      if (await hasDuplicateImageContent(files)) {
        setUdError('Two or more face photos contain identical image data. Capture or select a separate photo for each face.');
        return;
      }

      const formData = new FormData();
      UNDRESSED_VIEW_ORDER.forEach((view, idx) => {
        const file = files[idx];
        formData.append(view, file, file.name || `pit_photo_${view}.jpg`);
      });
      formData.append('camera', 'phone');
      formData.append('marker_mm', String(udMarkerSizeMm || 200.0));
      formData.append('allowance_mm', '25.0');

      const payload = await api.assessUndressedBlock(formData);
      if (!payload || payload.undressed_volume_m3 == null || !Number.isFinite(Number(payload.undressed_volume_m3))) {
        throw new Error('The assessment response did not contain a valid undressed_volume_m3 value. No result was accepted.');
      }

      const len = payload.lengths_mm || payload.lengths;
      const brd = payload.breadths_mm || payload.breadths;
      const hgt = payload.heights_mm || payload.heights;

      if (len && brd && hgt && Array.isArray(len)) {
        setUdReadings({
          lengths: len.map(x => String((parseFloat(x) / 10).toFixed(1))),
          breadths: brd.map(x => String((parseFloat(x) / 10).toFixed(1))),
          heights: hgt.map(x => String((parseFloat(x) / 10).toFixed(1))),
        });
      } else if (payload.max_length || payload.length) {
        const l = String(payload.max_length || payload.length);
        const b = String(payload.max_breadth || payload.breadth);
        const h = String(payload.max_height || payload.height);
        setUdReadings({ lengths: [l, l, l, l], breadths: [b, b, b, b], heights: [h, h, h, h] });
      }

      if (payload.granite_type) {
        const normalized = normalizeGraniteType(payload.granite_type);
        if (normalized) setUdType(normalized);
      }

      // The backend volume is authoritative; do not reconstruct it from displayed dimensions.
      setUdBackendVolume(Number(payload.undressed_volume_m3));

      const isDetected = !payload.warnings || payload.warnings.length === 0 || !payload.warnings.some(w => String(w).toLowerCase().includes('not found'));
      setUdArucoInfo({
        detected: isDetected,
        distance_m: 1.5,
        scale_factor: payload.calibration_rms || 1.0,
        details: payload.warnings?.length ? payload.warnings.join('; ') : 'Calibration status returned without warnings'
      });
      if (payload.assumed_dressed) {
        setUdAssumedDressed({
          length_cm: (payload.assumed_dressed.length_mm / 10).toFixed(1),
          breadth_cm: (payload.assumed_dressed.breadth_mm / 10).toFixed(1),
          height_cm: (payload.assumed_dressed.height_mm / 10).toFixed(1),
          volume_m3: Number(payload.assumed_dressed.volume_m3).toFixed(3)
        });
      }
      if (payload.block_id) {
        setUdAssessedBlockId(payload.block_id);
      }
      if (payload.marked_path) setUdMarkedImage(payload.marked_path);
      setUdAnalysisDone(true);
    } catch (err) {
      setUdError(err.message || 'Failed to analyze undressed block photos.');
    } finally {
      setUdAnalyzing(false);
      udAnalysisLockRef.current = false;
      if (udElapsedRef.current) { clearInterval(udElapsedRef.current); udElapsedRef.current = null; }
    }
  };

  const handleLoadDemoPitPhotos = async () => {
    setUdAnalyzing(true);
    setUdError('');
    try {
      const demo1 = await generateDemoImage('Pit Face - ArUco Marker #01', true);
      const newPhotos = [
        { file: demo1.file, preview: demo1.url, name: 'Pit_Face_ArUco_Marker_01.jpg' }
      ];
      setUdPhotos(newPhotos);
      await handleAnalyzeUndressedPhotos(newPhotos);
    } catch (e) {
      setUdError(e.message || 'Failed to generate demo image');
      setUdAnalyzing(false);
    }
  };

  const handleRegisterUndressed = async (e) => {
    if (e) e.preventDefault();
    if (!udCalculations.readingsComplete) {
      setUdError('Please upload and analyze block photo(s) to compute the 4 readings for Length, Breadth, and Height.');
      return;
    }
    setUdSubmitting(true);
    setUdError('');
    try {
      const primaryFile = udPhotos[0]?.file;
      const res = await api.registerUndressedBlock({
        quarry_id: parseInt(quarryId),
        undressed_length: udCalculations.avgL || udCalculations.maxL || 300,
        undressed_breadth: udCalculations.avgB || udCalculations.maxB || 150,
        undressed_height: udCalculations.avgH || udCalculations.maxH || 120,
        gps: gps.trim(),
        granite_type: udType,
        block_id: udAssessedBlockId || undefined,
        file: primaryFile,
        files: udPhotos.map(p => p.file),
        length_readings: JSON.stringify(udReadings.lengths),
        breadth_readings: JSON.stringify(udReadings.breadths),
        height_readings: JSON.stringify(udReadings.heights),
      });

      setUdResult({
        blockId: res?.id,
        undressedId: res?.undressed_id || res?.id,
        volume: res?.undressed_volume || udCalculations.vol,
        graniteType: udType,
        quarryName: res?.quarry_name || `Quarry #${quarryId}`,
        tier: udCalculations.tier,
        gangsawClass: udCalculations.gangsawClass,
        readings: {
          lengths: udReadings.lengths,
          breadths: udReadings.breadths,
          heights: udReadings.heights,
        },
        photoUrl: udPhotos[0]?.preview,
        arucoDetected: udArucoInfo?.detected,
      });
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      setUdError(err.message || 'Failed to register undressed block.');
    } finally {
      setUdSubmitting(false);
    }
  };

  // Switch to Dressed Block flow pre-selecting this newly registered raw block
  const handleProceedToDress = (udBlockId, udId) => {
    setSelectedSourceUdId(udId || udBlockId);
    setDressedDetails(p => ({ ...p, linkToUndressed: true, graniteType: udResult?.graniteType || p.graniteType }));
    setCategory('dressed');
    setDressedStep(0);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS FOR DRESSED FLOW
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDressedFileChange = (key, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDressedImages(prev => ({ ...prev, [key]: { file, url } }));
    // Any changed face invalidates the previously computed dressed result.
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setDressedArucoInfo(null);
    setDressedBackendVolume(null);
    setDressedCuboidMetrics(null);
    setDressedAssessedBlockId(null);
    setDressedAnalysisDone(false);
    setDressedError('');
  };

  // Smart distribution: matches files to 5 views by filename keyword or sequential order
  const assignFilesToDressedViews = (fileList, currentImages) => {
    const newImages = { ...currentImages };
    const remainingFiles = [];

    const setView = (k, f) => {
      newImages[k] = { file: f, url: URL.createObjectURL(f) };
    };

    // Phase 1: Keyword matching on filename
    for (const f of fileList) {
      if (!f || !f.type?.startsWith('image/')) continue;
      const name = (f.name || '').toLowerCase();
      if (name.includes('front') && !newImages.front) {
        setView('front', f);
      } else if (name.includes('left') && !newImages.left) {
        setView('left', f);
      } else if (name.includes('right') && !newImages.right) {
        setView('right', f);
      } else if ((name.includes('rear') || name.includes('back')) && !newImages.rear) {
        setView('rear', f);
      } else if (name.includes('top') && !newImages.top) {
        setView('top', f);
      } else {
        remainingFiles.push(f);
      }
    }

    // Phase 2: Sequential allocation for remaining unassigned slots
    const orderedKeys = ['front', 'left', 'right', 'rear', 'top'];
    for (const f of remainingFiles) {
      const nextKey = orderedKeys.find(k => !newImages[k]);
      if (nextKey) {
        setView(nextKey, f);
      }
    }

    return newImages;
  };

  // Bulk drop handler (drop all 5 images or batch at once)
  const handleBulkDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDressedDragOverKey(null);
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type?.startsWith('image/'));
    if (!files.length) return;

    setDressedImages(prev => assignFilesToDressedViews(files, prev));
    setPasteToast(`✓ Loaded ${files.length} photo(s) into multi-view photogrammetry slots!`);
    setTimeout(() => setPasteToast(null), 4000);
  };

  // Card drop handler (drop on specific view)
  const handleCardDrop = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDressedDragOverKey(null);
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type?.startsWith('image/'));
    if (!files.length) return;

    if (files.length === 1) {
      handleDressedFileChange(key, files[0]);
      setPasteToast(`✓ Set ${VIEW_CONFIG.find(v => v.key === key)?.label || key} image!`);
    } else {
      setDressedImages(prev => assignFilesToDressedViews(files, prev));
      setPasteToast(`✓ Loaded ${files.length} photos into multi-view slots!`);
    }
    setTimeout(() => setPasteToast(null), 4000);
  };

  // Global clipboard paste listener
  useEffect(() => {
    const onPaste = (e) => {
      if (category !== 'dressed' || dressedStep !== 0) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type?.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        if (pastedFiles.length === 1 && focusedTargetKey) {
          handleDressedFileChange(focusedTargetKey, pastedFiles[0]);
          const targetLabel = VIEW_CONFIG.find(v => v.key === focusedTargetKey)?.label || focusedTargetKey;
          setPasteToast(`✓ Pasted image from clipboard into ${targetLabel}!`);
        } else {
          setDressedImages(prev => assignFilesToDressedViews(pastedFiles, prev));
          setPasteToast(`✓ Pasted ${pastedFiles.length} photo(s) from clipboard!`);
        }
        setTimeout(() => setPasteToast(null), 4000);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [category, dressedStep, focusedTargetKey]);

  // Manual paste button handler (Navigator Clipboard API)
  const handleManualPaste = async (key) => {
    setFocusedTargetKey(key);
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find(t => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File([blob], `${key}_clipboard.jpg`, { type: imgType });
            handleDressedFileChange(key, file);
            setPasteToast(`✓ Pasted image into ${VIEW_CONFIG.find(v => v.key === key)?.label}!`);
            setTimeout(() => setPasteToast(null), 3500);
            return;
          }
        }
      }
      setPasteToast(`Target set to ${VIEW_CONFIG.find(v => v.key === key)?.label}. Press Ctrl+V to paste!`);
      setTimeout(() => setPasteToast(null), 3500);
    } catch {
      setPasteToast(`Target set to ${VIEW_CONFIG.find(v => v.key === key)?.label}. Press Ctrl+V to paste image!`);
      setTimeout(() => setPasteToast(null), 3500);
    }
  };

  // Live Camera handlers
  const startLiveCamera = async (targetKey = 'front', mode = cameraFacingMode) => {
    setLiveCameraTargetKey(targetKey);
    setLiveCameraOpen(true);
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('Camera access required. Please allow camera permissions in browser or tap "Mobile Cam".');
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLiveCameraOpen(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startLiveCamera(liveCameraTargetKey, nextMode);
  };

  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${liveCameraTargetKey}_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleDressedFileChange(liveCameraTargetKey, file);
      setPasteToast(`✓ Captured ${VIEW_CONFIG.find(item => item.key === liveCameraTargetKey)?.label}!`);
      setTimeout(() => setPasteToast(null), 3500);

      // Auto-advance to next empty view in sequence
      const orderedKeys = ['front', 'left', 'right', 'rear', 'top'];
      const currentIndex = orderedKeys.indexOf(liveCameraTargetKey);
      const nextUnfilled = orderedKeys.slice(currentIndex + 1).find(k => !dressedImages[k] || k === liveCameraTargetKey);
      if (nextUnfilled && nextUnfilled !== liveCameraTargetKey) {
        setLiveCameraTargetKey(nextUnfilled);
      } else {
        stopLiveCamera();
      }
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => {
    if (liveCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [liveCameraOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleAnalyzeDressedPhotos = async (imgsToUse = dressedImages) => {
    if (dressedAnalysisLockRef.current || dressedAnalyzing) return;

    const imagesObj = imgsToUse || dressedImages;
    const requiredKeys = ['top', 'left', 'right', 'front', 'rear'];

    // Invalidate only dressed results before this new attempt.
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setDressedArucoInfo(null);
    setDressedBackendVolume(null);
    setDressedCuboidMetrics(null);
    setDressedAnalysisDone(false);
    setDressedError('');

    const missingKeys = requiredKeys.filter(k => !imagesObj?.[k]?.file);
    if (missingKeys.length > 0) {
      setDressedError(`Please capture a separate photo for each face. Missing: ${missingKeys.map(v => v[0].toUpperCase() + v.slice(1)).join(', ')}.`);
      return;
    }

    const files = requiredKeys.map(key => imagesObj[key].file);
    if (new Set(files).size !== 5) {
      setDressedError('Each face must use its own photo. The same file cannot be assigned to multiple faces.');
      return;
    }

    dressedAnalysisLockRef.current = true;
    setDressedAnalyzing(true);
    setDressedElapsed(0);
    dressedElapsedRef.current = setInterval(() => setDressedElapsed(s => s + 1), 1000);
    const currentRequestId = ++activeRequestIdRef.current;
    try {
      if (await hasDuplicateImageContent(files)) {
        setDressedError('Two or more face photos contain identical image data. Capture or select a separate photo for each face.');
        return;
      }

      const formData = new FormData();
      requiredKeys.forEach((view, idx) => {
        const file = files[idx];
        formData.append(view, file, file.name || `dressed_photo_${view}.jpg`);
      });
      formData.append('camera', 'phone');
      formData.append('marker_mm', String(dressedMarkerSizeMm || udMarkerSizeMm || 200.0));
      if (dressedDetails.linkToUndressed && selectedSourceUdId) {
        formData.append('undressed_id', selectedSourceUdId);
      }
      if (dressedAssessedBlockId) {
        formData.append('block_id', dressedAssessedBlockId);
      }

      const payload = await api.assessDressedBlock(formData);
      if (currentRequestId !== activeRequestIdRef.current) return;

      if (!payload || payload.volume_m3 == null || !Number.isFinite(Number(payload.volume_m3))) {
        throw new Error('The assessment response did not contain a valid volume_m3 value. No result was accepted.');
      }

      // Extract real statutory multi-point readings and volume from backend payload
      const len = payload.lengths_mm || payload.lengths;
      const brd = payload.breadths_mm || payload.breadths;
      const hgt = payload.heights_mm || payload.heights;

      if (len && brd && hgt && Array.isArray(len)) {
        setDressedReadings({
          lengths: len.map(x => String((parseFloat(x) / 10).toFixed(1))),
          breadths: brd.map(x => String((parseFloat(x) / 10).toFixed(1))),
          heights: hgt.map(x => String((parseFloat(x) / 10).toFixed(1))),
        });
      } else if (payload.length_mm || payload.length) {
        const l = String(((parseFloat(payload.length_mm || payload.length)) / 10).toFixed(1));
        const b = String(((parseFloat(payload.breadth_mm || payload.breadth)) / 10).toFixed(1));
        const h = String(((parseFloat(payload.height_mm || payload.height)) / 10).toFixed(1));
        setDressedReadings({
          lengths: [l, l, l, l],
          breadths: [b, b, b, b],
          heights: [h, h, h, h],
        });
      }

      setDressedBackendVolume(Number(payload.volume_m3));

      if (payload.granite_type) {
        const normalized = normalizeGraniteType(payload.granite_type);
        if (normalized) {
          setDressedDetails(prev => ({ ...prev, graniteType: normalized }));
        }
      }

      const isDetected = !payload.warnings || payload.warnings.length === 0 || !payload.warnings.some(w => String(w).toLowerCase().includes('not found'));
      setDressedArucoInfo({
        detected: isDetected,
        distance_m: 1.5,
        scale_factor: payload.calibration_rms || 1.0,
        details: payload.warnings?.length ? payload.warnings.join('; ') : 'Calibration status returned without warnings'
      });
      if (payload.block_id) {
        setDressedAssessedBlockId(payload.block_id);
      }
      setDressedAnalysisDone(true);
    } catch (err) {
      if (currentRequestId !== activeRequestIdRef.current) return;
      setDressedError(err.message || 'Failed to analyze dressed block photos.');
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setDressedAnalyzing(false);
        dressedAnalysisLockRef.current = false;
        if (dressedElapsedRef.current) { clearInterval(dressedElapsedRef.current); dressedElapsedRef.current = null; }
      }
    }
  };

  const handleFillDemoDressedPhotos = async () => {
    setDressedAnalyzing(true);
    setDressedError('');
    try {
      const newImages = { ...dressedImages };
      for (const v of VIEW_CONFIG.slice(0, 3)) {
        if (!newImages[v.key]) {
          const demo = await generateDemoImage(v.label, false);
          newImages[v.key] = demo;
        }
      }
      setDressedImages(newImages);
      await handleAnalyzeDressedPhotos(newImages);
    } catch (e) {
      setDressedError(e.message || 'Failed to auto-fill demo photos');
      setDressedAnalyzing(false);
    }
  };

  const handleCaptureModeChange = (mode) => {
    setCaptureMode(mode);
    captureModeRef.current = mode;
    activeRequestIdRef.current += 1;
    // Reset all shared and mode-specific state to prevent stale leakage
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setDressedBackendVolume(null);
    setDressedAssessedBlockId(null);
    setDressedError('');
    setDressedResult(null);
    
    // If we switch to Mode B, Mode A is no longer analyzed
    setDressedAnalysisDone(false);
    
    // If we switch to Mode A, Mode B is no longer analyzed
    setWalkaroundAnalysisDone(false);
    setWalkaroundWarnings([]);
    setDressedConvexHullVolume(null);
    setDressedAssumedVolume(null);
    setWalkaroundVideoFile(null);
    setWalkaroundVideoUrl(null);
    setWalkaroundVideoMeta(null);
    setWalkaroundExtracting(false);
    setWalkaroundExtractProgress({ current: 0, total: 40, percent: 0 });
  };

  const extractFramesFromVideo = (file, targetCount = 40) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('Video frame extraction timed out. Please check that video is playable.'));
      }, 60000);

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration;
          if (!duration || duration <= 0 || !isFinite(duration)) {
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            return reject(new Error('Could not read video duration. Please upload a standard MP4, MOV, or WEBM video.'));
          }

          const width = video.videoWidth || 1280;
          const height = video.videoHeight || 720;
          setWalkaroundVideoMeta({
            duration: Math.round(duration * 10) / 10,
            width,
            height,
            sizeMb: (file.size / (1024 * 1024)).toFixed(1),
            name: file.name
          });

          const canvas = document.createElement('canvas');
          const maxDim = 1280;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');

          const frames = [];
          const count = Math.max(30, Math.min(60, targetCount));
          const step = duration / (count + 1);

          for (let i = 1; i <= count; i++) {
            const timestamp = i * step;
            await new Promise((resSeek) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resSeek();
              };
              video.addEventListener('seeked', onSeeked);
              video.currentTime = timestamp;
            });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.88));
            const frameFile = new File([blob], `frame_${String(i).padStart(3, '0')}.jpg`, { type: 'image/jpeg' });
            frames.push(frameFile);

            setWalkaroundExtractProgress({
              current: i,
              total: count,
              percent: Math.round((i / count) * 100)
            });
          }

          clearTimeout(timer);
          URL.revokeObjectURL(url);
          resolve(frames);
        } catch (err) {
          clearTimeout(timer);
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      video.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video file. Please check video codec or format.'));
      };
    });
  };

  const handleProcessVideoFile = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('video/') && !file.name?.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i)) {
      setDressedError('Please select a valid video file (.mp4, .mov, .webm, .mkv).');
      return;
    }

    setDressedError('');
    setWalkaroundVideoFile(file);
    const videoUrl = URL.createObjectURL(file);
    setWalkaroundVideoUrl(videoUrl);
    setWalkaroundExtracting(true);
    setWalkaroundExtractProgress({ current: 0, total: walkaroundTargetFrames, percent: 0 });
    setWalkaroundFiles([]);
    setWalkaroundAnalysisDone(false);
    setDressedBackendVolume(null);
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });

    try {
      const frames = await extractFramesFromVideo(file, walkaroundTargetFrames);
      setWalkaroundFiles(frames);
    } catch (err) {
      setDressedError(err.message || 'Failed to extract frames from video. You can also upload photos directly.');
    } finally {
      setWalkaroundExtracting(false);
    }
  };

  const handleWalkaroundUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    // Check if user uploaded a video
    const videoFile = files.find(f => f.type?.startsWith('video/') || f.name?.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i));
    if (videoFile) {
      setWalkaroundInputType('video');
      handleProcessVideoFile(videoFile);
      return;
    }

    // Validate image format
    const validFiles = files.filter(f => f.type?.startsWith('image/'));
    
    setWalkaroundFiles(prev => [...prev, ...validFiles]);
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setDressedBackendVolume(null);
    setWalkaroundWarnings([]);
    setWalkaroundAnalysisDone(false);
    setDressedConvexHullVolume(null);
    setDressedAssumedVolume(null);
    setDressedError('');
  };

  const handleRemoveWalkaroundFile = (index) => {
    setWalkaroundFiles(prev => prev.filter((_, i) => i !== index));
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setDressedBackendVolume(null);
    setWalkaroundWarnings([]);
    setWalkaroundAnalysisDone(false);
    setDressedConvexHullVolume(null);
    setDressedAssumedVolume(null);
    setDressedError('');
  };

  const handleAnalyzeWalkaroundPhotos = async () => {
    if (walkaroundAnalyzing || walkaroundExtracting) return;
    
    if (walkaroundFiles.length < 30) {
      setDressedError(`Walk-around mode requires at least 30 photos/frames. Currently available: ${walkaroundFiles.length}.`);
      return;
    }
    if (walkaroundFiles.length > 60) {
      setDressedError(`Walk-around mode accepts a maximum of 60 photos/frames. Currently selected: ${walkaroundFiles.length}.`);
      return;
    }

    setWalkaroundAnalyzing(true);
    const currentRequestId = ++activeRequestIdRef.current;
    setDressedError('');
    setDressedReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
    setDressedBackendVolume(null);
    setWalkaroundWarnings([]);
    setWalkaroundAnalysisDone(false);
    setDressedConvexHullVolume(null);
    setDressedAssumedVolume(null);

    try {
      const res = await api.assessWalkaround({
        files: walkaroundFiles,
        allowance_mm: '25.0',
        marker_mm: walkaroundMarkerSizeMm || '200.0'
      });

      if (currentRequestId !== activeRequestIdRef.current) return;

      if (!res || res.success === false) {
        throw new Error(res?.message || 'Walkaround 3D assessment failed.');
      }

      const vol = res.convex_hull_volume_m3 ?? res.volume_m3 ?? res.volume;
      if (vol == null || !Number.isFinite(Number(vol))) {
        throw new Error(res.message || 'The assessment did not return a valid volume reading.');
      }
      
      const toReading = (arr, obbFallback) => {
        if (!arr || !Array.isArray(arr)) return [String((obbFallback / 10).toFixed(1)), String((obbFallback / 10).toFixed(1)), String((obbFallback / 10).toFixed(1)), String((obbFallback / 10).toFixed(1))];
        return arr.map(v => v === null ? '' : String((v / 10).toFixed(1)));
      };

      const obbL = res.obb_dimensions_mm ? res.obb_dimensions_mm.L : 0;
      const obbB = res.obb_dimensions_mm ? res.obb_dimensions_mm.B : 0;
      const obbH = res.obb_dimensions_mm ? res.obb_dimensions_mm.H : 0;

      // Populate candidate readings directly from backend (contains '' for MISSING edges)
      setDressedReadings({
        lengths: toReading(res.lengths_mm, obbL),
        breadths: toReading(res.breadths_mm, obbB),
        heights: toReading(res.heights_mm, obbH),
      });
      setDressedBackendVolume(vol);
      setDressedConvexHullVolume(res.convex_hull_volume_m3 ?? vol);
      setDressedAssumedVolume(res.assumed_dressed_volume_m3 ?? vol);

      if (res.granite_type) {
        const normalized = normalizeGraniteType(res.granite_type);
        if (normalized) {
          setDressedDetails(prev => ({ ...prev, graniteType: normalized }));
        }
      }

      if (res.block_id) {
        setDressedAssessedBlockId(res.block_id);
      }

      const warnings = res.warnings || [];
      if (res.scale_info && res.scale_info.message && res.scale_info.message !== 'OK') {
        warnings.push(`Scale: ${res.scale_info.message}`);
      }
      if (res.edge_quality) {
        Object.entries(res.edge_quality.axis_quality || {}).forEach(([axis, q]) => {
          if (q !== 'GOOD') warnings.push(`[PROTOTYPE] ${axis}-axis edge measurements are ${q}.`);
        });
        const n_good = res.edge_quality.n_good_faces || 0;
        if (n_good < 6) warnings.push(`[PROTOTYPE] Only ${n_good}/6 faces have reliable geometry.`);
      }
      setWalkaroundWarnings(warnings);
      setWalkaroundAnalysisDone(true);

    } catch (err) {
      if (currentRequestId !== activeRequestIdRef.current) return;
      setDressedError(err.message || 'Failed to process walk-around scan.');
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setWalkaroundAnalyzing(false);
      }
    }
  };

  const requiredCount = VIEW_CONFIG.filter(v => v.required).length;
  const uploadedRequired = VIEW_CONFIG.filter(v => v.required && dressedImages[v.key]).length;
  const canProceedDressedPhotos = uploadedRequired >= requiredCount;

  const handleRegisterDressed = async () => {
    if (!dressedCalculations.readingsComplete) {
      setDressedError('Please enter or compute the 4-point statutory readings for Length, Breadth, and Height.');
      return;
    }
    setDressedSubmitting(true);
    setDressedError('');
    try {
      const blockId = dressedAssessedBlockId || ('BLK-' + Date.now().toString().slice(-6));
      const mainFile = captureMode === 'mode_a'
        ? (dressedImages.front?.file || dressedImages.left?.file || dressedImages.right?.file || Object.values(dressedImages).find(img => img?.file)?.file)
        : (walkaroundFiles[0]);

      const res = await api.createBlock({
        block_id: blockId,
        quarry_id: parseInt(quarryId),
        gps: gps.trim(),
        file: mainFile,
        is_draft: false,
        block_type: 'dressed',
        undressed_id: dressedDetails.linkToUndressed ? selectedSourceUdId : null,
        granite_type: dressedDetails.graniteType,
        internal_number: dressedDetails.internalNumber,
        length: parseFloat(dressedCalculations.avgL) || 0,
        breadth: parseFloat(dressedCalculations.avgB) || 0,
        height: parseFloat(dressedCalculations.avgH) || 0,
        length_readings: JSON.stringify(dressedReadings.lengths),
        breadth_readings: JSON.stringify(dressedReadings.breadths),
        height_readings: JSON.stringify(dressedReadings.heights),
        volume: parseFloat(dressedCalculations.vol) || 0,
        measurement_method: captureMode === 'mode_a' ? 'gemini_multi_view' : 'walkaround_3d',
      });

      setDressedResult({
        blockId: res?.id || blockId,
        undressedId: res?.undressed_id || (dressedDetails.linkToUndressed ? selectedSourceUdId : null),
        graniteType: dressedDetails.graniteType,
        length: dressedCalculations.avgL,
        breadth: dressedCalculations.avgB,
        height: dressedCalculations.avgH,
        volume: dressedCalculations.vol,
        weight: dressedCalculations.weight,
        spaceDiagonalM: dressedCalculations.spaceDiagonalM,
        spaceDiagonalCm: dressedCalculations.spaceDiagonalCm,
        faceDiagonalLB: dressedCalculations.faceDiagonalLB,
        faceDiagonalLH: dressedCalculations.faceDiagonalLH,
        faceDiagonalBH: dressedCalculations.faceDiagonalBH,
        surfaceAreaM2: dressedCalculations.surfaceAreaM2,
        rawVol: dressedCalculations.rawVol,
        volumeDiff: dressedCalculations.volumeDiff,
        yieldPct: dressedCalculations.yieldPct,
        wastePct: dressedCalculations.wastePct,
        readings: dressedReadings,
        tier: dressedCalculations.tier,
      });
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      setDressedError(err.message || 'Failed to register dressed block.');
    } finally {
      setDressedSubmitting(false);
    }
  };

  const resetDressed = () => {
    setDressedStep(0);
    setDressedImages({});
    setDressedResult(null);
    setDressedError('');
    setDressedAnalyzing(false);
    setDressedAnalysisDone(false);
    setDressedCuboidMetrics(null);
    setDressedBackendVolume(null);
    setDressedReadings({
      lengths: ['', '', '', ''],
      breadths: ['', '', '', ''],
      heights: ['', '', '', ''],
    });
  };

  const resetUndressed = () => {
    setUdResult(null);
    setUdError('');
    setUdPhotos([]);
    setUdAnalyzing(false);
    setUdAnalysisDone(false);
    setUdArucoInfo(null);
    setUdAssumedDressed(null);
    setUdBackendVolume(null);
    setUdMarkedImage(null);
    setUdReadings({ lengths: ['', '', '', ''], breadths: ['', '', '', ''], heights: ['', '', '', ''] });
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div className="page-header" style={{ alignItems: 'flex-start', justifyContent: 'space-between', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
              {t('AP DMG Registry Flow')}
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
              {t('Quarry #')}{quarryId}
            </span>
          </div>
          <h1 className="page-title">{t('Granite Block Categorization & Registration')}</h1>
          <p className="page-subtitle">
            {t('Record raw blasted blocks from the quarry pit or measure dressed rectangular blocks for DMGO check inspection.')}
          </p>
        </div>

        {/* Printable ArUco Marker Download Button */}
        <a
          href="/api/aruco-marker.png"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: 8,
            border: '1.5px solid #0284C7',
            color: '#0369A1',
            background: '#F0F9FF',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(2,132,199,0.12)'
          }}
          title="Print official 200mm A4 ArUco Marker for quarry photography"
        >
          <Scan size={18} color="#0284C7" />
          <span>📥 Printable ArUco Marker (200mm A4)</span>
        </a>
      </div>

      {/* Category Switcher Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {/* Category A: Undressed */}
        <button
          type="button"
          onClick={() => { setCategory('undressed'); resetUndressed(); }}
          style={{
            background: category === 'undressed' ? '#FFFBEB' : '#FFFFFF',
            border: `2px solid ${category === 'undressed' ? '#E67E22' : '#DBEAFE'}`,
            borderRadius: 12,
            padding: '16px 20px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: category === 'undressed' ? '0 4px 14px rgba(230,126,34,0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: category === 'undressed' ? '#FEF3C7' : '#EFF6FF',
            color: category === 'undressed' ? '#B45309' : '#1A56DB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Mountain size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
                🪨 {t('Undressed Block')}
              </div>
              <span className="badge badge-gold" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
                {t('Phase 1: Pit Excavation')}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#78350F', margin: 0, lineHeight: 1.35 }}>
              {t('Newly blasted / split raw rough block. Record largest bounding edges (L, B, H in cm), quarry GPS & pit photo.')}
            </p>
          </div>
        </button>

        {/* Category B: Dressed */}
        <button
          type="button"
          onClick={() => { setCategory('dressed'); resetDressed(); }}
          style={{
            background: category === 'dressed' ? '#EFF6FF' : '#FFFFFF',
            border: `2px solid ${category === 'dressed' ? '#1A56DB' : '#DBEAFE'}`,
            borderRadius: 12,
            padding: '16px 20px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: category === 'dressed' ? '0 4px 14px rgba(26,86,219,0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: category === 'dressed' ? '#DBEAFE' : '#EFF6FF',
            color: category === 'dressed' ? '#1A56DB' : '#0F1729',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Layers size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
                📐 {t('Dressed Block')}
              </div>
              <span className="badge badge-blue" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
                {t('Phase 2: Dressing Yard AI')}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#1E3A8A', margin: 0, lineHeight: 1.35 }}>
              {t('Trimmed rectangular block for DMGO check measurement. Multi-view AI photogrammetry (4 readings per dimension).')}
            </p>
          </div>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FLOW 1: UNDRESSED (RAW PIT EXCAVATION)
          ───────────────────────────────────────────────────────────────────────────── */}
      {category === 'undressed' && (
        <>
          {udResult ? (
            /* Undressed Success Screen */
            <div className="card" style={{ textAlign: 'center', padding: '44px 32px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#FEF3C7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <Mountain size={38} color="#D97706" />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F1729', marginBottom: 6 }}>
                {t('Undressed Block Registered!')}
              </h2>
              <p style={{ color: '#78350F', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 20px' }}>
                {t('The raw extracted granite block has been successfully registered in the AP Mines inventory. System has assigned an immutable Undressed Block identifier.')}
              </p>

              {/* ID Badge */}
              <div style={{
                background: '#FFFBEB', padding: '16px 24px', borderRadius: 12,
                border: '2px dashed #F59E0B', maxWidth: 420, margin: '0 auto 24px'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('Government Undressed Block ID')}
                </div>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 900, color: '#B45309',
                  fontFamily: "'JetBrains Mono', monospace", marginTop: 4
                }}>
                  {udResult.undressedId}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: 4 }}>
                  {t('Internal Reference')}: <strong>{udResult.blockId}</strong> • {t('Raw Estimated Volume')}: <strong>{udResult.volume} m³</strong>
                </div>
              </div>

              {/* Regulatory Notice */}
              <div className="alert alert-gold" style={{ textAlign: 'left', marginBottom: 24 }}>
                <FileCheck size={18} />
                <div>
                  <strong>{t('AP DMG Orientation Next Step:')}</strong> {t('When this block is dressed in the yard, use "Dressed Block" to capture multi-view photogrammetric photos. Selecting this Undressed ID preserves the chain of custody and proves dressing yield.')}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, margin: '0 auto' }}>
                <button
                  className="btn btn-accent"
                  style={{ justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}
                  onClick={() => handleProceedToDress(udResult.blockId, udResult.undressedId)}
                >
                  <Scissors size={18} /> {t('Dress & Measure This Block Now →')}
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <a
                    href={`/track/${udResult.blockId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                  >
                    <ExternalLink size={15} /> {t('Track UD Lifecycle')}
                  </a>
                  {onNavigateToBlocks && (
                    <button className="btn btn-primary" onClick={onNavigateToBlocks} style={{ flex: 1, justifyContent: 'center' }}>
                      <List size={15} /> {t('View in Blocks List')}
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={resetUndressed} style={{ flex: 1, justifyContent: 'center' }}>
                    <RefreshCw size={15} /> {t('Register Another')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Undressed Registration Form — ArUco & AI Image-Driven Photogrammetry */
            <form onSubmit={handleRegisterUndressed} className="card card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                    {t('Register Raw Undressed Block (Pit Extraction)')}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#78350F', margin: '4px 0 0' }}>
                    {t('AP Mines & Geology Department Rule: Photo-based dimension estimation via ArUco marker & AI.')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleLoadDemoPitPhotos}
                  disabled={udAnalyzing}
                  style={{ color: '#E67E22', fontWeight: 700 }}
                >
                  <Sparkles size={14} /> {udAnalyzing ? t('⚡ Analyzing…') : t('⚡ Demo Pit Photo & ArUco Analysis')}
                </button>
              </div>

              {/* Department Rule Banner */}
              <div className="alert alert-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 260 }}>
                  <Compass size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.82rem' }}>
                    <strong>{t('Pit Extraction Protocol (Rule 12):')}</strong> {t('Upload pit photo(s) of the raw blasted block. Place a 200mm ArUco calibration marker (DICT_4X4_50) on the block face for millimeter-accurate scale calibration. The system automatically measures all 4 readings for Length, Breadth, and Height along edges with zero manual input.')}
                  </div>
                </div>
                <a
                  href="/api/aruco-marker.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#FEF3C7',
                    border: '1px solid #D97706',
                    color: '#92400E',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6
                  }}
                >
                  <Scan size={14} /> 📥 {t('Print 200mm Marker')}
                </a>

                {/* Marker size selection toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px dashed #FDE68A', width: '100%' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78350F' }}>
                    📐 {t('Printed Marker Size:')}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setUdMarkerSizeMm(200.0)}
                      className="btn btn-xs"
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid #D97706',
                        background: udMarkerSizeMm === 200.0 ? '#D97706' : '#FFFFFF',
                        color: udMarkerSizeMm === 200.0 ? '#FFFFFF' : '#92400E',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ 200 mm (A4 Full Sheet — Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUdMarkerSizeMm(100.0)}
                      className="btn btn-xs"
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid #D97706',
                        background: udMarkerSizeMm === 100.0 ? '#D97706' : '#FFFFFF',
                        color: udMarkerSizeMm === 100.0 ? '#FFFFFF' : '#92400E',
                        cursor: 'pointer'
                      }}
                    >
                      100 mm (Compact)
                    </button>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#B45309' }}>
                    {udMarkerSizeMm === 200.0 ? '(Matches downloadable 200mm template)' : '(For half-size printed markers)'}
                  </span>
                </div>
              </div>

              {/* Quarry ID + Granite Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">{t('Quarry Identification')}</label>
                  <input
                    type="text"
                    className="form-control"
                    disabled
                    value={user?.quarry_name || `${t('Quarry')} #${quarryId}`}
                    style={{ background: '#FFFDF9' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('Mineral Granite Type')}
                    {udAnalysisDone && (
                      <span className="badge badge-gold" style={{ fontSize: '0.62rem', marginLeft: 8 }}>
                        {t('AI Verified')}
                      </span>
                    )}
                  </label>
                  <select
                    className="form-control"
                    value={udType}
                    onChange={e => setUdType(e.target.value)}
                  >
                    {GRANITE_TYPES.map(gType => <option key={gType} value={gType}>{t(gType)}</option>)}
                  </select>
                </div>
              </div>

              {/* Statutory Mobile Telemetry & Metadata Card */}
              {renderMobileTelemetryCard(proposedUdId, false)}

              {/* ── PHOTO UPLOAD & ARUCO / AI ANALYSIS ZONE ── */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1.5px dashed #F59E0B',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#FEF3C7',
                      color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Camera size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F1729' }}>
                        {t('Upload Undressed Block Photos')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#78350F' }}>
                        {t('Upload exactly 5 distinct face photos in this order: Top, Left, Right, Front, Rear. Place the ArUco marker in the plane of each photographed face.')}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                    {udPhotos.length}/5 {t('Photos')}
                  </span>
                </div>

                {/* Upload Trigger Dropzone */}
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  background: '#FFFDF4',
                  borderRadius: 10,
                  border: '1px dashed #D97706',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  textAlign: 'center',
                  gap: 8
                }}>
                  <input
                    id="ud-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={udAnalyzing}
                  />
                  <input
                    id="ud-camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={udAnalyzing}
                  />
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', background: '#FEF3C7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706'
                    }}>
                      <Camera size={22} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E' }}>
                    {t('Tap to Capture or Upload Pit Photos')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78350F', maxWidth: 440 }}>
                    {t('Accepts JPG/PNG from mobile camera or gallery. GPS coordinates and quarry timestamp are automatically embedded.')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => document.getElementById('ud-camera-input')?.click()}
                      style={{ background: '#F59E0B', color: '#FFFFFF', border: 'none', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      <Camera size={14} /> {t('📸 Mobile Camera')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => document.getElementById('ud-file-input')?.click()}
                      style={{ background: '#FFFFFF', color: '#92400E', border: '1px solid #D97706', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      <Upload size={14} /> {t('📁 Browse Gallery')}
                    </button>
                  </div>
                </label>

                {/* Photo Previews */}
                {udPhotos.length > 0 && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                      {udPhotos.map((photo, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid #FDE68A',
                            background: '#FFFBEB',
                            height: 100
                          }}
                        >
                          <img
                            src={photo.preview}
                            alt={`Pit Photo ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.5) 75%, transparent 100%)',
                            color: '#FFFFFF', padding: '4px 6px', fontSize: '0.58rem', lineHeight: 1.25
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FCD34D', fontWeight: 800 }}>
                              <span>📍 {gps}</span>
                              <span>{UNDRESSED_VIEW_ORDER[idx] ? t(UNDRESSED_VIEW_ORDER[idx][0].toUpperCase() + UNDRESSED_VIEW_ORDER[idx].slice(1)) : `#${idx + 1}`}</span>
                            </div>
                            <div style={{ color: '#E2E8F0', fontSize: '0.52rem', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{proposedUdId}</span>
                              <span>🕒 {currentTimeStr.slice(-11)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            style={{
                              position: 'absolute', top: 4, right: 4,
                              background: '#EF4444', color: '#FFFFFF', border: 'none',
                              borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Action Button: Compute Dimensions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                      <button
                        type="button"
                        className="btn btn-accent"
                        onClick={() => handleAnalyzeUndressedPhotos()}
                        disabled={udAnalyzing}
                        style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                      >
                        <Sparkles size={16} />
                        {udAnalyzing
                          ? t(`Analyzing with ArUco & AI… (${udElapsed}s)`)
                          : t('⚡ Compute Dimensions via ArUco & AI')}
                      </button>

                      {udAnalyzing && (
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: 4, fontWeight: 600 }}>
                            🔬 {t('Processing 5 face photos via ArUco calibration & AI… Please wait.')}
                          </div>
                          <div style={{ height: 6, background: '#FEF3C7', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(95, (udElapsed / 90) * 100)}%`,
                              background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                              borderRadius: 4,
                              transition: 'width 1s linear'
                            }} />
                          </div>
                        </div>
                      )}

                      {udAnalysisDone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>
                          <CheckCircle size={16} /> {t('Dimensions calculated successfully from photos!')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ArUco / AI Detection Status Banner */}
                {udArucoInfo && (
                  <div style={{
                    background: udArucoInfo.detected ? '#ECFDF5' : '#FFFBEB',
                    border: `1px solid ${udArucoInfo.detected ? '#A7F3D0' : '#FDE68A'}`,
                    padding: '10px 14px',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    {udArucoInfo.detected ? (
                      <CheckCircle size={18} color="#059669" />
                    ) : (
                      <Cpu size={18} color="#D97706" />
                    )}
                    <div style={{ fontSize: '0.78rem', color: udArucoInfo.detected ? '#065F46' : '#78350F' }}>
                      <strong>{udArucoInfo.detected ? t('ArUco Scale Verified:') : t('Computer Vision Calibrated:')}</strong> {udArucoInfo.info}
                      {udArucoInfo.confidence && (
                        <span style={{ marginLeft: 6, fontWeight: 700 }}>
                          • {t('Confidence')}: {udArucoInfo.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 4-READING DIMENSION CARDS (AUTO-POPULATED BY ARUCO/AI) ── */}
              <div style={{ background: '#FFFBEB', padding: '18px 20px', borderRadius: 12, border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('Raw Bounding Dimensions — 4 Readings per Axis (Rule 12)')}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 500, color: '#78350F' }}>
                      {udAnalysisDone
                        ? t('✓ Automatically extracted from pit photos via ArUco marker & Computer Vision.')
                        : t('Upload block photo(s) above and click "Compute Dimensions" to populate readings automatically.')}
                    </div>
                  </div>

                  {udAnalysisDone && (
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle size={12} /> {t('Auto-Calculated')}
                    </span>
                  )}
                </div>

                {/* LENGTH, BREADTH, HEIGHT READINGS */}
                {[
                  ['lengths', 'Length (L)', udCalculations.maxL, udCalculations.lM, udCalculations.avgL],
                  ['breadths', 'Breadth (B)', udCalculations.maxB, udCalculations.bM, udCalculations.avgB],
                  ['heights', 'Height (H)', udCalculations.maxH, udCalculations.hM, udCalculations.avgH]
                ].map(([key, label, maxVal, maxM, avgVal]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350F' }}>
                        📏 {t(label)} (cm)
                      </div>
                      {maxVal > 0 && (
                        <div style={{
                          fontSize: '0.7rem', background: '#FEF3C7', color: '#B45309',
                          border: '1px solid #FDE68A', borderRadius: 6, padding: '2px 10px', fontWeight: 700
                        }}>
                          Avg: <strong>{(avgVal || 0).toFixed(1)} cm</strong> ({(parseFloat(avgVal || 0) / 100).toFixed(2)} m) • Max (Rule 12): <strong>{maxVal} cm</strong> = {maxM} m
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: '0.62rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>
                            {t('Reading')} {i + 1}{i === 0 ? ` *` : ''}
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="1500"
                            className="form-control"
                            placeholder={i === 0 ? 'Auto / cm' : 'Auto / cm'}
                            required={i === 0}
                            value={udReadings[key][i]}
                            onChange={e => {
                              const arr = [...udReadings[key]];
                              arr[i] = e.target.value;
                              setUdReadings(p => ({ ...p, [key]: arr }));
                            }}
                            style={{
                              fontSize: '0.88rem',
                              background: udReadings[key][i] ? '#FFFDF4' : '#FFFFFF',
                              borderColor: udReadings[key][i] && parseFloat(udReadings[key][i]) === maxVal && maxVal > 0
                                ? '#D97706' : undefined,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* ── LIVE CALCULATION DASHBOARD (EXACTLY 4 REQUIRED SPECIFICATIONS) ── */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  background: '#FFFFFF', padding: '14px 16px', borderRadius: 10,
                  border: '1.5px solid #FDE68A', gap: 12, marginTop: 4
                }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('Statutory Volume (Rule 12)')}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#B45309', fontFamily: "'JetBrains Mono', monospace" }}>
                      {udCalculations.vol} m³
                    </div>
                    {parseFloat(udCalculations.boundingVol) > parseFloat(udCalculations.vol) && (
                      <div style={{ fontSize: '0.66rem', color: '#92400E', fontWeight: 600, marginTop: 2 }}>
                        Envelope Max: <strong>{udCalculations.boundingVol} m³</strong>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('Estimated Raw Weight')}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                      ~{udCalculations.weight} MT
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('Expected Slab Tier')}
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.72rem', marginTop: 2, display: 'inline-block' }}>
                      {t(udCalculations.tier)}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('Super Gangsaw')}
                    </div>
                    <span
                      className={`badge ${udCalculations.gangsawClass === 'Super Gangsaw' ? 'badge-gold' : 'badge-blue'}`}
                      style={{ fontSize: '0.72rem', marginTop: 2, display: 'inline-block' }}
                    >
                      {t(udCalculations.gangsawClass || '—')}
                    </span>
                  </div>
                </div>
              </div>

              {/* GPS Coordinates (full width) */}
              <div className="form-group">
                <label className="form-label">{t('Quarry GPS Coordinates')}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={gps}
                    onChange={e => setGps(e.target.value)}
                    placeholder="Lat, Long"
                  />
                  <span className={`badge ${gpsStatus === 'ok' ? 'badge-green' : 'badge-gold'}`}>
                    <MapPin size={10} /> {gpsStatus === 'ok' ? t('GPS OK') : t('Default')}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#78350F', margin: '6px 0 0' }}>
                  {t('Coordinates will be stamped onto the blockchain audit log for mining provenance.')}
                </p>
              </div>

              {udError && (
                <div className="alert alert-rose">
                  <AlertCircle size={16} /> {udError}
                </div>
              )}

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={udSubmitting || !udCalculations.readingsComplete || udAnalyzing}
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  {udSubmitting ? (
                    <>{t('Registering Undressed Block…')}</>
                  ) : (
                    <>
                      <CheckCircle size={16} /> {t('Register Undressed Block (Assign UD-ID)')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          FLOW 2: DRESSED (DRESSING YARD & MULTI-VIEW AI)
          ───────────────────────────────────────────────────────────────────────────── */}
      {category === 'dressed' && (
        <>
          {dressedResult ? (
            /* Dressed Success Screen */
            <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <CheckCircle size={38} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F1729', marginBottom: 6 }}>
                {t('Dressed Block Registered & AI Measured!')}
              </h2>
              <p style={{ color: '#1E3A8A', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 20px' }}>
                {t('Multi-view photogrammetry complete. The block has been assigned a commercial BLK ID and 4-reading dimensions are logged.')}
              </p>

              {/* Block ID & Provenance */}
              <div style={{
                background: '#EFF6FF', padding: '16px 24px', borderRadius: 12,
                border: '1px solid #BFDBFE', maxWidth: 540, margin: '0 auto 20px'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#1A56DB', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('Commercial Dressed Block ID')}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                  {dressedResult.blockId}
                </div>
                {dressedResult.undressedId && (
                  <div style={{
                    fontSize: '0.78rem', color: '#065F46', background: '#D1FAE5',
                    padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginTop: 8, fontWeight: 700
                  }}>
                    {t('🔗 Provenance Linked: Source Undressed ID')} {dressedResult.undressedId}
                  </div>
                )}

                {/* Omni Geometry & Yield Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: 10, marginTop: 14, textAlign: 'left',
                  background: '#FFFFFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #DBEAFE'
                }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{t('Dimensions')}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                      {dressedResult.length} × {dressedResult.breadth} × {dressedResult.height} cm
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#1A56DB', fontWeight: 700, textTransform: 'uppercase' }}>{t('Dressed Volume')}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace" }}>
                      {dressedResult.volume} m³
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{t('Space Diagonal (d)')}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                      {dressedResult.spaceDiagonalM} m
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{t('Surface Area (A)')}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                      {dressedResult.surfaceAreaM2} m²
                    </div>
                  </div>
                </div>

                {/* Volume Variance vs Source Undressed Block */}
                {dressedResult.rawVol && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px', borderRadius: 8,
                    background: '#F0FDF4', border: '1px solid #86EFAC',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
                        {t('Omni Volumetric Variance (Raw vs Dressed)')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                        {t('Raw')}: <strong>{dressedResult.rawVol} m³</strong> → {t('Dressed')}: <strong>{dressedResult.volume} m³</strong> (Δ {dressedResult.volumeDiff} m³)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        {dressedResult.yieldPct}% {t('Recovery Yield')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="alert alert-blue" style={{ textAlign: 'left', marginBottom: 24, maxWidth: 540, margin: '0 auto 24px' }}>
                <Layers size={18} />
                <div>
                  <strong>{t('Ready for DMGO Check Measurement:')}</strong> {t('You can now select this block from the Granite Blocks list and click "Raise DMGO Request" for district verification.')}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, margin: '0 auto' }}>
                <a
                  href={`/track/${dressedResult.blockId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-accent"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '12px' }}
                >
                  <ExternalLink size={16} /> {t('Track Digital Lifecycle Status')}
                </a>
                <div style={{ display: 'flex', gap: 10 }}>
                  {onNavigateToBlocks && (
                    <button className="btn btn-primary" onClick={onNavigateToBlocks} style={{ flex: 1, justifyContent: 'center' }}>
                      <List size={16} /> {t('View in Blocks List')}
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={resetDressed} style={{ flex: 1, justifyContent: 'center' }}>
                    <RefreshCw size={16} /> {t('Register Another Dressed Block')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Dressed Multi-Step Wizard */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step indicator */}
              <div className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'space-between' }}>
                  {DRESSED_STEPS.map((label, idx) => (
                    <React.Fragment key={label}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 60 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: idx < dressedStep ? '#10B981' : idx === dressedStep ? '#1A56DB' : '#EFF6FF',
                          border: `2px solid ${idx < dressedStep ? '#10B981' : idx === dressedStep ? '#1A56DB' : '#DBEAFE'}`,
                          color: idx <= dressedStep ? '#fff' : '#1E3A8A',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s',
                          boxShadow: idx === dressedStep ? '0 0 0 4px #DBEAFE' : 'none',
                        }}>
                          {idx < dressedStep ? <CheckCircle size={18} /> : idx + 1}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: idx === dressedStep ? '#1A56DB' : '#1E3A8A', marginTop: 5, textAlign: 'center' }}>
                          {t(label)}
                        </div>
                      </div>
                      {idx < DRESSED_STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: idx < dressedStep ? '#10B981' : '#DBEAFE', transition: 'background 0.3s', marginBottom: 18 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Provenance Box (Select source undressed block) */}
              <div className="card" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scissors size={18} color="#1A56DB" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F1729' }}>
                      {t('AP DMG Provenance: Converted from an Undressed Block?')}
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#1A56DB' }}>
                    <input
                      type="checkbox"
                      checked={dressedDetails.linkToUndressed}
                      onChange={e => setDressedDetails(p => ({ ...p, linkToUndressed: e.target.checked }))}
                    />
                    {t('Link Raw Source Block')}
                  </label>
                </div>

                {dressedDetails.linkToUndressed && (
                  <div style={{ marginTop: 8 }}>
                    {undressedInventory.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#B45309', background: '#FFFBEB', padding: '10px 14px', borderRadius: 8 }}>
                        ⚠️ {t('No active undressed blocks found for Quarry #')}{quarryId}.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select
                          className="form-control"
                          value={selectedSourceUdId}
                          onChange={e => setSelectedSourceUdId(e.target.value)}
                        >
                          <option value="">{t('-- Select Source Undressed Block --')}</option>
                          {undressedInventory.map(b => (
                            <option key={b.id} value={b.undressed_id || b.id}>
                              {b.undressed_id || b.id} • {t(b.seigniorage?.granite_type || 'Granite')} • {b.undressed_volume ? `${b.undressed_volume} m³` : 'Raw Pit'}
                            </option>
                          ))}
                        </select>

                        {selectedSourceBlock && (
                          <div style={{
                            background: '#F0FDF4', padding: '10px 14px', borderRadius: 8,
                            border: '1px solid #6EE7B7', fontSize: '0.78rem', color: '#065F46',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <strong>{t('Source UD ID:')}</strong> {selectedSourceBlock.undressed_id || selectedSourceBlock.id}
                              <br />
                              <strong>{t('Raw Dimensions:')}</strong> {selectedSourceBlock.undressed_length} × {selectedSourceBlock.undressed_breadth} × {selectedSourceBlock.undressed_height} cm
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong>{t('Raw Volume:')}</strong> {selectedSourceBlock.undressed_volume || '—'} m³
                              <br />
                              <span style={{ color: '#059669', fontWeight: 700 }}>{t('Chain of Custody Active')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Capture Mode Selector */}
              <div className="card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F1729' }}>
                  {t('Capture Mode:')}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: captureMode === 'mode_a' ? '#1A56DB' : '#475569' }}>
                  <input
                    type="radio"
                    name="captureMode"
                    value="mode_a"
                    checked={captureMode === 'mode_a'}
                    onChange={() => handleCaptureModeChange('mode_a')}
                  />
                  <strong>{t('Mode A — Five-Face Capture')}</strong>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: captureMode === 'mode_b' ? '#1A56DB' : '#475569' }}>
                  <input
                    type="radio"
                    name="captureMode"
                    value="mode_b"
                    checked={captureMode === 'mode_b'}
                    onChange={() => handleCaptureModeChange('mode_b')}
                  />
                  <strong>{t('Mode B — Walk-Around 3D Scan')}</strong>
                </label>
              </div>

              {/* Step 0 — Photos */}
              {dressedStep === 0 && (
                <div className="card card-blue" style={{ position: 'relative' }}>
                  {captureMode === 'mode_a' ? (
                    <>
                  {/* Toast Alert for Paste/Drop Actions */}
                  {pasteToast && (
                    <div style={{
                      position: 'fixed',
                      top: 24,
                      right: 24,
                      zIndex: 9999,
                      background: '#0F172A',
                      color: '#38BDF8',
                      border: '1.5px solid #38BDF8',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      borderRadius: 10,
                      padding: '12px 20px',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>{pasteToast}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F1729', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📷 {t('Capture / Upload All 5 Dressed Block Photographs')}</span>
                        <span style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1E3A8A', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                          Rule 12 Photogrammetry
                        </span>
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#1E3A8A', margin: 0 }}>
                        {t('Support for mobile camera capture, copy-paste (Ctrl+V), or drag-and-drop of all 5 multi-view faces.')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => startLiveCamera('front')}
                        style={{
                          background: 'linear-gradient(135deg, #1E3A8A 0%, #1A56DB 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px rgba(26,86,219,0.25)'
                        }}
                      >
                        <Video size={15} /> 📱 {t('Live Mobile/Webcam Viewfinder')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleFillDemoDressedPhotos}
                        disabled={dressedAnalyzing}
                        style={{ color: '#E67E22', fontWeight: 700 }}
                      >
                        {dressedAnalyzing ? t('⚡ Analyzing…') : t('⚡ Demo Auto-Fill & AI')}
                      </button>
                    </div>
                  </div>

                  {/* Statutory Mobile Telemetry & Metadata Card */}
                  <div style={{ marginBottom: 16 }}>
                    {renderMobileTelemetryCard(proposedDressedId, true)}
                  </div>

                  {/* Marker size selection toggle for Dressed block */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1' }}>
                      📐 {t('Printed Marker Size:')}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setDressedMarkerSizeMm(200.0)}
                        className="btn btn-xs"
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '1px solid #0284C7',
                          background: dressedMarkerSizeMm === 200.0 ? '#0284C7' : '#FFFFFF',
                          color: dressedMarkerSizeMm === 200.0 ? '#FFFFFF' : '#0369A1',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ 200 mm (A4 Full Sheet — Default)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDressedMarkerSizeMm(100.0)}
                        className="btn btn-xs"
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '1px solid #0284C7',
                          background: dressedMarkerSizeMm === 100.0 ? '#0284C7' : '#FFFFFF',
                          color: dressedMarkerSizeMm === 100.0 ? '#FFFFFF' : '#0369A1',
                          cursor: 'pointer'
                        }}
                      >
                        100 mm (Compact)
                      </button>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#0284C7' }}>
                      {dressedMarkerSizeMm === 200.0 ? '(Matches downloadable 200mm template)' : '(For half-size printed markers)'}
                    </span>
                  </div>

                  {/* ── UNIFIED DRAG & DROP / MULTI-IMAGE UPLOAD ZONE (ALL 5 IMAGES) ── */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDressedDragOverKey('bulk'); }}
                    onDragLeave={() => setDressedDragOverKey(null)}
                    onDrop={handleBulkDrop}
                    style={{
                      background: dressedDragOverKey === 'bulk' ? '#EFF6FF' : '#F8FAFC',
                      border: `2px dashed ${dressedDragOverKey === 'bulk' ? '#2563EB' : '#93C5FD'}`,
                      borderRadius: 12,
                      padding: '16px 20px',
                      marginBottom: 18,
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      boxShadow: dressedDragOverKey === 'bulk' ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none'
                    }}
                  >
                    <input
                      id="dressed-bulk-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) {
                          setDressedImages(prev => assignFilesToDressedViews(files, prev));
                          setPasteToast(`✓ Loaded ${files.length} photo(s) into multi-view photogrammetry slots!`);
                          setTimeout(() => setPasteToast(null), 4000);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                        <div style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: '#DBEAFE',
                          color: '#1E3A8A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FolderUp size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.9rem' }}>
                            {t('Drag & Drop all 5 photos here at once, or select files')}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                            {t('Auto-assigns to Front, Left, Right, Rear, Top by filename or order • Paste (Ctrl+V) anywhere on page')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => document.getElementById('dressed-bulk-file-input')?.click()}
                          style={{ fontWeight: 700, padding: '7px 12px', fontSize: '0.78rem' }}
                        >
                          <Upload size={14} /> {t('Select Multiple Files')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleManualPaste('front')}
                          style={{ color: '#1A56DB', fontWeight: 700, padding: '7px 12px', fontSize: '0.78rem' }}
                          title="Paste image currently in your clipboard"
                        >
                          <Copy size={14} /> {t('Paste from Clipboard (Ctrl+V)')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── 5-VIEW PHOTOGRAMMETRIC CARD GRID ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {VIEW_CONFIG.map(({ key, label, desc, emoji, required }) => {
                      const img = dressedImages[key];
                      const isDragOver = dressedDragOverKey === key;
                      const isFocused = focusedTargetKey === key;

                      return (
                        <div
                          key={key}
                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDressedDragOverKey(key); }}
                          onDragLeave={() => setDressedDragOverKey(null)}
                          onDrop={e => handleCardDrop(key, e)}
                          onClick={() => setFocusedTargetKey(key)}
                          style={{
                            borderRadius: 12,
                            overflow: 'hidden',
                            border: `2px solid ${
                              isDragOver ? '#2563EB' :
                              img ? '#10B981' :
                              isFocused ? '#3B82F6' :
                              required ? '#BFDBFE' : '#E2E8F0'
                            }`,
                            background: isDragOver ? '#DBEAFE' : img ? '#F0FDF4' : '#FFFFFF',
                            transition: 'all 0.15s',
                            position: 'relative',
                            boxShadow: isDragOver ? '0 0 0 4px rgba(37,99,235,0.2)' : isFocused ? '0 2px 8px rgba(59,130,246,0.15)' : 'none',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Hidden Inputs for File & Native Mobile Camera */}
                          <input
                            id={`dressed-file-${key}`}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => handleDressedFileChange(key, e.target.files?.[0])}
                          />
                          <input
                            id={`dressed-mobile-cam-${key}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={e => handleDressedFileChange(key, e.target.files?.[0])}
                          />

                          {/* Header / Badges */}
                          <div style={{
                            padding: '8px 10px',
                            background: img ? '#ECFDF5' : '#F8FAFC',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F1729', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span>{emoji}</span> {t(label)}
                            </span>
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: img ? '#DCFCE7' : required ? '#DBEAFE' : '#F1F5F9',
                              color: img ? '#166534' : required ? '#1E3A8A' : '#64748B'
                            }}>
                              {img ? t('✓ UPLOADED') : required ? t('REQUIRED') : t('OPTIONAL')}
                            </span>
                          </div>

                          {/* Body: Preview OR Upload Options */}
                          {img ? (
                            <div style={{ position: 'relative', flex: 1, minHeight: 140 }}>
                              <img src={img.url} alt={label} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                              <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.5) 75%, transparent 100%)',
                                color: '#FFFFFF', padding: '6px 8px', fontSize: '0.58rem', lineHeight: 1.25
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8', fontWeight: 800 }}>
                                  <span>📍 {gps}</span>
                                  <span>{label}</span>
                                </div>
                                <div style={{ color: '#E2E8F0', fontSize: '0.52rem', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{proposedDressedId}</span>
                                  <span>🕒 {currentTimeStr.slice(-11)}</span>
                                </div>
                              </div>

                              {/* Remove Button */}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setDressedImages(p => { const n = {...p}; delete n[key]; return n; });
                                }}
                                title="Remove photo"
                                style={{
                                  position: 'absolute', top: 6, right: 6, width: 24, height: 24,
                                  borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                                }}
                              >
                                <X size={13} />
                              </button>

                              {/* Retake/Replace mini toolbar */}
                              <div style={{
                                padding: '6px 8px',
                                background: '#FFFFFF',
                                borderTop: '1px solid #E2E8F0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 4
                              }}>
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`dressed-mobile-cam-${key}`)?.click()}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px 6px', fontSize: '0.68rem', color: '#1A56DB' }}
                                  title="Retake via Mobile Camera"
                                >
                                  <Smartphone size={12} /> {t('Retake')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startLiveCamera(key)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px 6px', fontSize: '0.68rem', color: '#047857' }}
                                  title="Live Cam"
                                >
                                  <Video size={12} /> {t('Live')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`dressed-file-${key}`)?.click()}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px 6px', fontSize: '0.68rem', color: '#475569' }}
                                  title="Browse File"
                                >
                                  <Upload size={12} /> {t('File')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 10
                            }}>
                              <div>
                                <div style={{ fontSize: '1.8rem', marginBottom: 2 }}>{emoji}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{t(desc)}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 2 }}>
                                  {isDragOver ? t('Drop image to attach!') : t('Drag image here, or choose:')}
                                </div>
                              </div>

                              {/* Interactive Capture Action Buttons */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%', marginTop: 4 }}>
                                {/* 1. Mobile Camera (Native Camera on Android/iOS) */}
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`dressed-mobile-cam-${key}`)?.click()}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    color: '#1E3A8A',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    padding: '5px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                  }}
                                  title="Open Mobile Device Camera"
                                >
                                  <Smartphone size={13} color="#2563EB" /> {t('Mobile')}
                                </button>

                                {/* 2. Live Camera Viewfinder Modal */}
                                <button
                                  type="button"
                                  onClick={() => startLiveCamera(key)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    color: '#166534',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    padding: '5px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                  }}
                                  title="Open In-Browser Live Viewfinder"
                                >
                                  <Video size={13} color="#16A34A" /> {t('Live Cam')}
                                </button>

                                {/* 3. Clipboard Paste */}
                                <button
                                  type="button"
                                  onClick={() => handleManualPaste(key)}
                                  className="btn btn-sm"
                                  style={{
                                    background: isFocused ? '#FEF3C7' : '#F8FAFC',
                                    border: `1px solid ${isFocused ? '#FCD34D' : '#E2E8F0'}`,
                                    color: '#92400E',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    padding: '5px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                  }}
                                  title="Paste copied image from clipboard (Ctrl+V)"
                                >
                                  <Copy size={13} color="#D97706" /> {t('Paste')}
                                </button>

                                {/* 4. Standard File Browse */}
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`dressed-file-${key}`)?.click()}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    color: '#334155',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    padding: '5px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                  }}
                                  title="Browse image file from disk"
                                >
                                  <Upload size={13} color="#64748B" /> {t('Browse')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                    </>
                  ) : (
                    /* Walkaround 3D Mode */
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F1729', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🎥 {t('Capture / Upload Walk-Around Sequence')}</span>
                            <span style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1E3A8A', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                              3D Reconstruction
                            </span>
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: '#1E3A8A', margin: 0 }}>
                            {t('Record a continuous 360° walk-around video of the granite block or upload 30 to 60 overlapping photos. Ensure the ArUco marker or scale bar is clearly visible.')}
                          </p>
                        </div>

                        {/* Scale Reference Size Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1F5F9', padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                            📏 {t('Scale Reference')}:
                          </span>
                          <select
                            value={walkaroundMarkerSizeMm}
                            onChange={(e) => setWalkaroundMarkerSizeMm(e.target.value)}
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: '#FFFFFF',
                              border: '1px solid #94A3B8',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#0F1729',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="200.0">{t('ArUco Marker (200 mm / A4 Sheet - Standard)')}</option>
                            <option value="100.0">{t('ArUco Marker (100 mm / Compact)')}</option>
                            <option value="1000.0">{t('Red Scale Bar (1000 mm / 1.0 m)')}</option>
                          </select>
                        </div>
                      </div>

                      {/* Input Mode Selector: 360° Video vs Multi-Photo Sequence */}
                      <div style={{ display: 'flex', gap: 10, marginBottom: 18, background: '#F8FAFC', padding: '6px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                        <button
                          type="button"
                          onClick={() => setWalkaroundInputType('video')}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: walkaroundInputType === 'video' ? '1.5px solid #2563EB' : '1px solid transparent',
                            background: walkaroundInputType === 'video' ? '#EFF6FF' : 'transparent',
                            color: walkaroundInputType === 'video' ? '#1D4ED8' : '#64748B',
                            fontWeight: walkaroundInputType === 'video' ? 800 : 600,
                            fontSize: '0.86rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Video size={18} color={walkaroundInputType === 'video' ? '#1D4ED8' : '#64748B'} />
                          <span>{t('Upload 360° Walk-Around Video')}</span>
                          <span style={{ fontSize: '0.65rem', background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                            {t('Fastest')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWalkaroundInputType('photos')}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: walkaroundInputType === 'photos' ? '1.5px solid #2563EB' : '1px solid transparent',
                            background: walkaroundInputType === 'photos' ? '#EFF6FF' : 'transparent',
                            color: walkaroundInputType === 'photos' ? '#1D4ED8' : '#64748B',
                            fontWeight: walkaroundInputType === 'photos' ? 800 : 600,
                            fontSize: '0.86rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Camera size={18} color={walkaroundInputType === 'photos' ? '#1D4ED8' : '#64748B'} />
                          <span>{t('Upload Photo Sequence (30–60 Photos)')}</span>
                        </button>
                      </div>

                      {/* VIDEO MODE */}
                      {walkaroundInputType === 'video' && (
                        <div style={{ marginBottom: 18 }}>
                          {!walkaroundVideoFile ? (
                            <div
                              style={{
                                background: '#F8FAFC',
                                border: '2px dashed #93C5FD',
                                borderRadius: 12,
                                padding: '32px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onClick={() => document.getElementById('walkaround-video-input')?.click()}
                            >
                              <input
                                id="walkaround-video-input"
                                type="file"
                                accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleProcessVideoFile(file);
                                }}
                                disabled={walkaroundAnalyzing || walkaroundExtracting}
                              />
                              <Video size={40} color="#2563EB" style={{ marginBottom: 12 }} />
                              <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '1.05rem' }}>
                                {t('Click to browse or drop 360° walk-around video (.mp4, .mov, .webm)')}
                              </div>
                              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 6, maxWidth: 540, margin: '6px auto 0' }}>
                                {t('Walk around the granite block in a continuous circle (15–60 sec) keeping the block in frame. Frames will automatically be extracted for 3D reconstruction.')}
                              </p>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, background: '#EFF6FF', color: '#1E40AF', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                                <span>🎯 {t('Auto-extracts 40 calibrated keyframes')}</span>
                              </div>
                            </div>
                          ) : (
                            /* Video Selected / Loaded */
                            <div style={{ background: '#F8FAFC', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: 16 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 1.2fr', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div>
                                  <video
                                    src={walkaroundVideoUrl}
                                    controls
                                    playsInline
                                    style={{ width: '100%', maxHeight: 220, borderRadius: 8, background: '#0F172A', objectFit: 'contain' }}
                                  />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span>🎥 {walkaroundVideoMeta?.name || '360° Video'}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWalkaroundVideoFile(null);
                                        setWalkaroundVideoUrl(null);
                                        setWalkaroundVideoMeta(null);
                                        setWalkaroundFiles([]);
                                        setWalkaroundAnalysisDone(false);
                                      }}
                                      style={{
                                        background: '#FEE2E2',
                                        color: '#DC2626',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ✕ {t('Remove Video')}
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                                    <span style={{ fontSize: '0.75rem', background: '#DBEAFE', color: '#1E40AF', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                                      ⏱️ {walkaroundVideoMeta?.duration || 0}s duration
                                    </span>
                                    {walkaroundVideoMeta?.width ? (
                                      <span style={{ fontSize: '0.75rem', background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                                        📐 {walkaroundVideoMeta.width} × {walkaroundVideoMeta.height}
                                      </span>
                                    ) : null}
                                    <span style={{ fontSize: '0.75rem', background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                                      💾 {walkaroundVideoMeta?.sizeMb || 0} MB
                                    </span>
                                    <span style={{ fontSize: '0.75rem', background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>
                                      🖼️ {walkaroundFiles.length} {t('Frames Extracted')}
                                    </span>
                                  </div>

                                  {walkaroundExtracting ? (
                                    <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #93C5FD' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800, color: '#1E40AF', marginBottom: 6 }}>
                                        <span>⏳ {t('Extracting 360° circular keyframes…')}</span>
                                        <span>{walkaroundExtractProgress.current} / {walkaroundExtractProgress.total} ({walkaroundExtractProgress.percent}%)</span>
                                      </div>
                                      <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            width: `${walkaroundExtractProgress.percent}%`,
                                            height: '100%',
                                            background: '#2563EB',
                                            transition: 'width 0.15s ease'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleProcessVideoFile(walkaroundVideoFile)}
                                        className="btn btn-sm"
                                        style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 700, fontSize: '0.75rem' }}
                                      >
                                        🔄 {t('Re-extract Frames')}
                                      </button>
                                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                                        ✓ {walkaroundFiles.length} {t('frames ready for 3D reconstruction')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* PHOTO MODE */}
                      {walkaroundInputType === 'photos' && (
                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '2px dashed #93C5FD',
                            borderRadius: 12,
                            padding: '28px 20px',
                            marginBottom: 18,
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => document.getElementById('walkaround-file-input')?.click()}
                        >
                          <input
                            id="walkaround-file-input"
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleWalkaroundUpload}
                            disabled={walkaroundAnalyzing}
                          />
                          <Upload size={36} color="#3B82F6" style={{ marginBottom: 12 }} />
                          <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '1rem' }}>
                            {t('Click to browse or upload sequence (30-60 photos)')}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>
                            {walkaroundFiles.length} {t('photos selected so far')}
                          </div>
                        </div>
                      )}

                      {/* EXTRACTED / SELECTED FRAMES GALLERY */}
                      {walkaroundFiles.length > 0 && (
                        <div style={{ marginBottom: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                              📸 {t('Extracted 360° Keyframes')} ({walkaroundFiles.length} {t('frames')})
                            </div>
                            <button
                              type="button"
                              onClick={() => setWalkaroundFiles([])}
                              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              {t('Clear all frames')}
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto', padding: 4, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            {walkaroundFiles.map((f, i) => (
                              <div key={i} style={{ position: 'relative', height: 75, borderRadius: 6, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                                <img src={URL.createObjectURL(f)} alt={`Frame ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', fontSize: '0.62rem', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>
                                  #{i + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveWalkaroundFile(i); }}
                                  style={{
                                    position: 'absolute', top: 2, right: 2, background: '#EF4444', color: 'white',
                                    border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                  }}
                                  title="Remove frame"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ACTION BUTTON */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: '0.8rem', color: walkaroundFiles.length >= 30 ? '#059669' : '#D97706', fontWeight: 700 }}>
                          {walkaroundFiles.length >= 30 ? (
                            <span>✓ {walkaroundFiles.length} {t('frames ready for 3D reconstruction')}</span>
                          ) : (
                            <span>⚠️ {t('Requires 30 to 60 frames (currently: ')}{walkaroundFiles.length}{t(')')}</span>
                          )}
                        </div>
                        <button
                          className="btn btn-accent"
                          onClick={handleAnalyzeWalkaroundPhotos}
                          disabled={walkaroundAnalyzing || walkaroundExtracting || walkaroundFiles.length < 30 || walkaroundFiles.length > 60}
                          style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: 800 }}
                        >
                          {walkaroundAnalyzing ? t('⏳ Constructing 3D Model…') : walkaroundExtracting ? t('⏳ Extracting Video Frames…') : t('⚡ Analyze Walkaround (3D)')}
                        </button>
                      </div>

                      {dressedError && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', border: '1.5px solid #F87171', borderRadius: 8, fontSize: '0.85rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AlertCircle size={16} /> <span>{dressedError}</span>
                        </div>
                      )}

                      {walkaroundWarnings && walkaroundWarnings.length > 0 && (
                        <div style={{ marginTop: 12, padding: '10px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, fontSize: '0.8rem', color: '#B45309' }}>
                          <strong>{t('Warnings:')}</strong>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            {walkaroundWarnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                      {walkaroundAnalysisDone && dressedBackendVolume && (
                        <div style={{ marginTop: 14, padding: '14px', background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 10, fontSize: '0.82rem', color: '#065F46', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.95rem' }}>
                            <CheckCircle size={18} color="#059669" /> {t('3D Reconstruction successful! Dimensions and volume estimated.')}
                          </div>
                          {dressedConvexHullVolume !== null && dressedAssumedVolume !== null && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                              <div style={{ background: '#D1FAE5', padding: '10px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#065F46' }}>{t('Convex Hull Volume')}</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#047857' }}>{dressedConvexHullVolume.toFixed(3)} m³</div>
                              </div>
                              <div style={{ background: '#D1FAE5', padding: '10px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#065F46' }}>{t('Assumed Dressed Volume')}</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#047857' }}>{dressedAssumedVolume.toFixed(3)} m³</div>
                              </div>
                              <div style={{ background: '#E0F2FE', padding: '10px', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#0369A1' }}>{t('Rule 12 Bounding Box')}</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#0284C7' }}>
                                  {dressedCalculations.volumeM3 ? `${dressedCalculations.volumeM3.toFixed(3)} m³` : '—'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12, padding: captureMode === 'mode_a' ? 0 : '0 16px 16px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#1E3A8A' }}>
                      {captureMode === 'mode_a' ? (
                        <>
                          <strong style={{ color: '#1A56DB' }}>{uploadedRequired}</strong> {t('of')} <strong>{requiredCount}</strong> {t('required views uploaded')}
                          {uploadedRequired >= requiredCount && (
                            <span style={{ color: '#059669', fontWeight: 800, marginLeft: 8 }}>
                              ✓ {t('Ready for AI Photogrammetry')}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <strong style={{ color: '#1A56DB' }}>{walkaroundFiles.length}</strong> {t('photos selected')}
                          {walkaroundAnalysisDone && (
                            <span style={{ color: '#059669', fontWeight: 800, marginLeft: 8 }}>
                              ✓ {t('3D Analysis Complete')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={captureMode === 'mode_a' ? !canProceedDressedPhotos : !walkaroundAnalysisDone}
                      onClick={() => setDressedStep(1)}
                    >
                      {t('Next: Block Details')} <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── LIVE CAMERA VIEWMODAL (MOBILE & WEBCAM FIELD ASSISTANT) ── */}
              {liveCameraOpen && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.95)',
                  zIndex: 99999,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'clamp(6px, 2vw, 16px)'
                }}>
                  <div style={{
                    width: '100%',
                    maxWidth: 680,
                    background: '#0F172A',
                    borderRadius: 'clamp(10px, 3vw, 16px)',
                    border: '1px solid #334155',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                  }}>
                    {/* Camera Modal Header */}
                    <div style={{
                      padding: '12px 16px',
                      background: '#1E293B',
                      borderBottom: '1px solid #334155',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: '#FFFFFF'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Rule 12 Multi-View Telemetry Viewfinder
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{VIEW_CONFIG.find(v => v.key === liveCameraTargetKey)?.emoji}</span>
                          <span>{t('Capture:')} {VIEW_CONFIG.find(v => v.key === liveCameraTargetKey)?.label}</span>
                          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                            ({VIEW_CONFIG.findIndex(v => v.key === liveCameraTargetKey) + 1}/5)
                          </span>
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#38BDF8', border: '1px solid #334155', borderRadius: 8, padding: '5px 8px', fontSize: '0.72rem' }}
                          title="Flip camera (rear/front)"
                        >
                          <RotateCcw size={13} /> {cameraFacingMode === 'environment' ? 'Rear' : 'Front'}
                        </button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          style={{
                            background: '#334155',
                            border: 'none',
                            color: '#FFFFFF',
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Camera Viewfinder Viewport with Guidelines Overlay */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: 'clamp(260px, 46vh, 400px)',
                      background: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {cameraError ? (
                        <div style={{ color: '#EF4444', textAlign: 'center', padding: 20 }}>
                          <AlertCircle size={36} style={{ margin: '0 auto 10px' }} />
                          <div style={{ fontWeight: 800 }}>{cameraError}</div>
                        </div>
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />

                          {/* Optical Alignment Crosshair Overlay */}
                          <div style={{
                            position: 'absolute',
                            top: 24,
                            bottom: 24,
                            left: 36,
                            right: 36,
                            border: '2px dashed rgba(56, 189, 248, 0.7)',
                            borderRadius: 12,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: 12
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8', fontSize: '0.68rem', fontWeight: 800 }}>
                              <span>📐 {VIEW_CONFIG.find(v => v.key === liveCameraTargetKey)?.label?.toUpperCase()}</span>
                              <span>GPS: {gps}</span>
                            </div>
                            <div style={{ textAlign: 'center', color: '#FFFFFF', fontSize: '0.74rem', background: 'rgba(15,23,42,0.7)', padding: '4px 10px', borderRadius: 6, alignSelf: 'center' }}>
                              Position the {VIEW_CONFIG.find(v => v.key === liveCameraTargetKey)?.label} squarely inside this frame
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.62rem' }}>
                              <span>{proposedDressedId}</span>
                              <span>{currentTimeStr}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Camera Modal Footer / Controls */}
                    <div style={{
                      padding: '16px 20px',
                      background: '#1E293B',
                      borderTop: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      {/* View selector tabs inside camera */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {VIEW_CONFIG.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => setLiveCameraTargetKey(v.key)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              background: liveCameraTargetKey === v.key ? '#38BDF8' : dressedImages[v.key] ? '#10B981' : '#334155',
                              color: liveCameraTargetKey === v.key ? '#0F172A' : '#FFFFFF'
                            }}
                          >
                            {v.emoji} {v.key.toUpperCase()} {dressedImages[v.key] ? '✓' : ''}
                          </button>
                        ))}
                      </div>

                      {/* Big Shutter Capture Button */}
                      <button
                        type="button"
                        onClick={captureLiveSnapshot}
                        disabled={!!cameraError}
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          border: '4px solid #38BDF8',
                          boxShadow: '0 0 15px rgba(56, 189, 248, 0.6)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.1s'
                        }}
                        title="Capture Photo"
                      >
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#EF4444' }} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={stopLiveCamera}
                        style={{ color: '#E2E8F0', borderColor: '#475569' }}
                      >
                        {t('Done')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 — Details */}
              {dressedStep === 1 && (
                <div className="card card-gold">
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1729', marginBottom: 18 }}>
                    {t('Dressed Block Specifications')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">{t('Granite Mineral Type')}</label>
                      <select
                        className="form-control"
                        value={dressedDetails.graniteType}
                        onChange={e => setDressedDetails(p => ({ ...p, graniteType: e.target.value }))}
                      >
                        {GRANITE_TYPES.map(gType => <option key={gType} value={gType}>{t(gType)}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('Internal Leaseholder / Dressing Yard Tag')}</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., YD-BLK-2025-01"
                        value={dressedDetails.internalNumber}
                        onChange={e => setDressedDetails(p => ({ ...p, internalNumber: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('Dressing Yard GPS Coordinates')}</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={gps}
                          onChange={e => setGps(e.target.value)}
                          placeholder="Lat, Long"
                        />
                        <span className={`badge ${gpsStatus === 'ok' ? 'badge-green' : 'badge-gold'}`}>
                          <MapPin size={10} /> {gpsStatus === 'ok' ? t('GPS OK') : t('Default')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button className="btn btn-outline" onClick={() => setDressedStep(0)}>{t('← Back')}</button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setDressedStep(2);
                        if (!dressedAnalysisDone && uploadedRequired >= requiredCount) {
                          handleAnalyzeDressedPhotos();
                        }
                      }}
                      style={{ marginLeft: 'auto' }}
                    >
                      {t('Review & AI Analysis')} <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — Review & AI Measure */}
              {dressedStep === 2 && (
                <div className="card card-green" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                        {t('Dressed Block Review & Cuboid AI Photogrammetry')}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#065F46', margin: '4px 0 0' }}>
                        {t('4-Point Statutory Protocol & Omni Calculator 3D Cuboid Volumetric Analysis')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        onClick={() => handleAnalyzeDressedPhotos()}
                        disabled={dressedAnalyzing}
                      >
                        <Sparkles size={14} />
                        {dressedAnalyzing
                          ? t(`Calculating Photogrammetry… (${dressedElapsed}s)`)
                          : t('⚡ Compute AI Photogrammetry')}
                      </button>
                      {dressedAnalyzing && (
                        <div style={{ width: '100%', minWidth: 200 }}>
                          <div style={{ fontSize: '0.7rem', color: '#065F46', marginBottom: 3, fontWeight: 600 }}>
                            🔬 {t('Analyzing 5 block faces with ArUco & AI… Please wait.')}
                          </div>
                          <div style={{ height: 5, background: '#D1FAE5', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(95, (dressedElapsed / 90) * 100)}%`,
                              background: 'linear-gradient(90deg, #10B981, #059669)',
                              borderRadius: 4,
                              transition: 'width 1s linear'
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo thumbnails */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {VIEW_CONFIG.map(({ key, label }) => dressedImages[key] && (
                      <div key={key} style={{ position: 'relative' }}>
                        <img
                          src={dressedImages[key].url} alt={label}
                          style={{ width: 84, height: 62, objectFit: 'cover', borderRadius: 8, border: '2px solid #6EE7B7' }}
                        />
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.55rem',
                          fontWeight: 700, textAlign: 'center', borderRadius: '0 0 6px 6px', padding: '2px 0'
                        }}>
                          {t(label)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                    {[
                      [t('Granite Type'), t(dressedDetails.graniteType)],
                      [t('Source Undressed ID'), dressedDetails.linkToUndressed ? (selectedSourceUdId || t('None')) : t('Standalone Dressed')],
                      [t('Yard Marking'), dressedDetails.internalNumber || '—'],
                      [t('GPS Stamp'), gps || '—'],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ background: '#F0FDF4', padding: '10px 14px', borderRadius: 8, border: '1px solid #6EE7B7' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1729', marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Photogrammetry Status Banner */}
                  {dressedAnalysisDone ? (
                    <div style={{
                      background: dressedArucoInfo?.detected ? '#ECFDF5' : '#FFFBEB',
                      border: `1px solid ${dressedArucoInfo?.detected ? '#A7F3D0' : '#FDE68A'}`,
                      padding: '10px 14px',
                      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      {dressedArucoInfo?.detected ? (
                        <CheckCircle size={18} color="#059669" />
                      ) : (
                        <AlertTriangle size={18} color="#D97706" />
                      )}
                      <div style={{ fontSize: '0.78rem', color: dressedArucoInfo?.detected ? '#065F46' : '#92400E' }}>
                        <strong>{t(dressedArucoInfo?.detected ? 'AI Photogrammetry Complete:' : 'AI Photogrammetry Warnings:')}</strong> {t(dressedArucoInfo?.details || '4-point statutory readings extracted successfully.')}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 14px',
                      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <Cpu size={18} color="#1A56DB" />
                      <div style={{ fontSize: '0.78rem', color: '#1E3A8A' }}>
                        <strong>{t('Photogrammetry Protocol:')}</strong> {t('Click "Compute AI Photogrammetry" above or enter the 4 statutory readings below to compute real-time cuboid metrics and volume difference.')}
                      </div>
                    </div>
                  )}

                  {/* ── 4-POINT STATUTORY READINGS (LENGTH, BREADTH, HEIGHT) ── */}
                  <div style={{
                    background: '#F8FAFC', padding: '18px 20px', borderRadius: 12,
                    border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 18
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t('Statutory Multi-Point Edge Readings — 4 Readings per Axis (Rule 12)')}
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 500, color: '#64748B' }}>
                          {t('Four measurements taken across opposite face corners to determine the effective rectangular block dimensions.')}
                        </div>
                      </div>
                      {dressedAnalysisDone && (
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle size={12} /> {t('AI Computed')}
                        </span>
                      )}
                    </div>

                    {[
                      ['lengths', 'Length (L)', dressedCalculations.avgL, dressedCalculations.lM, '#1A56DB'],
                      ['breadths', 'Breadth (B)', dressedCalculations.avgB, dressedCalculations.bM, '#10B981'],
                      ['heights', 'Height (H)', dressedCalculations.avgH, dressedCalculations.hM, '#F59E0B']
                    ].map(([key, label, avgVal, avgM, color]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                            📏 {t(label)} (cm)
                          </div>
                          {avgVal > 0 && (
                            <div style={{
                              fontSize: '0.7rem', background: color + '15', color,
                              border: `1px solid ${color}35`, borderRadius: 6, padding: '2px 10px', fontWeight: 700
                            }}>
                              ✓ Avg: <strong>{avgVal} cm</strong> = {avgM} m
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                                {label[0]}{i + 1}{i === 0 ? ` *` : ''}
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                min="10"
                                max="1500"
                                className="form-control"
                                placeholder={i === 0 ? 'cm *' : 'cm'}
                                required={i === 0}
                                value={dressedReadings[key][i]}
                                onChange={e => {
                                  const arr = [...dressedReadings[key]];
                                  arr[i] = e.target.value;
                                  setDressedReadings(p => ({ ...p, [key]: arr }));
                                }}
                                style={{
                                  fontSize: '0.88rem',
                                  background: dressedReadings[key][i] ? '#FFFFFF' : '#F8FAFC',
                                  borderColor: dressedReadings[key][i] ? color : undefined,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── OMNI CALCULATOR CUBOID GEOMETRY DASHBOARD ── */}
                  <div style={{
                    background: '#FFFFFF', padding: '18px 20px', borderRadius: 12,
                    border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: 14
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          📐 {t('Omni Calculator Cuboid Geometry & Volumetric Metrics')}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                          {t('Live 3D cuboid volume, body diagonals, face diagonals, and surface area computed via exact mathematics.')}
                        </div>
                      </div>
                      <a
                        href="https://www.omnicalculator.com/math/cuboid-volume"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.68rem', color: '#1A56DB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                      >
                        Omni Calculator Spec <ExternalLink size={11} />
                      </a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                      {/* Dressed Volume */}
                      <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '12px 14px', border: '1px solid #BFDBFE' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase', marginBottom: 2 }}>
                          {t('Cuboid Volume (V)')}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace" }}>
                          {dressedCalculations.vol} m³
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>
                          {dressedCalculations.volCm3} cm³
                        </div>
                      </div>

                      {/* Space / Body Diagonal */}
                      <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '12px 14px', border: '1px solid #DDD6FE' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 2 }}>
                          {t('Space Diagonal (d)')}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#7C3AED', fontFamily: "'JetBrains Mono', monospace" }}>
                          {dressedCalculations.spaceDiagonalM} m
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>
                          {dressedCalculations.spaceDiagonalCm} cm • d = √(l²+w²+h²)
                        </div>
                      </div>

                      {/* Base Face Diagonal */}
                      <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 14px', border: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', marginBottom: 2 }}>
                          {t('Base Diagonal (dlw)')}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#15803D', fontFamily: "'JetBrains Mono', monospace" }}>
                          {dressedCalculations.faceDiagonalLB} cm
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>
                          Base face • √(l²+w²)
                        </div>
                      </div>

                      {/* Surface Area */}
                      <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '12px 14px', border: '1px solid #FDE68A' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 2 }}>
                          {t('Surface Area (A)')}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#B45309', fontFamily: "'JetBrains Mono', monospace" }}>
                          {dressedCalculations.surfaceAreaM2} m²
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>
                          {dressedCalculations.surfaceAreaCm2} cm² • 2(lw+lh+wh)
                        </div>
                      </div>

                      {/* Commercial Weight */}
                      <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>
                          {t('Estimated Weight')}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                          ~{dressedCalculations.weight} MT
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>
                          Granite density: 2.70 MT/m³
                        </div>
                      </div>

                      {/* Gangsaw Classification */}
                      <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>
                          {t('Gangsaw Classification')}
                        </div>
                        <span
                          className={`badge ${dressedCalculations.gangsawClass === 'Super Gangsaw' ? 'badge-gold' : 'badge-blue'}`}
                          style={{ fontSize: '0.78rem', marginTop: 6, display: 'inline-block' }}
                        >
                          {t(dressedCalculations.gangsawClass || '—')}
                        </span>
                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4 }}>
                          {t(dressedCalculations.tier)}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Face Diagonals & Ratio footer */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '0.72rem', color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 8, flexWrap: 'wrap', gap: 8
                    }}>
                      <div>
                        <strong>{t('Face Diagonals:')}</strong> Front dlh = <strong>{dressedCalculations.faceDiagonalLH} cm</strong> • Side dwh = <strong>{dressedCalculations.faceDiagonalBH} cm</strong>
                      </div>
                      <div>
                        <strong>{t('Surface-to-Volume Ratio (A/V):')}</strong> <strong>{dressedCalculations.surfaceToVolume} m⁻¹</strong>
                      </div>
                    </div>
                  </div>

                  {/* ── VOLUME VARIANCE & DRESSING RECOVERY YIELD CARD ── */}
                  {selectedSourceBlock && (
                    <div style={{
                      background: '#F0FDF4', padding: '16px 20px', borderRadius: 12,
                      border: '1.5px solid #86EFAC', display: 'flex', flexDirection: 'column', gap: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⚖️ {t('Volume Variance: Raw Undressed vs. Dressed Block')}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#047857' }}>
                            {t('Comparison for AP DMG Presentation Officers — Dressing Yield & Quarry Recovery Verification')}
                          </div>
                        </div>
                        {dressedCalculations.yieldPct && (
                          <span
                            className={`badge ${dressedCalculations.isYieldExceeded ? 'badge-red' : 'badge-green'}`}
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              background: dressedCalculations.isYieldExceeded ? '#FEE2E2' : '#DCFCE7',
                              color: dressedCalculations.isYieldExceeded ? '#991B1B' : '#15803D',
                              border: `1px solid ${dressedCalculations.isYieldExceeded ? '#F87171' : '#86EFAC'}`
                            }}
                          >
                            {dressedCalculations.isYieldExceeded ? '⚠️ ' : ''}{dressedCalculations.yieldPct}% {t('Commercial Recovery Yield')}
                          </span>
                        )}
                      </div>

                      {/* Physical constraint notice if yield > 100% */}
                      {dressedCalculations.isYieldExceeded && (
                        <div style={{
                          background: '#FEF2F2', border: '1.5px solid #F87171', borderRadius: 8,
                          padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <div>
                              <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.85rem' }}>
                                {t('Physical Invariant Violation: Dressed Volume Exceeds Source Boulder')}
                              </div>
                              <div style={{ color: '#B91C1C', fontSize: '0.75rem', marginTop: 2 }}>
                                {t(`Dressed block (${dressedCalculations.vol} m³) cannot exceed raw parent boulder (${dressedCalculations.rawVol} m³). Dressing trims away waste rock.`)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleCalibrateDressedToSource}
                            className="btn btn-sm"
                            style={{
                              background: '#DC2626', color: '#FFFFFF', border: 'none', fontWeight: 800,
                              borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.75rem'
                            }}
                          >
                            ⚖️ {t('Calibrate to 78% Standard Recovery Yield')}
                          </button>
                        </div>
                      )}

                      {/* Variance Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                            {t('Source Undressed Volume')}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B45309', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                            {selectedSourceBlock.undressed_volume} m³
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#78350F', marginTop: 2 }}>
                            {selectedSourceBlock.undressed_id || selectedSourceBlock.id}
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                            {t('Final Dressed Volume')}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                            {dressedCalculations.vol} m³
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#1E3A8A', marginTop: 2 }}>
                            {t('Commercial Cuboid')}
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                            {t('Volume Difference (ΔV)')}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065F46', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                            {dressedCalculations.volumeDiff ? `${dressedCalculations.volumeDiff} m³` : '—'}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#047857', marginTop: 2 }}>
                            {t('Volume Trimmed / Lost')}
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                            {t('Quarry Dressing Waste')}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                            {dressedCalculations.wastePct ? `${dressedCalculations.wastePct}%` : '—'}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#991B1B', marginTop: 2 }}>
                            {t('Defect / Corner Trimmings')}
                          </div>
                        </div>
                      </div>

                      {/* Yield Progress Bar */}
                      {dressedCalculations.yieldPct && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#065F46', marginBottom: 4, fontWeight: 700 }}>
                            <span>{t('Recovery Yield Efficiency')}</span>
                            <span>{dressedCalculations.yieldPct}% ({t('Target')}: 65% – 85%)</span>
                          </div>
                          <div style={{ height: 8, background: '#DCFCE7', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, Math.max(0, parseFloat(dressedCalculations.yieldPct)))}%`,
                              height: '100%',
                              background: parseFloat(dressedCalculations.yieldPct) >= 70 ? '#10B981' : parseFloat(dressedCalculations.yieldPct) >= 55 ? '#F59E0B' : '#EF4444',
                              borderRadius: 4,
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {dressedError && (
                    <div className="alert alert-rose">
                      <AlertCircle size={16} /> {dressedError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button className="btn btn-outline" onClick={() => setDressedStep(1)}>{t('← Back')}</button>
                    <button
                      className="btn btn-success"
                      disabled={dressedSubmitting || !dressedCalculations.readingsComplete}
                      onClick={handleRegisterDressed}
                      style={{ marginLeft: 'auto', padding: '12px 24px', fontSize: '0.95rem' }}
                    >
                      {dressedSubmitting ? t('Registering Commercial Dressed Block…') : <><CheckCircle size={16} /> {t('Register Dressed Block & Finalize Measurements')}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}