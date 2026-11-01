import React, { useState, useCallback } from 'react';
import {
  Calculator, IndianRupee, Info, CheckCircle, AlertTriangle,
  RotateCcw, Download, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';

// ── AP Minor Minerals Seigniorage Tariff Rates (2024-25) ─────────────────────
// Source: G.O.Ms.No.63, AP Mines & Geology, 2023
const TARIFF = {
  // Granite blocks (dressed)
  'gangsaw_above':       { label: 'Gangsaw Grade — Above 270×150 cm',  rate: 4500,  unit: 'per m³', category: 'Dressed Granite' },
  'gangsaw_below':       { label: 'Gangsaw Grade — Below 270×150 cm',  rate: 3200,  unit: 'per m³', category: 'Dressed Granite' },
  'slab_regular':        { label: 'Slab (Regular) 180×60 cm+',         rate: 2800,  unit: 'per m³', category: 'Dressed Granite' },
  'slab_irregular':      { label: 'Slab (Irregular / Flagstone)',       rate: 1800,  unit: 'per m³', category: 'Dressed Granite' },
  'cobbles':             { label: 'Cobbles / Pavement Stone',           rate: 900,   unit: 'per m³', category: 'Dressed Granite' },
  'chips':               { label: 'Chips / Crushed Aggregate',         rate: 400,   unit: 'per MT', category: 'Crushed Material' },
  // Undressed / rough blocks
  'rough_block_a':       { label: 'Rough Block Grade A (>2 m³)',        rate: 2000,  unit: 'per m³', category: 'Undressed Granite' },
  'rough_block_b':       { label: 'Rough Block Grade B (0.5–2 m³)',     rate: 1400,  unit: 'per m³', category: 'Undressed Granite' },
  'rough_block_c':       { label: 'Rough Block Grade C (<0.5 m³)',      rate: 800,   unit: 'per m³', category: 'Undressed Granite' },
  // Special varieties
  'black_galaxy':        { label: 'Black Galaxy / Premium Black',       rate: 7500,  unit: 'per m³', category: 'Premium Granite' },
  'blue_pearl':          { label: 'Blue Pearl / Cosmic Black',          rate: 6500,  unit: 'per m³', category: 'Premium Granite' },
  'multicolour_red':     { label: 'Multi-Colour Red / Juparana',        rate: 5500,  unit: 'per m³', category: 'Premium Granite' },
  'tan_brown':           { label: 'Tan Brown / Coffee Brown',           rate: 5000,  unit: 'per m³', category: 'Premium Granite' },
};

// Cess & levies on top of base seigniorage
const LEVIES = {
  DMF:  { label: 'District Mineral Foundation (DMF)',      rate: 0.30, desc: '30% of base seigniorage' },
  NMET: { label: 'National Mineral Exploration Trust (NMET)', rate: 0.02, desc: '2% of base seigniorage' },
  GST:  { label: 'GST on Royalty',                         rate: 0.18, desc: '18% of total royalty' },
};

function formatINR(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const CATEGORIES = [...new Set(Object.values(TARIFF).map(t => t.category))];

export default function SeigniorageCalculator() {
  const [gradeKey, setGradeKey]   = useState('gangsaw_above');
  const [length,   setLength]     = useState('');
  const [breadth,  setBreadth]    = useState('');
  const [height,   setHeight]     = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [weight,   setWeight]     = useState('');   // MT, for chips
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showInfo, setShowInfo]   = useState(false);
  const [history, setHistory]     = useState([]);

  const grade  = TARIFF[gradeKey];
  const isPerMT = grade?.unit === 'per MT';

  // Volume in m³
  const vol = (!isPerMT && length && breadth && height)
    ? (parseFloat(length) / 100) * (parseFloat(breadth) / 100) * (parseFloat(height) / 100)
    : 0;

  const mt   = (isPerMT && weight) ? parseFloat(weight) : 0;
  const base = grade ? (isPerMT ? grade.rate * mt : grade.rate * vol) * quantity : 0;
  const dmf  = base * LEVIES.DMF.rate;
  const nmet = base * LEVIES.NMET.rate;
  const gst  = base * LEVIES.GST.rate;
  const total = base + dmf + nmet + gst;

  const hasInput = base > 0;

  const reset = () => {
    setLength(''); setBreadth(''); setHeight(''); setQuantity(1); setWeight('');
  };

  const addToHistory = () => {
    if (!hasInput) return;
    setHistory(prev => [{
      id: Date.now(),
      grade: grade.label,
      vol: vol.toFixed(3),
      quantity,
      base,
      total,
      ts: new Date().toLocaleTimeString(),
    }, ...prev.slice(0, 4)]);
  };

  const gangwayCheck = length && breadth
    ? parseFloat(length) >= 270 && parseFloat(breadth) >= 150
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Royalty & Seigniorage Calculator</h1>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>AP Mines 2024-25 Tariff</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Compute exact seigniorage, DMF, NMET & GST payable as per AP Minor Minerals Rules 1966
          </p>
        </div>
        <button
          onClick={() => setShowInfo(s => !s)}
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 14px', color: '#1A56DB', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Info size={15} />
          {showInfo ? 'Hide' : 'View'} Tariff Chart
        </button>
      </div>

      {/* Tariff Info Panel */}
      {showInfo && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', padding: '12px 20px', color: '#fff', fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IndianRupee size={16} /> AP Minor Minerals Seigniorage Tariff — 2024-25
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Category', 'Grade / Type', 'Rate', 'Unit'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: '#475569', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => {
                  const items = Object.entries(TARIFF).filter(([, v]) => v.category === cat);
                  return items.map(([key, val], i) => (
                    <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => { setGradeKey(key); setShowInfo(false); }}
                      onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                    >
                      {i === 0 && (
                        <td rowSpan={items.length} style={{ padding: '10px 14px', fontWeight: 800, color: '#1A56DB', verticalAlign: 'middle', borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', background: '#F0F9FF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 130 }}>
                          {cat}
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', color: '#0F1729', borderBottom: '1px solid #F1F5F9' }}>{val.label}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#10B981', borderBottom: '1px solid #F1F5F9', fontFamily: 'monospace' }}>₹{val.rate.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>{val.unit}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', background: '#FFFBEB', borderTop: '1px solid #FDE68A', fontSize: '0.72rem', color: '#78350F', fontWeight: 600 }}>
            ⚠️ Click any row to auto-select that grade. DMF 30% + NMET 2% + GST 18% added automatically on calculation.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Input Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Grade Selector */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              1. Select Granite Grade / Mineral Type
            </div>
            {CATEGORIES.map(cat => {
              const items = Object.entries(TARIFF).filter(([, v]) => v.category === cat);
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{cat}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                    {items.map(([key, val]) => {
                      const isSelected = gradeKey === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setGradeKey(key)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: `2px solid ${isSelected ? '#1A56DB' : '#E2E8F0'}`,
                            background: isSelected ? '#EFF6FF' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#93C5FD'; e.currentTarget.style.background = '#F8FBFF'; } }}
                          onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff'; } }}
                        >
                          <div style={{ fontSize: '0.77rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#1A56DB' : '#0F1729', lineHeight: 1.3 }}>{val.label}</div>
                          <div style={{ fontSize: '0.68rem', color: isSelected ? '#2563EB' : '#10B981', fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>
                            ₹{val.rate.toLocaleString('en-IN')} {val.unit}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dimensions */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              2. Enter {isPerMT ? 'Weight' : 'Block Dimensions'}
            </div>

            {!isPerMT ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                  {[
                    { label: 'Length (cm)', val: length, set: setLength, placeholder: 'e.g. 270' },
                    { label: 'Breadth (cm)', val: breadth, set: setBreadth, placeholder: 'e.g. 150' },
                    { label: 'Height (cm)', val: height, set: setHeight, placeholder: 'e.g. 90' },
                  ].map(({ label, val, set, placeholder }) => (
                    <div key={label} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{label}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={placeholder}
                        value={val}
                        onChange={e => set(e.target.value)}
                        min="0"
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>

                {/* Gangsaw classification hint */}
                {length && breadth && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: gangwayCheck ? '#ECFDF5' : '#FFFBEB',
                    border: `1px solid ${gangwayCheck ? '#6EE7B7' : '#FDE68A'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: gangwayCheck ? '#065F46' : '#78350F',
                    marginBottom: 12,
                  }}>
                    {gangwayCheck ? <CheckCircle size={14} color="#10B981" /> : <AlertTriangle size={14} color="#F59E0B" />}
                    {gangwayCheck
                      ? 'Qualifies as Gangsaw Grade (≥ 270×150 cm) — premium seigniorage applies'
                      : 'Below Gangsaw threshold (270×150 cm) — standard slab rate applies'
                    }
                  </div>
                )}

                {vol > 0 && (
                  <div style={{ padding: '10px 14px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: '#64748B' }}>Computed Volume:</span>
                    <span style={{ fontWeight: 900, color: '#0284C7', fontSize: '1.05rem', fontFamily: 'monospace' }}>{vol.toFixed(4)} m³</span>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>({(vol * 2.65).toFixed(2)} MT approx.)</span>
                  </div>
                )}
              </>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Weight (Metric Tonnes)</label>
                <input type="number" className="form-control" placeholder="e.g. 12.5" value={weight} onChange={e => setWeight(e.target.value)} min="0" step="0.1" />
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <label className="form-label">Number of Blocks / Lots</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', color: '#475569' }}>-</button>
                <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#0F1729' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', color: '#475569' }}>+</button>
              </div>
            </div>
          </div>

          {/* Calculation History */}
          {history.length > 0 && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Recent Calculations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F1729' }}>{h.grade.split('—')[0].trim()}</div>
                      <div style={{ color: '#64748B' }}>{h.vol} m³ × {h.quantity} blocks · {h.ts}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>{formatINR(h.total)}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>incl. levies</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Result Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>

          {/* Summary Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: hasInput ? '2px solid #1A56DB' : '2px solid #E2E8F0', transition: 'border-color 0.3s ease' }}>
            <div style={{
              background: hasInput ? 'linear-gradient(135deg, #1E3A8A, #2563EB)' : 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
              padding: '16px 20px',
              color: hasInput ? '#fff' : '#94A3B8',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.8 }}>
                Total Payable (Incl. All Levies)
              </div>
              <div style={{ fontSize: hasInput ? '2.2rem' : '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
                {hasInput ? formatINR(total) : '—'}
              </div>
              {hasInput && (
                <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 4 }}>
                  {quantity} block{quantity > 1 ? 's' : ''} · {vol > 0 ? `${(vol * quantity).toFixed(3)} m³ total` : `${mt} MT total`}
                </div>
              )}
            </div>

            {/* Breakdown Toggle */}
            <button
              onClick={() => setShowBreakdown(s => !s)}
              style={{ width: '100%', padding: '10px 16px', border: 'none', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}
            >
              <span>Fee Breakdown</span>
              {showBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showBreakdown && (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Base Seigniorage (Royalty)', amount: base, color: '#1A56DB', bold: true },
                  { label: `DMF — ${LEVIES.DMF.desc}`, amount: dmf, color: '#7C3AED' },
                  { label: `NMET — ${LEVIES.NMET.desc}`, amount: nmet, color: '#0EA5E9' },
                  { label: `GST — ${LEVIES.GST.desc}`, amount: gst, color: '#E67E22' },
                ].map(({ label, amount, color, bold }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: bold ? 700 : 500 }}>{label}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color, fontFamily: 'monospace' }}>{hasInput ? formatINR(amount) : '—'}</span>
                  </div>
                ))}

                {hasInput && (
                  <div style={{ borderTop: '2px solid #1A56DB', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.88rem' }}>Grand Total</span>
                    <span style={{ fontWeight: 900, color: '#1A56DB', fontFamily: 'monospace', fontSize: '1.05rem' }}>{formatINR(total)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Per-block summary */}
          {hasInput && quantity > 1 && (
            <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>Per-Block Breakdown</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Per block royalty</span>
                <span style={{ fontWeight: 800, color: '#0F1729', fontFamily: 'monospace' }}>{formatINR(base / quantity)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 4 }}>
                <span style={{ color: '#64748B' }}>Per block total (all levies)</span>
                <span style={{ fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>{formatINR(total / quantity)}</span>
              </div>
            </div>
          )}

          {/* Rate info */}
          <div style={{ padding: '12px 16px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase', marginBottom: 8 }}>Current Rate Applied</div>
            <div style={{ fontWeight: 700, color: '#0F1729', fontSize: '0.85rem', marginBottom: 4 }}>{grade?.label}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#1A56DB', fontSize: '0.95rem' }}>₹{grade?.rate.toLocaleString('en-IN')}</span>
              <span style={{ color: '#64748B', fontSize: '0.78rem', alignSelf: 'center' }}>{grade?.unit}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={addToHistory}
              disabled={!hasInput}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: hasInput ? 'linear-gradient(135deg, #1A56DB, #2563EB)' : '#E2E8F0',
                color: hasInput ? '#fff' : '#94A3B8',
                fontWeight: 800, fontSize: '0.85rem', cursor: hasInput ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: hasInput ? '0 4px 12px rgba(26,86,219,0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={15} /> Save Calculation
            </button>
            <button
              onClick={reset}
              style={{
                padding: '11px 14px', borderRadius: 10, border: '1.5px solid #CBD5E1',
                background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Legal notice */}
          <div style={{ padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', fontSize: '0.7rem', color: '#78350F', lineHeight: 1.5 }}>
            ⚠️ <strong>Indicative only.</strong> Actual seigniorage is determined by the DMGO after physical check measurement. Figures are based on <em>G.O.Ms.No.63, AP Mines &amp; Geology, 2023.</em>
          </div>
        </div>
      </div>
    </div>
  );
}
