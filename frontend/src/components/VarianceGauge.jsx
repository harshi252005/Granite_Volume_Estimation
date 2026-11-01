import React from 'react';

/**
 * VarianceGauge — weighbridge tolerance zone dial
 * Props: variance (number, %) — 0 to 15+
 */
export default function VarianceGauge({ variance = 0 }) {
  // needle position: 0% variance = left (0%), 10% variance = right (100%)
  const clampedPct = Math.min(Math.max(variance / 10, 0), 1) * 100;

  const zone = variance <= 2 ? 'green' : variance <= 5 ? 'orange' : 'red';
  const zoneLabel = variance <= 2 ? '✅ Within Tolerance' : variance <= 5 ? '⚠️ Borderline' : '🚨 Flagged — Mismatch';
  const zoneColor = zone === 'green' ? '#10B981' : zone === 'orange' ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1729' }}>Weight Variance</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: zoneColor }}>{variance.toFixed(1)}%</span>
      </div>

      {/* Gauge track */}
      <div style={{
        width: '100%', height: 22, borderRadius: 11,
        background: 'linear-gradient(90deg, #10B981 0%, #10B981 33%, #F59E0B 33%, #F59E0B 66%, #EF4444 66%)',
        position: 'relative',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
      }}>
        {/* Needle */}
        <div style={{
          position: 'absolute',
          top: -5, left: `${clampedPct}%`,
          width: 4, height: 32,
          background: '#0F172A',
          borderRadius: 2,
          transform: 'translateX(-50%)',
          transition: 'left 0.8s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }} />

        {/* Zone labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: 26, position: 'absolute', width: '100%', top: 0 }}>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {[{ l: '0%', v: 'Safe' }, { l: '5%', v: 'Limit' }, { l: '10%+', v: 'Flag' }].map(({ l, v }) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>{l}</div>
            <div style={{ fontSize: 9, color: '#94A3B8' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Status label */}
      <div style={{
        marginTop: 10, padding: '6px 12px', borderRadius: 8,
        background: zone === 'green' ? '#ECFDF5' : zone === 'orange' ? '#FFFBEB' : '#FEF2F2',
        color: zoneColor, fontSize: 12, fontWeight: 700, textAlign: 'center',
      }}>
        {zoneLabel}
      </div>
    </div>
  );
}
