import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import AICommandCenter from './AICommandCenter';

// ── Icon helpers ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = 'currentColor', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  scan:    'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M12 8v4l3 3',
  alert:   'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  truck:   'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  check:   'M20 6L9 17l-5-5',
  flag:    'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  seize:   'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  qr:      'M3 3h7v7H3V3zM14 3h7v7h-7V3zM3 14h7v7H3v-7zM14 17h7M17 14v7',
  pass:    'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  info:    'M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01',
  vehicle: 'M19 17H5a2 2 0 01-2-2v-7a2 2 0 012-2h14a2 2 0 012 2v7a2 2 0 01-2 2zM16 21H8M12 17v4',
  dash:    'M3 12h18M3 6h18M3 18h18',
  copy:    'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2',
  lock:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  bg:       '#F8FAFC',
  surface:  '#FFFFFF',
  border:   '#E2E8F0',
  text:     '#1E293B',
  sub:      '#64748B',
  brand:    '#1A56DB',
  brandL:   '#EBF5FF',
  success:  '#10B981',
  successL: '#ECFDF5',
  warn:     '#F59E0B',
  warnL:    '#FFFBEB',
  danger:   '#EF4444',
  dangerL:  '#FEF2F2',
  orange:   '#F97316',
  orangeL:  '#FFF7ED',
};

