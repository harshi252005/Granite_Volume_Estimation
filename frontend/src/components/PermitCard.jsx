import React from 'react';

/**
 * PermitCard — statutory AP Mines & Geology transit pass card
 * Props: block (block data object), style
 */
export default function PermitCard({ block, style = {} }) {
  if (!block) return null;

  const issued = block.dispatch?.dispatch_time
    ? new Date(block.dispatch.dispatch_time).toLocaleString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');
  const validUntil = block.dispatch?.valid_until
    ? new Date(block.dispatch.valid_until).toLocaleString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const vehicle = block.dispatch?.vehicle_number || 'AP 01 XX 0000';
  const driverName = block.dispatch?.driver_name || 'Authorized Driver';
  const destination = block.dispatch?.destination || 'Factory / Processor';
  const seigniorage = block.seigniorage?.total_fee || 0;
  const permitNo = block.dispatch?.e_permit_number || block.dispatch?.transit_form_no || `APMG-${block.id?.replace('BLK-', '')}-${new Date().getFullYear()}`;
  const quarryName = block.quarry_name || block.quarry?.name || 'Chimakurthy';
  const quarryDistrict = block.quarry_district || block.quarry?.district || 'Prakasam';
  const gangsawLabel = block.seigniorage?.class_status
    ? (block.seigniorage.class_status === 'below_gangsaw' ? 'Below Gangsaw' : block.seigniorage.class_status === 'super_gangsaw' ? 'Super Gangsaw' : 'Above Gangsaw')
    : (block.measurement?.gangsaw_class || 'Gangsaw');

  return (
    <div style={{
      background: '#fff',
      border: '2.5px solid #1A56DB',
      borderRadius: 16,
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      boxShadow: '0 4px 24px rgba(26,86,219,0.15)',
      ...style,
    }}>
      {/* Watermark */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%) rotate(-30deg)',
        fontSize: 60, fontWeight: 900, color: '#1A56DB',
        opacity: 0.04, pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>AP MINES & GEOLOGY</div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        paddingBottom: 14, borderBottom: '1.5px dashed #BFDBFE', marginBottom: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>🏔️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1A56DB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Government of Andhra Pradesh
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            Dept. of Mines & Geology — Transit e-Permit
          </div>
          <div style={{ fontSize: 10, color: '#64748B' }}>
            Under AP Minor Mineral Concession Rules 1966 · Sec. 21 MMDR Act 1957
          </div>
        </div>
        <div style={{
          background: '#ECFDF5', color: '#10B981',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
        }}>✓ VALID</div>
      </div>

      {/* Permit details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 14 }}>
        {[
          { label: 'Block ID', value: block.id, mono: true },
          { label: 'Permit No.', value: permitNo, mono: true },
          { label: 'Quarry / Leasehold', value: quarryName },
          { label: 'District', value: quarryDistrict },
          { label: 'Classification', value: gangsawLabel },
          { label: 'Volume', value: `${(block.measurement?.volume || 0).toFixed(2)} m³` },
          { label: 'AI Est. Weight', value: `${(block.measurement?.estimated_weight || 0).toFixed(2)} MT` },
          { label: 'Seigniorage', value: `₹ ${seigniorage.toLocaleString('en-IN')}` },
          { label: 'Vehicle No.', value: vehicle, mono: true },
          { label: 'Driver Name', value: driverName },
          { label: 'Destination', value: destination },
          { label: 'Valid Until', value: validUntil },
        ].map(({ label, value, mono }) => (
          <div key={label}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>{label}</div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#0F172A',
              fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
            }}>{value || '—'}</div>
          </div>
        ))}
      </div>

      {/* QR + footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1.5px dashed #BFDBFE',
      }}>
        {/* Fake QR grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            [1,0,1,1,0,1,0],[0,1,0,1,1,0,1],[1,1,1,0,1,1,0],
            [0,1,0,0,0,1,1],[1,0,1,1,1,0,1],[0,1,1,0,0,1,0],[1,0,0,1,1,1,1],
          ].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 2 }}>
              {row.map((cell, ci) => (
                <div key={ci} style={{
                  width: 5, height: 5, borderRadius: 1,
                  background: cell ? '#0F172A' : 'transparent',
                }} />
              ))}
            </div>
          ))}
          <div style={{ fontSize: 8, color: '#94A3B8', textAlign: 'center', marginTop: 2 }}>Scan QR</div>
        </div>

        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#64748B' }}>
          <div style={{ fontWeight: 600 }}>This e-Permit is digitally generated</div>
          <div>via Smart Granite Tracking System</div>
          <div style={{ marginTop: 4, color: '#1A56DB', fontWeight: 700, fontSize: 12 }}>
            Permit No: {permitNo}
          </div>
        </div>

        <div style={{
          background: '#1A56DB', color: '#fff', borderRadius: 8,
          padding: '8px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', opacity: 0.8 }}>DMGO</div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', opacity: 0.8 }}>APPROVED</div>
          <div style={{ fontSize: 10, fontWeight: 800, marginTop: 4 }}>✓ SEALED</div>
        </div>
      </div>
    </div>
  );
}
