import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import GraniteBlock3D from './GraniteBlock3D';
import { formatGpsString } from '../utils/gps';
import {
  Search, ShieldCheck, MapPin, Calendar, Scale, Layers, Truck, FileText,
  CheckCircle, AlertCircle, Clock, ArrowRight, Printer, Share2, ExternalLink,
  ChevronRight, Mountain, Sparkles, QrCode, Download, ArrowLeft, RefreshCw, XCircle
} from 'lucide-react';

const DEMO_BLOCKS = [
  { id: 'BLK-896208',          label: 'AI Measured Block' },
  { id: 'BLK-675750',          label: 'DMGO Approved Block' },
  { id: 'BLK-Q0186-0001',      label: 'Podili Quarry Block' },
  { id: 'BLK-Q1811-0020',      label: 'Pending Check Block' },
];

export default function BlockTracker() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialId = params.blockId || searchParams.get('id') || 'BLK-896208';
  const [blockIdInput, setBlockIdInput] = useState(initialId);
  const [currentBlockId, setCurrentBlockId] = useState(initialId);
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.blockId) {
      setBlockIdInput(params.blockId);
      setCurrentBlockId(params.blockId);
    } else if (searchParams.get('id')) {
      setBlockIdInput(searchParams.get('id'));
      setCurrentBlockId(searchParams.get('id'));
    }
  }, [params.blockId, searchParams]);

  const fetchBlockDetails = async (idToFetch) => {
    if (!idToFetch || !idToFetch.trim()) return;
    const cleanId = idToFetch.trim();
    setLoading(true);
    setError('');
    try {
      const data = await api.trackBlock(cleanId);
      setBlock(data);
    } catch (err) {
      setBlock(null);
      setError(err.message || `Block '${cleanId}' was not found in the AP Mines Registry.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBlockId) {
      fetchBlockDetails(currentBlockId);
    }
  }, [currentBlockId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (blockIdInput.trim()) {
      setCurrentBlockId(blockIdInput.trim());
      navigate(`/track/${encodeURIComponent(blockIdInput.trim())}`, { replace: true });
    }
  };

  const handleSelectSample = (sampleId) => {
    setBlockIdInput(sampleId);
    setCurrentBlockId(sampleId);
    navigate(`/track/${encodeURIComponent(sampleId)}`, { replace: true });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper calculations
  const m = block?.measurement;
  const s = block?.seigniorage;
  const w = block?.weighbridge;
  const d = block?.dispatch;

  const lengthM = m ? (m.length > 20 ? (m.length / 100).toFixed(2) : Number(m.length).toFixed(2)) : '—';
  const breadthM = m ? (m.breadth > 20 ? (m.breadth / 100).toFixed(2) : Number(m.breadth).toFixed(2)) : '—';
  const heightM = m ? (m.height > 20 ? (m.height / 100).toFixed(2) : Number(m.height).toFixed(2)) : '—';

  // Lifecycle status steps
  const getLifecycleSteps = () => {
    if (!block) return [];

    const isRegistered = true;
    const isMeasured = Boolean(block.measurement);
    const isCheckRequested = ['check_requested', 'check_measurement_requested', 'dmgo_approved', 'permit_ready', 'dispatched', 'weighbridge_verified', 'weighbridge_flagged', 'delivered'].includes(block.status);
    const isApproved = ['dmgo_approved', 'permit_ready', 'weighbridge_verified', 'weighbridge_flagged', 'dispatched', 'delivered'].includes(block.status);
    const isPermitIssued = Boolean(block.dispatch?.e_permit_number || ['permit_ready', 'dispatched', 'weighbridge_verified', 'weighbridge_flagged', 'delivered'].includes(block.status));
    const isWeighbridgeDone = Boolean(block.weighbridge);
    // isDispatched is ONLY true when the operator has explicitly confirmed dispatch.
    // dispatch_time being set does NOT mean dispatch — DMGO also sets dispatch_time when issuing the permit.
    const isDispatched = ['dispatched', 'delivered'].includes(block.status);

    return [
      {
        id: 'extraction',
        title: 'Quarry Extraction & Tagging',
        desc: block.quarry_name || `Quarry ID #${block.quarry_id}`,
        time: block.creation_time ? new Date(block.creation_time).toLocaleString('en-IN') : null,
        status: isRegistered ? 'completed' : 'upcoming',
        badge: 'Quarry Tagged',
        icon: Mountain,
        color: '#1A56DB',
        details: [
          { label: 'Quarry Name', val: block.quarry_name || `Quarry #${block.quarry_id}` },
          { label: 'GPS Location', val: formatGpsString(block.gps), link: block.gps ? `https://maps.google.com/?q=${block.gps}` : null },
          { label: 'Raw State', val: block.block_type || 'Dressed' },
        ],
      },
      {
        id: 'ai_measurement',
        title: 'Photogrammetric AI Measurement',
        desc: m ? `${lengthM}m × ${breadthM}m × ${heightM}m (${m.volume?.toFixed(3)} m³)` : 'AI Dimension analysis',
        time: block.creation_time ? new Date(block.creation_time).toLocaleDateString('en-IN') : null,
        status: isMeasured ? 'completed' : 'upcoming',
        badge: m ? 'AI Computed' : 'Pending',
        icon: Layers,
        color: '#0EA5E9',
        details: m ? [
          { label: 'Dimensions (L×B×H)', val: `${lengthM} × ${breadthM} × ${heightM} m` },
          { label: 'Net Volume', val: `${m.volume?.toFixed(4)} m³` },
          { label: 'Estimated Weight', val: `${Number(m.estimated_weight || (m.volume || 1) * 2.7).toFixed(2)} MT` },
          { label: 'Analysis Method', val: m.measurement_method || 'Photogrammetric Single/Multi' },
        ] : [],
      },
      {
        id: 'seigniorage',
        title: 'Seigniorage & Slab Assessment',
        desc: s ? `₹${Number(s.total_fee || 0).toLocaleString('en-IN')} — ${s.class_status?.replace(/_/g, ' ').toUpperCase()}` : 'Royalty computation',
        time: block.creation_time ? new Date(block.creation_time).toLocaleDateString('en-IN') : null,
        status: s ? 'completed' : 'upcoming',
        badge: s ? s.class_status?.replace(/_/g, ' ') : 'Pending',
        icon: Scale,
        color: '#E67E22',
        details: s ? [
          { label: 'Granite Type', val: s.granite_type || 'Granite' },
          { label: 'Gangsaw Tier', val: s.class_status?.replace(/_/g, ' ').toUpperCase() },
          { label: 'Tariff Rate', val: `₹${s.rate_per_mt} / MT` },
          { label: 'Total Royalty Fee', val: `₹${Number(s.total_fee).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
        ] : [],
      },
      {
        id: 'dmgo_approval',
        title: 'DMGO Inspection & Verification',
        desc: isApproved ? 'Officer approved dimensions & seigniorage' : block.status === 'dmgo_rejected' ? 'Rejected by DMGO' : isCheckRequested ? 'Check measurement requested — pending officer sign-off' : 'Awaiting check request submission',
        time: block.permit_ready_at || block.last_updated ? new Date(block.permit_ready_at || block.last_updated).toLocaleString('en-IN') : null,
        status: isApproved ? 'completed' : block.status === 'dmgo_rejected' ? 'failed' : isCheckRequested ? 'in_progress' : 'upcoming',
        badge: isApproved ? 'DMGO Approved' : block.status === 'dmgo_rejected' ? 'Rejected' : isCheckRequested ? 'Pending Review' : 'Upcoming',
        icon: ShieldCheck,
        color: isApproved ? '#10B981' : block.status === 'dmgo_rejected' ? '#EF4444' : '#E67E22',
        details: [
          { label: 'Officer Status', val: isApproved ? 'Verified & Approved' : block.status === 'dmgo_rejected' ? 'Rejected' : isCheckRequested ? 'In Review Queue' : 'Not Requested' },
          { label: 'Remarks', val: block.dmgo_remarks || (isApproved ? 'All dimensions & slabs digitally verified' : '—') },
          { label: 'Approval Mode', val: 'Digital Photogrammetric Verification' },
        ],
      },
      {
        id: 'permit_transit',
        title: 'E-Permit & Transit Pass (Form 01)',
        desc: d?.e_permit_number ? `Permit #${d.e_permit_number} · Pass #${d.transit_form_no || 'TF001'}` : 'Digital transport permit generation',
        time: d?.dispatch_time ? new Date(d.dispatch_time).toLocaleDateString('en-IN') : null,
        status: isPermitIssued ? 'completed' : 'upcoming',
        badge: isPermitIssued ? 'Permit Ready' : 'Pending',
        icon: FileText,
        color: '#7C3AED',
        details: d ? [
          { label: 'E-Permit Number', val: d.e_permit_number || 'EP-ONLINE-ISSUED' },
          { label: 'Transit Form No', val: d.transit_form_no || 'FORM-01-TRANSIT' },
          { label: 'Vehicle Assigned', val: d.vehicle_number || 'AP-39-TRANSPORT' },
          { label: 'Destination', val: d.destination || 'Consignee Port / Plant' },
        ] : [
          { label: 'Permit Status', val: isPermitIssued ? 'Ready for issue' : 'Pending DMGO Approval' }
        ],
      },
      {
        id: 'weighbridge',
        title: 'Weighbridge Physical Reconciliation',
        desc: w ? `Actual: ${Number(w.actual_weight).toFixed(2)} MT · Discrepancy: ${Number(w.difference_percentage).toFixed(2)}%` : 'Gross & Net weighbridge check',
        time: w?.validation_time ? new Date(w.validation_time).toLocaleString('en-IN') : null,
        status: isWeighbridgeDone ? (w.status === 'flagged' ? 'warning' : 'completed') : 'upcoming',
        badge: w ? (w.status === 'flagged' ? 'Mismatch Flagged' : 'Weight Verified') : 'Pending WB',
        icon: Scale,
        color: w?.status === 'flagged' ? '#EF4444' : '#10B981',
        details: w ? [
          { label: 'Actual Weight', val: `${Number(w.actual_weight).toFixed(2)} MT` },
          { label: 'AI Est. Weight', val: `${Number(m?.estimated_weight || (m?.volume || 1) * 2.7).toFixed(2)} MT` },
          { label: 'Weight Variance', val: `${Number(w.difference_percentage).toFixed(2)}%` },
          { label: 'Validation Outcome', val: w.status === 'flagged' ? 'Flagged (Discrepancy ≥ 5%)' : 'Approved (Within Tolerance)' },
        ] : [],
      },
      {
        id: 'dispatch',
        title: 'Dispatch & Consignment Delivery',
        desc: ['delivered', 'received'].includes(block.status)
          ? `Delivered & received at destination: ${d?.destination || 'Destination'}`
          : (isDispatched ? `In transit via vehicle ${d?.vehicle_number || 'Transport'} to ${d?.destination || 'Destination'}` : 'Transport in transit to consignee'),
        time: d?.dispatch_time ? new Date(d.dispatch_time).toLocaleString('en-IN') : null,
        status: isDispatched ? 'completed' : 'upcoming',
        badge: ['delivered', 'received'].includes(block.status) ? 'Delivered' : (isDispatched ? 'In Transit' : 'Awaiting Dispatch'),
        icon: Truck,
        color: ['delivered', 'received'].includes(block.status) ? '#10B981' : '#1A56DB',
        details: isDispatched ? [
          { label: 'Driver Name', val: d?.driver_name || 'Assigned Driver' },
          { label: 'Vehicle Number', val: d?.vehicle_number || '—' },
          { label: 'Destination', val: d?.destination || 'Factory' },
          { label: 'Dispatch Time', val: d?.dispatch_time ? new Date(d.dispatch_time).toLocaleString('en-IN') : 'Completed' },
        ] : [],
      },
    ];
  };

  const steps = getLifecycleSteps();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&color=1A56DB`;

  return (
    <div style={{ minHeight: '100vh', background: '#F0F6FF', paddingBottom: 60, fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="no-print" style={{
        background: '#fff', borderBottom: '1px solid #DBEAFE', padding: '0 32px', height: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(26,86,219,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(26,86,219,0.3)',
            }}>
              <Mountain size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F1729', letterSpacing: '-0.02em' }}>
                Smart Granite
              </div>
              <div style={{ fontSize: '0.62rem', color: '#1A56DB', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AP Mines &amp; Geology
              </div>
            </div>
          </Link>
          <span style={{ height: 24, width: 1, background: '#DBEAFE' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#10B981" /> Public Block Verification Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Home
          </Link>
          <Link to="/login" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Sign In to Portal <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── Search Hero Banner ────────────────────────────────────────────── */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #1A56DB 0%, #1E40AF 100%)',
        color: '#fff', padding: '40px 24px 48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative background blobs */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: 100, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: 20,
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            <Sparkles size={13} color="#FDE68A" /> Digital Provenance &amp; Custody Trail
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Granite Block Lifecycle Tracker
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', maxWidth: 620, margin: '0 auto 26px', lineHeight: 1.6 }}>
            Verify block measurements, seigniorage fees, DMGO approval status, and weighbridge audit trail
            in real-time across Andhra Pradesh.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{
            maxWidth: 580, margin: '0 auto', display: 'flex', gap: 8,
            background: '#fff', padding: 6, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, color: '#1A56DB', flexShrink: 0 }}>
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Enter Block ID (e.g., BLK-Q0186-0001)..."
              value={blockIdInput}
              onChange={(e) => setBlockIdInput(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: '1rem',
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0F1729', padding: '10px 6px',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '0 24px', borderRadius: 8, fontWeight: 800, fontSize: '0.9rem' }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Track Block'}
            </button>
          </form>

          {/* Quick sample chips */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Sample Blocks:</span>
            {DEMO_BLOCKS.map(demo => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleSelectSample(demo.id)}
                style={{
                  background: currentBlockId === demo.id ? '#fff' : 'rgba(255,255,255,0.18)',
                  color: currentBlockId === demo.id ? '#1A56DB' : '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '4px 10px', borderRadius: 16, fontSize: '0.72rem',
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {demo.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 20px', position: 'relative', zIndex: 10 }}>

        {/* Loading Spinner */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '70px 20px' }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', border: '4px solid #DBEAFE',
              borderTopColor: '#1A56DB', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F1729' }}>Fetching Block Digital Record…</div>
            <p style={{ color: '#1E3A8A', fontSize: '0.85rem', marginTop: 4 }}>
              Querying AP Department of Mines &amp; Geology central registry for {currentBlockId}
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="card" style={{ textAlign: 'center', padding: '50px 24px' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <XCircle size={32} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F1729', marginBottom: 8 }}>
              Block Not Found
            </h2>
            <p style={{ color: '#6B7280', maxWidth: 500, margin: '0 auto 20px', fontSize: '0.9rem' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => handleSelectSample('BLK-Q0186-0001')}>
                Try Demo Block BLK-Q0186-0001
              </button>
              <Link to="/" className="btn btn-primary">
                Return Home
              </Link>
            </div>
          </div>
        )}

        {/* Success / Details View */}
        {!loading && block && (
          <div className="print-slip-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Block Header Card ────────────────────────────────────────── */}
            <div className="card" style={{
              padding: '24px 30px', border: '1px solid #DBEAFE',
              boxShadow: '0 4px 20px rgba(26,86,219,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{
                      background: '#EFF6FF', border: '1px solid #BFDBFE',
                      padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem',
                      fontWeight: 800, color: '#1A56DB', letterSpacing: '0.04em',
                    }}>
                      OFFICIAL AP MINES REGISTRY
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#1E3A8A', fontWeight: 600 }}>
                      ID: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{block.id}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <h2 style={{
                      fontSize: '1.8rem', fontWeight: 900, color: '#0F1729',
                      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', margin: 0,
                    }}>
                      {block.id}
                    </h2>
                    <StatusBadge status={block.status} />
                  </div>

                  <p style={{ color: '#1E3A8A', fontSize: '0.9rem', marginTop: 6, fontWeight: 500 }}>
                    {block.quarry_name || `Quarry #${block.quarry_id}`} · {s?.granite_type || 'Granite Mineral'} · Registered {block.creation_time ? new Date(block.creation_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleCopyLink}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Share2 size={14} />
                    {copied ? 'Link Copied! ✓' : 'Share'}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handlePrint}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Printer size={14} /> Print Slip
                  </button>
                </div>
              </div>

              {/* KPI Strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 14, marginTop: 22, paddingTop: 20, borderTop: '1px solid #DBEAFE',
              }}>
                <div style={{ background: '#EFF6FF', padding: '12px 14px', borderRadius: 10, border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase' }}>Dimensions (L×B×H)</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0F1729', marginTop: 4 }}>
                    {lengthM} × {breadthM} × {heightM} m
                  </div>
                </div>
                <div style={{ background: '#F0FDF4', padding: '12px 14px', borderRadius: 10, border: '1px solid #6EE7B7' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Net Volume</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#065F46', marginTop: 4 }}>
                    {m?.volume ? `${Number(m.volume).toFixed(3)} m³` : 'Pending'}
                  </div>
                </div>
                <div style={{ background: '#FFF8F0', padding: '12px 14px', borderRadius: 10, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#E67E22', textTransform: 'uppercase' }}>Seigniorage Fee</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#92400E', marginTop: 4 }}>
                    {s?.total_fee ? `₹${Number(s.total_fee).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'Calculating'}
                  </div>
                </div>
                <div style={{ background: '#FAF5FF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>Weight (Est. / Actual)</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#581C87', marginTop: 4 }}>
                    {w?.actual_weight ? `${Number(w.actual_weight).toFixed(2)} MT` : m?.estimated_weight ? `${Number(m.estimated_weight).toFixed(2)} MT (Est)` : 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Two Column Layout: Timeline Left + 3D/QR Right ────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1.2fr)', gap: 24, alignItems: 'start' }}>

              {/* ── Left Column: Digital Custody Timeline ──────────────────── */}
              <div className="card" style={{ padding: '28px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                      Chain of Custody Timeline
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#1E3A8A', marginTop: 2 }}>
                      Verified stage-by-stage audit trail from extraction to dispatch
                    </p>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                    <ShieldCheck size={12} /> Cryptographically Audited
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {steps.map((st, idx) => {
                    const isLast = idx === steps.length - 1;
                    const IconComp = st.icon;
                    const isDone = st.status === 'completed';
                    const isCurrent = st.status === 'in_progress';
                    const isWarn = st.status === 'warning' || st.status === 'failed';

                    return (
                      <div key={st.id} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: isLast ? 0 : 28 }}>
                        {/* Connecting vertical line */}
                        {!isLast && (
                          <div style={{
                            position: 'absolute', left: 19, top: 40, bottom: 0, width: 2,
                            background: isDone ? '#10B981' : '#DBEAFE', transition: 'background 0.3s ease',
                          }} />
                        )}

                        {/* Node Icon */}
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: isDone ? '#10B981' : isWarn ? '#EF4444' : isCurrent ? '#1A56DB' : '#EFF6FF',
                          border: `2px solid ${isDone ? '#10B981' : isWarn ? '#EF4444' : isCurrent ? '#1A56DB' : '#BFDBFE'}`,
                          color: isDone || isWarn || isCurrent ? '#fff' : '#1A56DB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isCurrent ? '0 0 0 4px #DBEAFE' : 'none',
                          zIndex: 2,
                        }}>
                          {isDone ? <CheckCircle size={20} /> : <IconComp size={18} />}
                        </div>

                        {/* Step Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F1729' }}>
                              {st.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {st.time && (
                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                                  {st.time}
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12,
                                background: isDone ? '#D1FAE5' : isWarn ? '#FEE2E2' : isCurrent ? '#DBEAFE' : '#F1F5F9',
                                color: isDone ? '#065F46' : isWarn ? '#991B1B' : isCurrent ? '#1A56DB' : '#64748B',
                              }}>
                                {st.badge}
                              </span>
                            </div>
                          </div>

                          <p style={{ fontSize: '0.8rem', color: '#1E3A8A', marginTop: 3, marginBottom: 8 }}>
                            {st.desc}
                          </p>

                          {/* Detail Grid */}
                          {st.details && st.details.length > 0 && (
                            <div style={{
                              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                              gap: 8, background: '#F8FAFC', padding: '10px 12px', borderRadius: 8,
                              border: '1px solid #E2E8F0', marginTop: 6,
                            }}>
                              {st.details.map((dItem, dIdx) => (
                                <div key={dIdx}>
                                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                    {dItem.label}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F1729', marginTop: 2 }}>
                                    {dItem.link ? (
                                      <a href={dItem.link} target="_blank" rel="noreferrer" style={{ color: '#1A56DB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        {dItem.val} <ExternalLink size={11} />
                                      </a>
                                    ) : (
                                      dItem.val
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Right Column: 3D Visualization & Official QR Code ──────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* 3D Visualizer Card */}
                <div className="card card-blue" style={{ textAlign: 'center', padding: '24px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F1729' }}>
                      3D Isometric Proportions
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Interactive</span>
                  </div>

                  <div style={{ margin: '14px 0 20px', display: 'flex', justifyContent: 'center' }}>
                    <GraniteBlock3D
                      size="md"
                      length={m?.length}
                      breadth={m?.breadth}
                      height={m?.height}
                      classStatus={block?.seigniorage?.class_status}
                      interactive={true}
                    />
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-around',
                    background: '#EFF6FF', padding: '10px', borderRadius: 8, border: '1px solid #BFDBFE',
                    fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                  }}>
                    <div><span style={{ color: '#1A56DB' }}>L:</span> {lengthM} m</div>
                    <div><span style={{ color: '#10B981' }}>B:</span> {breadthM} m</div>
                    <div><span style={{ color: '#E67E22' }}>H:</span> {heightM} m</div>
                  </div>
                </div>

                {/* QR Code Verification Pass */}
                <div className="card card-gold" style={{ textAlign: 'center', padding: '24px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F1729', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <QrCode size={16} color="#E67E22" /> Official QR Inspection Pass
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.62rem' }}>Field Verification</span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#1E3A8A', marginBottom: 16 }}>
                    Checkposts and DMGO vigilance officers scan this QR to verify authenticity and permit validity.
                  </p>

                  <div style={{
                    display: 'inline-block', padding: 12, background: '#fff',
                    borderRadius: 12, border: '1px solid #DBEAFE', boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  }}>
                    <img
                      src={qrCodeUrl}
                      alt={`QR Code for ${block.id}`}
                      style={{ width: 170, height: 170, display: 'block' }}
                    />
                  </div>

                  <div style={{ marginTop: 14, fontSize: '0.72rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                    Payload: {block.id} | {s?.granite_type || 'Granite'} | {lengthM}x{breadthM}x{heightM}m
                  </div>

                  <a
                    href={qrCodeUrl}
                    download={`QR_${block.id}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                  >
                    <Download size={13} /> Save QR Code
                  </a>
                </div>

                {/* Government Authentication Badge */}
                <div style={{
                  background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 12,
                  padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#64748B',
                }}>
                  <div style={{ fontWeight: 800, color: '#1E3A8A', marginBottom: 4 }}>
                    Government of Andhra Pradesh
                  </div>
                  <div>Department of Mines &amp; Geology · Smart Granite Verification System</div>
                  <div style={{ fontSize: '0.68rem', marginTop: 4, color: '#94A3B8' }}>
                    Immutable digital custody record generated under AP DMG Mining Rules.
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