// Status color map
function statusColor(status) {
  if (!status) return { bg: '#F1F5F9', text: '#64748B' };
  const s = status.toLowerCase();
  if (s.includes('seiz')) return { bg: C.dangerL, text: C.danger };
  if (s.includes('flag') || s.includes('warning')) return { bg: C.warnL, text: C.warn };
  if (s.includes('pass') || s.includes('dispatched') || s.includes('approved') || s.includes('delivered')) return { bg: C.successL, text: C.success };
  return { bg: '#F1F5F9', text: C.sub };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = C.brand, colorLight = C.brandL, loading }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '18px 22px',
      display: 'flex', gap: 14, alignItems: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
    >
      <div style={{ background: colorLight, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon d={icon} color={color} size={22} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>
          {loading ? <span style={{ background: C.border, borderRadius: 4, width: 50, height: 24, display: 'inline-block', animation: 'pulse 1.2s infinite' }} /> : value}
        </div>
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{ background: bg || '#F1F5F9', color: color || C.sub, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  );
}

// ── Warning chip ──────────────────────────────────────────────────────────────
function WarnChip({ w }) {
  const sev = { CRITICAL: [C.danger, C.dangerL], HIGH: [C.warn, C.warnL], MEDIUM: [C.orange, C.orangeL] };
  const [col, bg] = sev[w.severity] || [C.sub, '#F1F5F9'];
  return (
    <div style={{ background: bg, border: `1px solid ${col}33`, borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <Icon d={ICONS.alert} color={col} size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: col, textTransform: 'uppercase', marginBottom: 2 }}>{w.severity}</div>
        <div style={{ fontSize: 13, color: C.text }}>{w.message}</div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
      <div style={{ background: C.brandL, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d={ICONS[icon] || icon} color={C.brand} size={18} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.sub }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ── Challan Breakdown ─────────────────────────────────────────────────────────
function ChallanBreakdown({ data }) {
  if (!data || !data.challan_breakdown) return null;
  const cb = data.challan_breakdown;
  const rows = [
    { label: 'Base Seigniorage', note: `₹${data.rate_per_mt}/MT × ${data.estimated_weight_mt} MT`, amount: cb.base_seigniorage },
    { label: 'DMF — Dist. Mineral Foundation', note: `${cb.dmf.rate_pct}% of seigniorage`, amount: cb.dmf.amount },
    { label: 'MERIT Scholarship Fund', note: `${cb.merit.rate_pct}% of seigniorage`, amount: cb.merit.amount },
    { label: 'Green Environment Cess', note: `₹${cb.green_cess.rate_per_mt}/MT × ${cb.green_cess.weight_mt} MT`, amount: cb.green_cess.amount },
  ];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      <div style={{ background: '#0F172A', padding: '12px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Icon d={ICONS.copy} color="#94A3B8" size={16} />
        <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>STATUTORY CHALLAN — AP MINES & GEOLOGY</span>
      </div>
      <div style={{ padding: '14px 18px', overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 16px', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: C.sub, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>ITEM</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: C.sub, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>RATE BASIS</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: C.sub, paddingBottom: 6, borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>AMOUNT (₹)</div>

          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: C.sub }}>{r.note}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: 'right' }}>₹{r.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#0F172A', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: 13 }}>TOTAL CHALLAN AMOUNT</span>
          <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: 20 }}>
            ₹{cb.total_challan?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Block Scan Result Card ────────────────────────────────────────────────────
function BlockScanCard({ data, onAction }) {
  const [action, setAction] = useState('');
  const [remarks, setRemarks] = useState('');
  const [vehicleActual, setVehicleActual] = useState('');
  const [measL, setMeasL] = useState('');
  const [measB, setMeasB] = useState('');
  const [measH, setMeasH] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [challan, setChallan] = useState(null);
  const [challanLoading, setChallanLoading] = useState(false);
  const [showChallan, setShowChallan] = useState(false);

  const pct = (data.seigniorage?.total_challan / 100000)?.toFixed(2);

  const scol = statusColor(data.permit_valid ? (data.status_ok ? 'dispatched' : 'warning') : 'seized');

  const fetchChallan = async () => {
    if (challan) { setShowChallan(v => !v); return; }
    setChallanLoading(true);
    try {
      const c = await api.getChallan(data.block_id);
      setChallan(c);
      setShowChallan(true);
    } catch (e) {
      console.error(e);
    } finally {
      setChallanLoading(false);
    }
  };

  const handleAction = async (act) => {
    setActionLoading(true);
    try {
      const payload = {
        block_id: data.block_id,
        vehicle_number: vehicleActual || data.dispatch?.vehicle_number || '',
        checkpost_location: 'Field Check',
        action: act,
        flag_reason: action || undefined,
        officer_remarks: remarks || undefined,
        intercepted_length: measL ? parseFloat(measL) : undefined,
        intercepted_breadth: measB ? parseFloat(measB) : undefined,
        intercepted_height: measH ? parseFloat(measH) : undefined,
      };
      await api.roadsideCheck(payload);
      onAction?.('success', act);
    } catch (e) {
      onAction?.('error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
      {/* Header */}
      <div style={{ background: data.permit_valid && data.status_ok ? '#0F172A' : '#7F1D1D', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 18 }}>{data.block_id}</div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>{data.quarry?.name} · {data.quarry?.district}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={data.status?.toUpperCase().replace(/_/g, ' ')} color={scol.text} bg={scol.bg} />
          <Badge label={data.permit_valid ? '✓ PERMIT VALID' : '✗ NO PERMIT'} color={data.permit_valid ? C.success : C.danger} bg={data.permit_valid ? C.successL : C.dangerL} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: '16px 20px' }}>
        {/* Block Info */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Block Details</div>
          <InfoRow label="Block Type" value={data.block_type} />
          <InfoRow label="GPS Origin" value={data.gps_origin || 'N/A'} />
          <InfoRow label="Quarry MDL" value={data.quarry?.mdl_number || 'N/A'} />
          {data.measurement && <>
            <InfoRow label="Dimensions (cm)" value={`${data.measurement.length} × ${data.measurement.breadth} × ${data.measurement.height}`} />
            <InfoRow label="Volume (m³)" value={data.measurement.volume?.toFixed(4)} />
            <InfoRow label="Est. Weight (MT)" value={data.measurement.estimated_weight?.toFixed(2)} />
            <InfoRow label="AI Method" value={data.measurement.measurement_method} />
            <InfoRow label="AI Confidence" value={data.measurement.confidence ? `${data.measurement.confidence}%` : 'N/A'} />
          </>}
        </div>

        {/* Seigniorage */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seigniorage</div>
          <InfoRow label="Granite Type" value={data.seigniorage?.granite_type} />
          <InfoRow label="Govt Category" value={data.seigniorage?.government_category} />
          <InfoRow label="Gangsaw Class" value={data.seigniorage?.class_status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
          <InfoRow label="Rate (₹/MT)" value={data.seigniorage?.rate_per_mt?.toLocaleString('en-IN')} />
          <InfoRow label="Base Seigniorage" value={`₹${data.seigniorage?.base_seigniorage?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
          <InfoRow label="Total Challan" value={<span style={{ fontWeight: 800, color: C.brand }}>₹{data.seigniorage?.total_challan?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>} />
        </div>

        {/* Transit Pass */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transit Pass</div>
          {data.dispatch ? <>
            <InfoRow label="Vehicle No." value={data.dispatch.vehicle_number} highlight />
            <InfoRow label="Driver" value={data.dispatch.driver_name} />
            <InfoRow label="Destination" value={data.dispatch.destination} />
            <InfoRow label="e-Permit No." value={data.dispatch.e_permit_number || '—'} />
            <InfoRow label="Transit Form" value={data.dispatch.transit_form_no || '—'} />
            <InfoRow label="Dispatched" value={data.dispatch.dispatch_time ? new Date(data.dispatch.dispatch_time).toLocaleString('en-IN') : '—'} />
          </> : (
            <div style={{ background: C.dangerL, borderRadius: 8, padding: '10px 14px', color: C.danger, fontWeight: 600, fontSize: 13 }}>
              ⚠ No transit permit found
            </div>
          )}
          {data.weighbridge && (
            <InfoRow label="Weighbridge" value={`${data.weighbridge.status?.toUpperCase()} (${data.weighbridge.difference_percentage?.toFixed(1)}% var.)`} />
          )}
        </div>
      </div>

      {/* Warnings */}
      {data.warnings?.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 8, textTransform: 'uppercase' }}>⚠ Warnings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.warnings.map((w, i) => <WarnChip key={i} w={w} />)}
          </div>
        </div>
      )}

      {/* Challan button */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={fetchChallan} disabled={challanLoading}
          style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#F1F5F9', color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {challanLoading ? '⏳' : (showChallan ? '▲ Hide' : '▼ View')} Statutory Challan
        </button>
      </div>
      {showChallan && challan && <div style={{ padding: '0 20px 16px' }}><ChallanBreakdown data={challan} /></div>}

      {/* Field Action Panel */}
      <div style={{ background: '#F8FAFC', borderTop: `1px solid ${C.border}`, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 12, textTransform: 'uppercase' }}>Field Officer Action</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>Vehicle No. (intercepted)</label>
            <input value={vehicleActual} onChange={e => setVehicleActual(e.target.value)}
              placeholder={data.dispatch?.vehicle_number || 'AP00XX0000'}
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>Field-measured Length (cm)</label>
            <input type="number" value={measL} onChange={e => setMeasL(e.target.value)}
              placeholder={data.measurement?.length || '—'}
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>Field-measured Breadth (cm)</label>
            <input type="number" value={measB} onChange={e => setMeasB(e.target.value)}
              placeholder={data.measurement?.breadth || '—'}
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>Field-measured Height (cm)</label>
            <input type="number" value={measH} onChange={e => setMeasH(e.target.value)}
              placeholder={data.measurement?.height || '—'}
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>Violation Reason</label>
            <select value={action} onChange={e => setAction(e.target.value)}
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff', boxSizing: 'border-box' }}>
              <option value="">— Select —</option>
              <option value="no_permit">No Transit Permit</option>
              <option value="permit_expired">Permit Expired</option>
              <option value="dimension_excess">Dimension Mismatch (&gt;5%)</option>
              <option value="vehicle_mismatch">Vehicle Number Mismatch</option>
              <option value="weight_excess">Excess Weight</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>Officer Remarks</label>
            <input value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Notes..."
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <ActionBtn color={C.success} bg={C.successL} icon={ICONS.pass} label="PASS & CLEAR" onClick={() => handleAction('pass')} loading={actionLoading} />
          <ActionBtn color={C.warn} bg={C.warnL} icon={ICONS.flag} label="FLAG FOR FOLLOW-UP" onClick={() => handleAction('flag')} loading={actionLoading} />
          <ActionBtn color={C.danger} bg={C.dangerL} icon={ICONS.seize} label="SEIZE VEHICLE" onClick={() => handleAction('seize')} loading={actionLoading} />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ color, bg, icon, label, onClick, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', gap: 6, alignItems: 'center',
        padding: '9px 16px', borderRadius: 9, border: `1.5px solid ${color}44`,
        background: hov ? color : bg, color: hov ? '#fff' : color,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 13,
        transition: 'all 0.15s',
        opacity: loading ? 0.7 : 1,
      }}>
      <Icon d={icon} color={hov ? '#fff' : color} size={15} />
      {loading ? '...' : label}
    </button>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: C.sub, minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? C.text : '#374151', wordBreak: 'break-all' }}>{value ?? '—'}</span>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
const AP_CHECKPOSTS = [
  { name: 'Nellore', district: 'Nellore', status: 'active', checks: 14 },
  { name: 'Guntur', district: 'Guntur', status: 'active', checks: 9 },
  { name: 'Krishna', district: 'Krishna', status: 'alert', checks: 3 },
  { name: 'Visakhapatnam', district: 'Visakhapatnam', status: 'active', checks: 22 },
  { name: 'Kurnool', district: 'Kurnool', status: 'active', checks: 7 },
  { name: 'Kadapa', district: 'Kadapa', status: 'inactive', checks: 0 },
  { name: 'Anantapur', district: 'Anantapur', status: 'active', checks: 11 },
  { name: 'Prakasam', district: 'Prakasam', status: 'alert', checks: 2 },
  { name: 'Chittoor', district: 'Chittoor', status: 'active', checks: 6 },
  { name: 'East Godavari', district: 'EG', status: 'active', checks: 18 },
  { name: 'West Godavari', district: 'WG', status: 'inactive', checks: 0 },
  { name: 'Srikakulam', district: 'Srikakulam', status: 'active', checks: 4 },
];

const SECTION_21 = [
  { title: 'Sec. 21 MMDR Act — Penalty for Unlawful Mining', content: 'Any person who extracts, transports, or stores minerals without a valid lease or permit shall be liable to a penalty of up to ₹5,00,000 and imprisonment up to 5 years.' },
  { title: 'Form G — Seizure Notice', content: 'Issued when a vehicle is found transporting minerals without a valid transit pass. The officer must record vehicle number, driver details, estimated quantity, and reason for seizure.' },
  { title: '±5% Weighbridge Tolerance', content: 'A mismatch of more than ±5% between AI estimated weight and actual weighbridge weight triggers an automatic DMGO alert and flags the block for secondary review.' },
  { title: 'e-Transit Pass Validity', content: 'All transit passes issued under AP Mining Regulations are valid for 48 hours from dispatch time. Passes must be presented at all AP checkposts en route.' },
];

const TICKER_ITEMS = [
  '⚠ HIGH ALERT — 2 blocks flagged in Krishna district today',
  '🚛 14 vehicles checked at Nellore checkpost — 12 cleared',
  '📊 System uptime: 99.8% — All checkposts syncing normally',
  '🔒 Form G issued: BLK-20250907 — Anantapur checkpost',
  '✅ Visakhapatnam checkpost: 22 blocks verified today',
  '⚡ OMEPS sync successful — 847 records pushed at 14:30',
];

function EnforcementDashboard({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState(null);

  // Quick Action Modal states
  const [showSeizeModal, setShowSeizeModal] = useState(false);
  const [showFormGModal, setShowFormGModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Form G state
  const [formGData, setFormGData] = useState({
    block_id: '',
    vehicle_number: '',
    checkpost: 'Nellore',
    seizure_ground: 'Transportation without valid e-Transit pass (Rule 26 MMDR)',
    compounding_amount: 25000,
    remarks: '',
  });
  const [formGLoading, setFormGLoading] = useState(false);
  const [formGSuccess, setFormGSuccess] = useState(null);
  const [formGError, setFormGError] = useState('');

  // Seize Vehicle state
  const [seizeData, setSeizeData] = useState({
    vehicle_number: '',
    block_id: '',
    checkpost: 'Nellore',
    reason: 'no_permit',
    remarks: 'Roadside checkpost interception - unauthorized transit',
  });
  const [seizeLoading, setSeizeLoading] = useState(false);
  const [seizeSuccess, setSeizeSuccess] = useState(null);
  const [seizeError, setSeizeError] = useState('');

  const refreshStats = useCallback(() => {
    api.enforcementDashboardStats().then(s => setStats(s)).catch(() => {});
  }, []);

  useEffect(() => {
    api.enforcementDashboardStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleFormGSubmit = async (e) => {
    e.preventDefault();
    if (!formGData.block_id.trim()) {
      setFormGError('Block ID or Consignment Reference is required');
      return;
    }
    setFormGLoading(true);
    setFormGError('');
    try {
      const res = await api.issueSeizerNotice({
        block_id: formGData.block_id.trim(),
        seizure_ground: formGData.seizure_ground,
        officer_name: user?.username || 'Vigilance Officer',
        checkpost: formGData.checkpost,
        compounding_amount: parseFloat(formGData.compounding_amount) || 0,
      });
      setFormGSuccess(res);
      refreshStats();
    } catch (err) {
      setFormGError(err.message || 'Failed to issue Form G notice');
    } finally {
      setFormGLoading(false);
    }
  };

  const handleSeizeSubmit = async (e) => {
    e.preventDefault();
    if (!seizeData.vehicle_number.trim()) {
      setSeizeError('Vehicle registration number is required');
      return;
    }
    setSeizeLoading(true);
    setSeizeError('');
    try {
      const blockIdToUse = seizeData.block_id.trim() || `SEIZED-${Date.now().toString().slice(-6)}`;
      const res = await api.roadsideCheck({
        block_id: blockIdToUse,
        vehicle_number: seizeData.vehicle_number.trim().toUpperCase(),
        checkpost_location: seizeData.checkpost,
        action: 'seize',
        flag_reason: seizeData.reason,
        officer_remarks: seizeData.remarks || 'Vehicle seized during roadside checkpost inspection',
      });
      setSeizeSuccess({ ...res, vehicle: seizeData.vehicle_number.trim().toUpperCase() });
      refreshStats();
    } catch (err) {
      setSeizeError(err.message || 'Failed to execute vehicle seizure');
    } finally {
      setSeizeLoading(false);
    }
  };

  const downloadCSVReport = () => {
    const passedCount = (stats?.total_in_transit || 0) - (stats?.total_seized || 0) - (stats?.weighbridge_flagged || 0);
    const rows = [
      ['AP MINES & GEOLOGY - DAILY ROAD ENFORCEMENT REPORT'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Officer / User', user?.username || 'Officer'],
      [],
      ['SUMMARY METRIC', 'COUNT'],
      ['Total in Transit', stats?.total_in_transit ?? 0],
      ['Passed (Compliant)', passedCount],
      ['Weighbridge Flagged', stats?.weighbridge_flagged ?? 0],
      ['Seized Blocks / Vehicles', stats?.total_seized ?? 0],
      ['Total Checks Recorded', stats?.total_enforcement_checks ?? 0],
      [],
      ['DISTRICT CHECKPOST', 'DISTRICT', 'STATUS', 'CHECKS TODAY'],
      ...AP_CHECKPOSTS.map(c => [c.name, c.district, c.status.toUpperCase(), c.checks]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AP_Enforcement_Daily_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColor_ = (s) => s === 'active' ? '#10B981' : s === 'alert' ? '#EF4444' : '#94A3B8';
  const statusLabel  = (s) => s === 'active' ? 'Active' : s === 'alert' ? '⚠ Alert' : 'Offline';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Road Alert Ticker ────────────────── */}
      <div style={{
        background: '#0F172A', color: '#F8FAFC',
        borderRadius: 10, padding: '8px 16px',
        overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        animation: 'slideInUp 0.4s ease-out',
        minWidth: 0, width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ background: '#EF4444', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0 }}>
          🔴 LIVE
        </div>
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', animation: 'ticker 30s linear infinite', fontSize: 12, fontWeight: 500, color: '#E2E8F0' }}>
            {TICKER_ITEMS.join('  ·  ')}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon={ICONS.truck} label="In Transit" value={stats?.total_in_transit ?? 0} loading={loading} />
        <StatCard icon={ICONS.lock} label="Seized Blocks" value={stats?.total_seized ?? 0} color={C.danger} colorLight={C.dangerL} loading={loading} />
        <StatCard icon={ICONS.alert} label="Weighbridge Flagged" value={stats?.weighbridge_flagged ?? 0} color={C.warn} colorLight={C.warnL} loading={loading} />
        <StatCard icon={ICONS.check} label="Total Checks" value={stats?.total_enforcement_checks ?? 0} color={C.success} colorLight={C.successL} loading={loading} />
      </div>

      {/* ── AP Checkpost Map Grid ────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', animation: 'slideInUp 0.5s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ background: C.brandL, borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={ICONS.dash} color={C.brand} size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>AP District Checkpost Network</div>
              <div style={{ fontSize: 11, color: C.sub }}>Real-time status — {AP_CHECKPOSTS.filter(c => c.status === 'active').length} active · {AP_CHECKPOSTS.filter(c => c.status === 'alert').length} on alert</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
            {[['#10B981','Active'],['#EF4444','Alert'],['#94A3B8','Offline']].map(([col, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, animation: lbl === 'Active' ? 'pulseDot 1.5s infinite' : 'none' }} />
                <span style={{ color: C.sub }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {AP_CHECKPOSTS.map((cp, i) => (
            <div key={cp.name} className="animate-slide-up" style={{
              animationDelay: `${i * 0.04}s`,
              background: cp.status === 'alert' ? '#FEF2F2' : cp.status === 'active' ? '#F0FDF4' : '#F8FAFC',
              border: `1.5px solid ${cp.status === 'alert' ? '#FECACA' : cp.status === 'active' ? '#6EE7B7' : '#E2E8F0'}`,
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 4,
              transition: 'all 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{cp.name}</div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: statusColor_(cp.status),
                  animation: cp.status === 'active' ? 'pulseDot 2s infinite' : 'none',
                }} />
              </div>
              <div style={{ fontSize: 10, color: statusColor_(cp.status), fontWeight: 700 }}>{statusLabel(cp.status)}</div>
              {cp.checks > 0 && (
                <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
                  {cp.checks} checks today
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Enforcement Stats & Quick Actions ────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Today's breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', animation: 'slideInLeft 0.55s ease-out' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>📊 Today's Enforcement Summary</div>
          {[
            { label: 'Passed (Compliant)', val: (stats?.total_in_transit || 0) - (stats?.total_seized || 0) - (stats?.weighbridge_flagged || 0), color: '#10B981', pct: 75 },
            { label: 'Flagged', val: stats?.weighbridge_flagged || 0, color: '#F59E0B', pct: 15 },
            { label: 'Seized', val: stats?.total_seized || 0, color: '#EF4444', pct: 10 },
          ].map(({ label, val, color, pct }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{val}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions for enforcement */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', animation: 'slideInRight 0.55s ease-out' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>⚡ Officer Quick Actions</div>
          <div className="quick-actions-grid">
            {[
              { icon: '🔍', label: 'Scan Block QR', bg: '#EFF6FF', onClick: () => onNavigate?.('scan') },
              { icon: '🚫', label: 'Seize Vehicle', bg: '#FEF2F2', onClick: () => { setSeizeSuccess(null); setSeizeError(''); setShowSeizeModal(true); } },
              { icon: '📋', label: 'View Incidents', bg: '#FFFBEB', onClick: () => onNavigate?.('flagged') },
              { icon: '📝', label: 'File Form G', bg: '#F5F3FF', onClick: () => { setFormGSuccess(null); setFormGError(''); setShowFormGModal(true); } },
              { icon: '🤖', label: 'AI Assistant', bg: '#F0FDF4', onClick: () => onNavigate?.('ai_center') },
              { icon: '📊', label: 'Daily Report', bg: '#EFF6FF', onClick: () => setShowReportModal(true) },
            ].map((action, i) => (
              <button
                key={i}
                type="button"
                className="quick-action-btn"
                style={{ animationDelay: `${i * 0.06}s`, cursor: 'pointer', transition: 'all 0.15s ease' }}
                onClick={action.onClick}
                title={`Click to open ${action.label}`}
              >
                <div className="qa-icon" style={{ background: action.bg }}>{action.icon}</div>
                <span className="qa-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODAL 1: Form G Seizure Notice Modal ── */}
      {showFormGModal && (
        <div
          onClick={() => setShowFormGModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', width: '100%', maxWidth: 560, borderRadius: 20,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', maxHeight: '92vh'
            }}
          >
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #7F1D1D, #B91C1C)', padding: '20px 24px', color: '#fff', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowFormGModal(false)}
                style={{
                  position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
                  border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FECACA', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                GOVERNMENT OF ANDHRA PRADESH · DEPT OF MINES & GEOLOGY
              </div>
              <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 800 }}>
                Form G — Seizure Notice (Sec. 21 MMDR Act 1957)
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#FEE2E2', opacity: 0.9 }}>
                Issue statutory seizure of mineral consignment or vehicle transporting without valid transit pass.
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, background: '#FAFCFF' }}>
              {formGSuccess ? (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, fontWeight: 900 }}>
                    ✓
                  </div>
                  <h4 style={{ margin: '0 0 6px', color: '#065F46', fontSize: 17, fontWeight: 800 }}>
                    Form G Seizure Notice Filed Successfully!
                  </h4>
                  <div style={{ fontSize: 13, color: '#047857', marginBottom: 12 }}>
                    Official Notice Reference: <strong style={{ color: '#0F172A', background: '#FEF3C7', padding: '2px 8px', borderRadius: 4 }}>{formGSuccess.notice_number || 'SN-RECORDED'}</strong>
                  </div>
                  <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Block status updated to <strong>SEIZED</strong> in AP Mines Registry and audit trail logged.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1',
                        background: '#FFF', color: '#1E293B', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                      }}
                    >
                      🖨️ Print Form G Notice
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFormGModal(false)}
                      style={{
                        padding: '10px 20px', borderRadius: 8, border: 'none',
                        background: '#059669', color: '#FFF', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormGSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {formGError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>
                      ⚠ {formGError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Block ID / Consignment Ref <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BLK-618398 or REAL-BLK-68589"
                      value={formGData.block_id}
                      onChange={e => setFormGData({ ...formGData, block_id: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Vehicle Reg. Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AP 27 TX 4892"
                        value={formGData.vehicle_number}
                        onChange={e => setFormGData({ ...formGData, vehicle_number: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Checkpost Location <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        value={formGData.checkpost}
                        onChange={e => setFormGData({ ...formGData, checkpost: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box', background: '#FFF' }}
                      >
                        {AP_CHECKPOSTS.map(c => (
                          <option key={c.name} value={c.name}>{c.name} Checkpost ({c.district})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Statutory Ground for Seizure <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={formGData.seizure_ground}
                      onChange={e => setFormGData({ ...formGData, seizure_ground: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box', background: '#FFF' }}
                    >
                      <option value="Transportation without valid e-Transit pass (Rule 26 MMDR)">Transportation without valid e-Transit pass (Rule 26 MMDR)</option>
                      <option value="Dimension & volume excess exceeding statutory tolerance (Sec 21)">Dimension & volume excess exceeding statutory tolerance (Sec 21)</option>
                      <option value="Expired e-Transit permit presented at checkpost">Expired e-Transit permit presented at checkpost</option>
                      <option value="Weighbridge discrepancy > ±5% with no valid permit justification">Weighbridge discrepancy &gt; ±5% with no valid permit justification</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Compounding Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={formGData.compounding_amount}
                        onChange={e => setFormGData({ ...formGData, compounding_amount: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Reporting Officer
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.username || 'Officer'}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box', background: '#F1F5F9', color: '#64748B' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowFormGModal(false)}
                      style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formGLoading}
                      style={{
                        padding: '10px 20px', borderRadius: 8, border: 'none',
                        background: formGLoading ? '#94A3B8' : '#B91C1C', color: '#FFF',
                        fontWeight: 700, fontSize: 13, cursor: formGLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      {formGLoading ? 'Filing Notice...' : '📝 Issue Form G Seizure Notice'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Roadside Seize Vehicle Modal ── */}
      {showSeizeModal && (
        <div
          onClick={() => setShowSeizeModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', width: '100%', maxWidth: 540, borderRadius: 20,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, #991B1B, #EF4444)', padding: '20px 24px', color: '#fff', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowSeizeModal(false)}
                style={{
                  position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
                  border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FEE2E2', letterSpacing: '0.06em' }}>
                FIELD VIGILANCE INTERCEPTION
              </div>
              <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 800 }}>
                🚫 Roadside Vehicle Seizure
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#FEF2F2', opacity: 0.9 }}>
                Record on-spot interception and impound non-compliant granite transport vehicle.
              </p>
            </div>

            <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, background: '#FAFCFF' }}>
              {seizeSuccess ? (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 22, fontWeight: 800 }}>
                    ✓
                  </div>
                  <h4 style={{ margin: '0 0 6px', color: '#065F46', fontSize: 16, fontWeight: 800 }}>
                    Vehicle Seizure Recorded Successfully
                  </h4>
                  <div style={{ fontSize: 13, color: '#047857', marginBottom: 14 }}>
                    Vehicle: <strong>{seizeSuccess.vehicle}</strong> | Block: <strong>{seizeSuccess.block_id}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSeizeModal(false);
                        onNavigate?.('flagged');
                      }}
                      style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#0F172A', color: '#FFF', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                      View in Flagged Log
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSeizeModal(false)}
                      style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSeizeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {seizeError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>
                      ⚠ {seizeError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Vehicle Registration Number <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AP 27 TX 4892"
                      value={seizeData.vehicle_number}
                      onChange={e => setSeizeData({ ...seizeData, vehicle_number: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Block ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BLK-618398"
                        value={seizeData.block_id}
                        onChange={e => setSeizeData({ ...seizeData, block_id: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Checkpost
                      </label>
                      <select
                        value={seizeData.checkpost}
                        onChange={e => setSeizeData({ ...seizeData, checkpost: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box', background: '#FFF' }}
                      >
                        {AP_CHECKPOSTS.map(c => (
                          <option key={c.name} value={c.name}>{c.name} Checkpost</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Primary Seizure Ground
                    </label>
                    <select
                      value={seizeData.reason}
                      onChange={e => setSeizeData({ ...seizeData, reason: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box', background: '#FFF' }}
                    >
                      <option value="no_permit">No Transit Pass / Unregistered Vehicle</option>
                      <option value="vehicle_mismatch">Vehicle Registration Mismatch with e-Permit</option>
                      <option value="dimension_excess">Dimension Excess &gt; ±5% Legal Tolerance</option>
                      <option value="permit_expired">Transit Permit Expired</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Officer Remarks
                    </label>
                    <textarea
                      rows="2"
                      value={seizeData.remarks}
                      onChange={e => setSeizeData({ ...seizeData, remarks: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSeizeModal(false);
                        onNavigate?.('vehicle');
                      }}
                      style={{ background: 'none', border: 'none', color: '#1A56DB', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0 }}
                    >
                      🔍 Search Vehicle Registry First →
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowSeizeModal(false)}
                        style={{ padding: '9px 15px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={seizeLoading}
                        style={{
                          padding: '9px 18px', borderRadius: 8, border: 'none',
                          background: seizeLoading ? '#94A3B8' : '#EF4444', color: '#FFF',
                          fontWeight: 700, fontSize: 13, cursor: seizeLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {seizeLoading ? 'Recording Seizure...' : '🚫 Confirm Roadside Seizure'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Daily Report Summary Modal ── */}
      {showReportModal && (
        <div
          onClick={() => setShowReportModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', width: '100%', maxWidth: 620, borderRadius: 20,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #1A56DB)', padding: '20px 24px', color: '#fff', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{
                  position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
                  border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#DBEAFE', letterSpacing: '0.06em' }}>
                AP MINES & GEOLOGY · VIGILANCE DISPATCH
              </div>
              <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 800 }}>
                📊 Daily Road Enforcement Summary
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#EFF6FF', opacity: 0.9 }}>
                Official snapshot for {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, background: '#F8FAFC' }}>
              {/* Metric chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>In Transit</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginTop: 2 }}>{stats?.total_in_transit ?? 0}</div>
                </div>
                <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Compliant</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981', marginTop: 2 }}>
                    {(stats?.total_in_transit || 0) - (stats?.total_seized || 0) - (stats?.weighbridge_flagged || 0)}
                  </div>
                </div>
                <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>Flagged</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B', marginTop: 2 }}>{stats?.weighbridge_flagged ?? 0}</div>
                </div>
                <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Seized</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{stats?.total_seized ?? 0}</div>
                </div>
              </div>

              {/* District breakdown table */}
              <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 18 }}>
                <div style={{ padding: '10px 16px', background: '#0F172A', color: '#F1F5F9', fontSize: 12, fontWeight: 700 }}>
                  District Checkpost Inspection Tally
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {AP_CHECKPOSTS.map((c, i) => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: i < AP_CHECKPOSTS.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: 12 }}>
                      <div>
                        <strong>{c.name}</strong> <span style={{ color: '#94A3B8' }}>({c.district})</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: c.status === 'active' ? '#10B981' : c.status === 'alert' ? '#EF4444' : '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          {c.status}
                        </span>
                        <span style={{ fontWeight: 800, color: '#1E293B', minWidth: 50, textAlign: 'right' }}>
                          {c.checks} checks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', color: '#1E293B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  🖨️ Print Report
                </button>
                <button
                  type="button"
                  onClick={downloadCSVReport}
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1A56DB', color: '#FFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  📥 Download CSV File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent incidents */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon d={ICONS.flag} color={C.warn} size={18} />
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Recent Enforcement Incidents</span>
        </div>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.sub }}>Loading...</div>
          ) : (stats?.recent_incidents?.length === 0 || !stats?.recent_incidents) ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.sub }}>
              <Icon d={ICONS.check} color={C.success} size={40} />
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: C.success }}>No incidents recorded</div>
              <div style={{ fontSize: 13, color: C.sub }}>All transit operations appear compliant</div>
            </div>
          ) : (
            stats.recent_incidents.map((inc, i) => {
              const sc = statusColor(inc.event.includes('SEIZ') ? 'seized' : inc.event.includes('FLAG') ? 'flagged' : 'pass');
              return (
                <div key={i} style={{ padding: '12px 20px', borderBottom: i < stats.recent_incidents.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge label={inc.event.replace(/_/g, ' ')} color={sc.text} bg={sc.bg} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{inc.block_id}</span>
                  <span style={{ fontSize: 12, color: C.sub }}>by {inc.officer}</span>
                  <span style={{ fontSize: 12, color: C.sub, marginLeft: 'auto' }}>
                    {inc.timestamp ? new Date(inc.timestamp).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Statutory Quick Reference ──────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', animation: 'slideInUp 0.7s ease-out' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>📖 Statutory Quick Reference — AP Mines & MMDR Act</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTION_21.map((s, i) => (
            <div key={i} style={{
              border: `1px solid ${openSection === i ? C.brand : C.border}`,
              borderRadius: 10, overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}>
              <button
                type="button"
                onClick={() => setOpenSection(openSection === i ? null : i)}
                style={{
                  width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: openSection === i ? '#EFF6FF' : C.surface, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, color: openSection === i ? C.brand : C.text, textAlign: 'left',
                }}
              >
                <span>{s.title}</span>
                <span style={{ fontSize: 18, color: C.sub, transition: 'transform 0.2s', transform: openSection === i ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {openSection === i && (
                <div style={{ padding: '10px 16px 14px', fontSize: 13, color: C.sub, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, background: '#FAFCFF' }}>
                  {s.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Scan Tab ──────────────────────────────────────────────────────────────────
function ScanTab() {
  const [blockId, setBlockId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const scan = async () => {
    if (!blockId.trim()) return;
    setLoading(true); setError(''); setScanResult(null);
    try {
      const data = await api.enforcementScan(blockId.trim());
      setScanResult(data);
    } catch (e) {
      setError(e.message || 'Block not found in AP Mines Registry');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? C.success : C.danger,
          color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', animation: 'slideIn 0.2s ease',
        }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Search bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
        <SectionHeader icon="qr" title="Scan Block at Checkpost" subtitle="Enter Block ID from QR code or physical label" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={blockId}
            onChange={e => setBlockId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scan()}
            placeholder="e.g. BLK-20250908143520 or UD-20250908143520"
            style={{
              flex: 1, padding: '12px 16px', border: `2px solid ${loading ? C.brand : C.border}`,
              borderRadius: 10, fontSize: 15, fontWeight: 500, color: C.text,
              outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = C.brand}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button onClick={scan} disabled={loading || !blockId.trim()}
            style={{
              padding: '0 24px', borderRadius: 10, border: 'none',
              background: loading ? '#93C5FD' : C.brand, color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, minWidth: 110,
              transition: 'background 0.2s',
            }}>
            {loading ? '⏳ Scanning...' : <><Icon d={ICONS.search} color="#fff" size={17} /> SCAN</>}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, background: C.dangerL, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: '10px 14px', color: C.danger, fontWeight: 600, fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Result */}
      {scanResult && (
        <BlockScanCard data={scanResult} onAction={(type, msg) => showToast(type, `Action ${msg} recorded successfully`)} />
      )}
    </div>
  );
}

// ── Vehicle Search Tab ────────────────────────────────────────────────────────
function VehicleSearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.searchByVehicle(query.trim());
      setResults(data);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s) => {
    const sc = statusColor(s);
    return <Badge label={s?.toUpperCase().replace(/_/g, ' ') || 'UNKNOWN'} color={sc.text} bg={sc.bg} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
        <SectionHeader icon="vehicle" title="Vehicle Number Lookup" subtitle="Search all transit passes by vehicle registration" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="e.g. AP09AB1234 or partial: AP09"
            style={{
              flex: 1, padding: '12px 16px', border: `2px solid ${C.border}`,
              borderRadius: 10, fontSize: 15, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = C.brand}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button onClick={search} disabled={loading || !query.trim()}
            style={{
              padding: '0 24px', borderRadius: 10, border: 'none',
              background: C.brand, color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <Icon d={ICONS.search} color="#fff" size={17} /> SEARCH
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, color: C.sub }}>
            {results.length} transit record{results.length > 1 ? 's' : ''} found for "{query}"
          </div>
          {results.map((r, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ minWidth: 130 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{r.vehicle_number}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{r.driver_name}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{r.block_id}</div>
                <div style={{ fontSize: 12, color: C.sub }}>→ {r.destination} · {r.quarry_district}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.sub }}>e-Permit</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: r.e_permit_number ? C.success : C.danger }}>
                  {r.e_permit_number || 'NONE'}
                </div>
              </div>
              <div>
                {statusBadge(r.block_status)}
              </div>
              <div style={{ fontSize: 12, color: C.sub }}>
                {r.dispatch_time ? new Date(r.dispatch_time).toLocaleString('en-IN') : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.sub, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
          No transit records found for "{query}"
        </div>
      )}
    </div>
  );
}

// ── Flagged Log Tab ───────────────────────────────────────────────────────────
function FlaggedLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFlaggedTransits().then(data => { setLogs(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon d={ICONS.flag} color={C.danger} size={18} />
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>All Enforcement Events</span>
        </div>
        <span style={{ fontSize: 13, color: C.sub }}>{logs.length} records</span>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.sub }}>Loading enforcement log...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.sub }}>
          <Icon d={ICONS.check} color={C.success} size={36} />
          <div style={{ marginTop: 8, color: C.success, fontWeight: 600 }}>No enforcement events recorded</div>
        </div>
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {logs.map((l, i) => {
            const sc = statusColor(l.event?.includes('SEIZ') ? 'seized' : l.event?.includes('FLAG') ? 'flagged' : 'pass');
            return (
              <div key={i} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Badge label={l.event?.replace(/_/g, ' ')} color={sc.text} bg={sc.bg} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{l.block_id}</span>
                  <span style={{ color: C.sub, fontSize: 12, marginLeft: 8 }}>by {l.officer}</span>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 3, lineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.details?.slice(0, 200)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.sub, whiteSpace: 'nowrap' }}>
                  {l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main EnforcementPanel ─────────────────────────────────────────────────────
export default function EnforcementPanel({ user, activeTab, setActiveTab }) {
  const resolveTab = (t) => (t === 'enforcement' ? 'dashboard' : (t || 'dashboard'));
  const [tab, setTab] = useState(resolveTab(activeTab));

  useEffect(() => {
    if (activeTab) setTab(resolveTab(activeTab));
  }, [activeTab]);

  const handleTabChange = (tId) => {
    setTab(tId);
  };

  const tabs = [
    { id: 'dashboard', icon: ICONS.dash,    label: 'Dashboard' },
    { id: 'scan',      icon: ICONS.qr,      label: 'Scan Block' },
    { id: 'vehicle',   icon: ICONS.vehicle, label: 'Vehicle Lookup' },
    { id: 'flagged',   icon: ICONS.flag,    label: 'Flagged Log' },
    { id: 'ai_center', icon: ICONS.info,    label: 'AI Help' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: C.text, minHeight: '100%', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes slideIn { from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1} }
        input:focus, select:focus { outline: none; box-shadow: 0 0 0 3px ${C.brandL}; }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ background: C.dangerL, borderRadius: 10, padding: '6px 10px' }}>
            <Icon d={ICONS.lock} color={C.danger} size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Road Vigilance & Enforcement Portal</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.sub }}>
              AP Mines & Geology — Section 21 MMDR Act 1957 · Checkpost Officer: {user?.username || 'Officer'}
            </p>
          </div>
        </div>
      </div>

      {/* Synchronized Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#EFF6FF', border: `1px solid #DBEAFE`, borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            style={{
              display: 'flex', gap: 6, alignItems: 'center',
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: tab === t.id ? C.brand : 'transparent',
              color: tab === t.id ? '#fff' : '#1E3A8A',
              fontWeight: tab === t.id ? 700 : 600, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            <Icon d={t.icon} color={tab === t.id ? '#fff' : '#1E3A8A'} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <EnforcementDashboard user={user} onNavigate={handleTabChange} />}
      {tab === 'scan' && <ScanTab />}
      {tab === 'vehicle' && <VehicleSearchTab />}
      {tab === 'flagged' && <FlaggedLogTab />}
      {tab === 'ai_center' && <AICommandCenter user={user} />}
    </div>
  );
}
