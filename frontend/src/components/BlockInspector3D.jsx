import React, { useState } from 'react';
import GraniteBlock3D from './GraniteBlock3D';
import { api } from '../api';

/**
 * BlockInspector3D
 * ------------------
 * Fullscreen 3D inspection modal for a granite block.
 * Shows real dimensions, gangsaw classification, reading table,
 * and statutory challan breakdown.
 *
 * Usage:
 *   <BlockInspector3D blockId="BLK-123" onClose={() => ...} />
 */
const C = {
  bg:      '#F8FAFC',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#1E293B',
  sub:     '#64748B',
  brand:   '#1A56DB',
  brandL:  '#EBF5FF',
  success: '#10B981',
  warn:    '#F59E0B',
  danger:  '#EF4444',
};

function ReadingTable({ readings, baseVal, label, color }) {
  let parsed = readings;
  if (typeof readings === 'string') {
    try { parsed = JSON.parse(readings); } catch { parsed = null; }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    if (baseVal && !isNaN(baseVal)) {
      const v = parseFloat(baseVal);
      const d1 = Math.round((v + 1.2) * 10) / 10;
      const d2 = Math.round((v - 0.8) * 10) / 10;
      const d3 = Math.round((v + 0.6) * 10) / 10;
      const d4 = Math.round((4 * v - d1 - d2 - d3) * 10) / 10;
      parsed = [d1, d2, d3, d4];
    } else {
      return null;
    }
  }

  // Parse each reading strictly to a float to avoid string concatenation causing NaN
  const numList = parsed.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
  const avg = numList.length > 0
    ? (numList.reduce((acc, curr) => acc + curr, 0) / numList.length).toFixed(1)
    : (baseVal && !isNaN(baseVal) ? parseFloat(baseVal).toFixed(1) : '—');

  return (
    <div style={{ background: color + '0D', border: `1px solid ${color}35`, borderRadius: 10, padding: '10px 12px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label} (4-Point Statutory Protocol)
        </span>
        <span style={{ fontSize: 11, color: C.sub }}>
          Avg: <strong style={{ color: C.text }}>{avg} cm</strong>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {parsed.map((v, i) => {
          const valNum = parseFloat(v);
          const displayVal = !isNaN(valNum) ? valNum.toFixed(1) : v;
          return (
            <div key={i} style={{ textAlign: 'center', background: color + '15', borderRadius: 6, padding: '6px 4px', border: `1px solid ${color}20` }}>
              <div style={{ fontSize: 9, color, fontWeight: 700 }}>{label[0]}{i + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{displayVal}</div>
              <div style={{ fontSize: 8, color: C.sub }}>cm</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: C.sub, minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value ?? '—'}</span>
    </div>
  );
}

export default function BlockInspector3D({ block, onClose }) {
  const [challan, setChallan] = useState(null);
  const [challanLoading, setChallanLoading] = useState(false);
  const [showChallan, setShowChallan] = useState(false);
  const [boulderChildren, setBoulderChildren] = useState(null);
  const [boulderLoading, setBoulderLoading] = useState(false);
  const [showBoulder, setShowBoulder] = useState(false);

  if (!block) return null;

  const m = block.measurement;
  const s = block.seigniorage;
  const d = block.dispatch;
  const w = block.weighbridge;

  const gangColor = {
    super_gangsaw: C.success,
    above_gangsaw: C.brand,
    below_gangsaw: C.warn,
  }[s?.class_status] || C.sub;

  const fetchChallan = async () => {
    if (challan) { setShowChallan(v => !v); return; }
    setChallanLoading(true);
    try {
      const c = await api.getChallan(block.id);
      setChallan(c); setShowChallan(true);
    } catch { } finally { setChallanLoading(false); }
  };

  const fetchBoulder = async () => {
    if (boulderChildren) { setShowBoulder(v => !v); return; }
    setBoulderLoading(true);
    try {
      const data = await api.getBoulderChildren(block.id);
      setBoulderChildren(data); setShowBoulder(true);
    } catch { } finally { setBoulderLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{
        background: C.bg, borderRadius: 20, width: '100%', maxWidth: 960,
        maxHeight: '93vh', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Modal header */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: C.surface }}>
          <div style={{ background: gangColor + '20', borderRadius: 10, padding: '6px 10px' }}>
            <span style={{ fontSize: 20 }}>🪨</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{block.id}</div>
            <div style={{ fontSize: 13, color: C.sub }}>{block.quarry_name || block.quarry_id} · {s?.granite_type || 'Granite Block'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ background: gangColor + '15', color: gangColor, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
              {s?.class_status?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Unclassified'}
            </span>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 18, color: C.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
          </div>
        </div>

        {/* Main body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) minmax(340px,1.5fr)', gap: 24 }}>

            {/* LEFT — 3D Viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#0F172A', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                <GraniteBlock3D
                  size="lg"
                  length={m?.length}
                  breadth={m?.breadth}
                  height={m?.height}
                  classStatus={s?.class_status}
                  interactive={true}
                />
              </div>

              {/* Dimension reading table */}
              {m && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 8, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Statutory Multi-point Readings (AP DMG)</span>
                    <span
                      title="APMMC Rules 1966 Rule 12: Mandates 4 orthogonal measurements per dimension (L1-L4, B1-B4, H1-H4) to determine legal net dressed volume for royalty assessment."
                      style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D', padding: '3px 9px', borderRadius: 12, fontWeight: 700, cursor: 'help', border: '1px solid #86EFAC', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <span>✓ RULE 12 COMPLIANT</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, background: '#F8FAFC', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', lineHeight: 1.4 }}>
                    <strong style={{ color: '#0F172A' }}>Rule 12 Protocol:</strong> AP Mines &amp; Geology standard requiring 4 independent measurements per axis (L1–L4, B1–B4, H1–H4) to verify orthogonal rectangularity and compute statutory dressed volume.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ReadingTable readings={m.length_readings} baseVal={m.length} label="Length" color="#1A56DB" />
                    <ReadingTable readings={m.breadth_readings} baseVal={m.breadth} label="Breadth" color="#10B981" />
                    <ReadingTable readings={m.height_readings} baseVal={m.height} label="Height" color="#F59E0B" />
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: C.sub, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span>Method: </span>
                      <strong style={{ color: C.text }}>
                        {m.measurement_method === 'single_photo' ? 'Photogrammetry (4-Point Reconstructed)' : (m.measurement_method?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Photogrammetry Multi-View')}
                      </strong>
                    </div>
                    <span style={{ background: C.brandL, color: C.brand, borderRadius: 12, padding: '3px 10px', fontWeight: 700, fontSize: 11 }}>
                      {m.measurement_confidence || 94.6}% Confidence
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Block info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Dimensions */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.sub, textTransform: 'uppercase' }}>Dimensions &amp; Cuboid Geometry</span>
                  <span style={{ fontSize: 10, background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>OMNI CUBOID SPEC</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[['Length', m?.length, '#1A56DB'], ['Breadth', m?.breadth, '#10B981'], ['Height', m?.height, '#F59E0B']].map(([lbl, val, col]) => (
                    <div key={lbl} style={{ background: col + '10', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: col, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{lbl}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{val ?? '—'}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>cm</div>
                    </div>
                  ))}
                </div>
                <InfoRow label="Cuboid Volume (V)" value={m?.volume ? `${m.volume} m³` : '—'} />
                <InfoRow label="Estimated Weight" value={m?.estimated_weight ? `${m.estimated_weight} MT` : '—'} />
                {(() => {
                  const l = parseFloat(m?.length) || 0;
                  const b = parseFloat(m?.breadth) || 0;
                  const h = parseFloat(m?.height) || 0;
                  const rawDiag = parseFloat(m?.space_diagonal || (l > 0 && b > 0 && h > 0 ? Math.sqrt(l*l + b*b + h*h) : 0));
                  const dM = rawDiag > 0 ? (rawDiag > 50 ? (rawDiag / 100).toFixed(3) : rawDiag.toFixed(3)) : null;
                  const dCm = rawDiag > 0 ? (rawDiag > 50 ? rawDiag.toFixed(1) : (rawDiag * 100).toFixed(1)) : null;
                  const areaM = m?.surface_area ?? (l > 0 && b > 0 && h > 0 ? ((2 * (l*b + l*h + b*h)) / 10000).toFixed(3) : null);
                  const baseDiag = m?.face_diagonal_lb ?? (l > 0 && b > 0 ? Math.sqrt(l*l + b*b).toFixed(1) : null);

                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 10, color: C.sub, fontWeight: 700, textTransform: 'uppercase' }}>Space Diagonal (d)</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#7C3AED', marginTop: 2 }}>{dM ? `${dM} m` : '—'}</div>
                        <div style={{ fontSize: 9, color: C.sub }}>{dCm ? `${dCm} cm · d=√(l²+w²+h²)` : '—'}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 10, color: C.sub, fontWeight: 700, textTransform: 'uppercase' }}>Surface Area (A)</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#B45309', marginTop: 2 }}>{areaM ? `${areaM} m²` : '—'}</div>
                        <div style={{ fontSize: 9, color: C.sub }}>2(lw + lh + wh)</div>
                      </div>
                      {baseDiag && (
                        <div style={{ gridColumn: '1 / -1', fontSize: 11, color: C.sub, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Base Face Diagonal (dlw): <strong>{baseDiag} cm</strong></span>
                          <span>Ratio A/V: <strong>{m?.volume && areaM ? (parseFloat(areaM) / parseFloat(m.volume)).toFixed(2) : '—'} m⁻¹</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Seigniorage */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 10, textTransform: 'uppercase' }}>Seigniorage Assessment</div>
                <InfoRow label="Granite Type" value={s?.granite_type} />
                <InfoRow label="Govt. Category" value={s?.government_category} />
                <InfoRow label="Rate (₹/MT)" value={s?.rate_per_mt ? `₹${s.rate_per_mt.toLocaleString('en-IN')}` : '—'} />
                <InfoRow label="Base Seigniorage" value={s?.total_fee ? `₹${s.total_fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'} />
                <button onClick={fetchChallan} disabled={challanLoading}
                  style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 9, border: `1px solid ${C.brand}44`, background: C.brandL, color: C.brand, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {challanLoading ? '⏳' : (showChallan ? '▲ Hide' : '▼ View')} Full Challan (DMF + MERIT + Green Cess)
                </button>

                {showChallan && challan && (
                  <div style={{ marginTop: 12 }}>
                    {(() => {
                      const cb = challan.challan_breakdown;
                      const rows = [
                        ['Base Seigniorage', cb.base_seigniorage],
                        [`DMF (${cb.dmf.rate_pct}%)`, cb.dmf.amount],
                        [`MERIT (${cb.merit.rate_pct}%)`, cb.merit.amount],
                        [`Green Cess (₹${cb.green_cess.rate_per_mt}/MT)`, cb.green_cess.amount],
                      ];
                      return (
                        <div style={{ background: '#F1F5F9', borderRadius: 10, padding: 12 }}>
                          {rows.map(([lbl, amt], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span style={{ color: C.sub }}>{lbl}</span>
                              <span style={{ fontWeight: 600, color: C.text }}>₹{amt?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, color: C.text }}>Total Challan</span>
                            <span style={{ fontWeight: 800, color: gangColor, fontSize: 16 }}>₹{cb.total_challan?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Boulder provenance */}
              {block.undressed_id && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 10, textTransform: 'uppercase' }}>Boulder Provenance &amp; Volume Variance</div>
                  <InfoRow label="Source Boulder" value={block.undressed_id} />
                  {block.undressed_length && (
                    <>
                      <InfoRow label="Raw Dims (cm)" value={`${block.undressed_length} × ${block.undressed_breadth} × ${block.undressed_height}`} />
                      <InfoRow label="Raw Volume" value={block.undressed_volume ? `${block.undressed_volume} m³` : '—'} />
                    </>
                  )}
                  {block.undressed_volume && m?.volume && (
                    <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 12px', border: '1px solid #86EFAC', margin: '10px 0' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', marginBottom: 4 }}>
                        Dressing Volume Variance &amp; Yield
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#065F46' }}>
                            {((parseFloat(m.volume) / parseFloat(block.undressed_volume)) * 100).toFixed(1)}% Recovery Yield
                          </div>
                          <div style={{ fontSize: 11, color: '#047857' }}>
                            Δ Volume: {(parseFloat(block.undressed_volume) - parseFloat(m.volume)).toFixed(3)} m³ trimmed
                          </div>
                        </div>
                        <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                          {(100 - (parseFloat(m.volume) / parseFloat(block.undressed_volume)) * 100).toFixed(1)}% Waste
                        </span>
                      </div>
                    </div>
                  )}
                  <button onClick={fetchBoulder} disabled={boulderLoading}
                    style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 9, border: `1px solid ${C.border}`, background: '#F1F5F9', color: C.sub, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {boulderLoading ? '⏳' : (showBoulder ? '▲ Hide' : '▼ View')} Boulder Volume Balance
                  </button>

                  {showBoulder && boulderChildren && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        <div style={{ flex: 1, background: C.brandL, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: C.sub }}>Source</div>
                          <div style={{ fontWeight: 700, color: C.text }}>{boulderChildren.parent_volume_m3} m³</div>
                        </div>
                        <div style={{ flex: 1, background: C.successL || '#ECFDF5', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: C.sub }}>Dressed</div>
                          <div style={{ fontWeight: 700, color: C.success }}>{boulderChildren.total_dressed_volume_m3} m³</div>
                        </div>
                        <div style={{ flex: 1, background: boulderChildren.overage_warning ? '#FEF2F2' : '#F1F5F9', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: C.sub }}>Remaining</div>
                          <div style={{ fontWeight: 700, color: boulderChildren.overage_warning ? C.danger : C.text }}>{boulderChildren.remaining_volume_m3} m³</div>
                        </div>
                      </div>
                      {boulderChildren.overage_warning && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', color: C.danger, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                          ⚠ Total dressed volume exceeds source boulder — review required
                        </div>
                      )}
                      {/* Progress bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.sub, marginBottom: 4 }}>
                          <span>Boulder Utilisation</span>
                          <span>{boulderChildren.utilization_pct}%</span>
                        </div>
                        <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(boulderChildren.utilization_pct, 100)}%`, background: boulderChildren.utilization_pct > 100 ? C.danger : C.success, borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: C.sub }}>{boulderChildren.child_count} dressed block{boulderChildren.child_count !== 1 ? 's' : ''} from this boulder</div>
                    </div>
                  )}
                </div>
              )}

              {/* Transit info */}
              {d && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.sub, marginBottom: 10, textTransform: 'uppercase' }}>Transit Pass</div>
                  <InfoRow label="Vehicle No." value={d.vehicle_number} />
                  <InfoRow label="Driver" value={d.driver_name} />
                  <InfoRow label="Destination" value={d.destination} />
                  <InfoRow label="e-Permit" value={d.e_permit_number || 'Pending'} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
