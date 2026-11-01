import React, { useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, CheckCircle2, Truck, Scale,
  FileWarning, Eye, Gavel, RefreshCw, MapPin, Search,
  Clock, ArrowRight, ShieldCheck, Check, X
} from 'lucide-react';

const DISTRICT_CHECKPOSTS = [
  { id: 'CP-PKM-01', name: 'Chimakurthy Mining Junction', route: 'SH-53 Mining Corridor', status: 'Active', checks: 42, flags: 1, officer: 'Insp. P. Ramesh' },
  { id: 'CP-PKM-02', name: 'Ballikurava Checkpost', route: 'NH-16 Bypass South', status: 'Active', checks: 28, flags: 0, officer: 'Insp. T. Murali' },
  { id: 'CP-PKM-03', name: 'Ongole Central Weighbridge Hub', route: 'NH-16 & Port Feeder', status: 'Active', checks: 54, flags: 2, officer: 'Insp. K. V. Rao' },
  { id: 'CP-PKM-04', name: 'Martur District Border Post', route: 'Guntur-Prakasam Border', status: 'Active', checks: 19, flags: 1, officer: 'Insp. N. Prasad' },
  { id: 'CP-PKM-05', name: 'Kandukur Toll Road Post', route: 'Nellore Border Corridor', status: 'Active', checks: 31, flags: 0, officer: 'Insp. G. Reddy' },
];

const FLAGGED_DISPATCHES = [
  {
    id: 'BLK-Q0186-0004',
    quarry: 'Chimakurthy Galaxy Quarry A-1',
    vehicle: 'AP 27 TX 4590',
    driver: 'M. Krishna',
    estWeight: 14.8,
    actualWeight: 16.2,
    variance: 9.46,
    reason: 'Weight exceeds AI photogrammetry calculation by +1.4 Tons (>5% tolerance)',
    time: '2 hours ago',
    checkpoint: 'Ongole Central Weighbridge',
    status: 'Pending DMGO Action',
  },
  {
    id: 'BLK-Q0104-0012',
    quarry: 'Ballikurava Black Pearl Quarry',
    vehicle: 'AP 39 Y 8821',
    driver: 'S. Narayana',
    estWeight: 18.2,
    actualWeight: 19.8,
    variance: 8.79,
    reason: 'Excess raw mineral boulder weight detected at checkpost scale',
    time: '4 hours ago',
    checkpoint: 'Martur District Border Post',
    status: 'Pending DMGO Action',
  },
  {
    id: 'BLK-Q0112-0008',
    quarry: 'Martur Black Galaxy Mines',
    vehicle: 'AP 16 Z 3314',
    driver: 'V. Srinivasan',
    estWeight: 12.4,
    actualWeight: 11.2,
    variance: -9.68,
    reason: 'Suspect under-reporting or block substitution on transit route',
    time: 'Yesterday',
    checkpoint: 'Chimakurthy Mining Junction',
    status: 'Under Investigation',
  },
];

const SEIZURE_NOTICES = [
  {
    formGId: 'FORM-G-2025-018',
    blockId: 'BLK-Q0186-0009',
    vehicleNumber: 'AP 27 BB 9090',
    owner: 'Unregistered Carrier',
    date: '2025-09-07',
    reason: 'Transit without valid e-Transit Pass under Sec 21 MMDR Act',
    officer: 'Road Vigilance Flying Squad 4',
    impoundedAt: 'Ongole Police Station Mining Yard',
    compoundingAmount: 150000,
    status: 'Awaiting Compounding',
  },
  {
    formGId: 'FORM-G-2025-019',
    blockId: 'BLK-Q0115-0003',
    vehicleNumber: 'AP 39 U 1212',
    owner: 'Deccan Logistics',
    date: '2025-09-08',
    reason: 'Route deviation — vehicle found 45km outside approved transit corridor',
    officer: 'Road Vigilance Flying Squad 2',
    impoundedAt: 'Chimakurthy Checkpost Yard',
    compoundingAmount: 80000,
    status: 'Awaiting Compounding',
  },
];

export default function DMGOVigilance({ user }) {
  const [flags, setFlags] = useState(FLAGGED_DISPATCHES);
  const [seizures, setSeizures] = useState(SEIZURE_NOTICES);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [actionModalFlag, setActionModalFlag] = useState(null);
  const [selectedSeizure, setSelectedSeizure] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionType, setActionType] = useState('compound');

  const district = user?.district || 'Prakasam';

  const totalChecks = DISTRICT_CHECKPOSTS.reduce((acc, c) => acc + c.checks, 0);

  const handleResolveFlag = (e) => {
    e.preventDefault();
    if (!actionModalFlag) return;
    setFlags(flags.filter(f => f.id !== actionModalFlag.id));
    setActionModalFlag(null);
    setActionRemarks('');
  };

  const handleResolveSeizure = (seizureId) => {
    setSeizures(seizures.map(s => s.formGId === seizureId ? { ...s, status: 'Compounded & Released' } : s));
    setSelectedSeizure(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slideInUp 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Checkpost &amp; Road Vigilance Command</h1>
            <span className="badge badge-rose" style={{ fontSize: '0.72rem' }}>Sec. 21 MMDR Enforcement</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Real-time checkpost monitoring, weighbridge tolerance escrow, and Form G seizure disposal for {district}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #1A56DB' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Checkposts Active</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A56DB', marginTop: 4 }}>5 Posts</div>
          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: 2 }}>{totalChecks} vehicles inspected today</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Weighbridge Mismatches</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D97706', marginTop: 4 }}>{flags.length} Flagged</div>
          <div style={{ fontSize: '0.7rem', color: '#D97706', marginTop: 2 }}>&gt;±5% tolerance requiring DMGO order</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Form G Seizures</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#DC2626', marginTop: 4 }}>{seizures.filter(s => s.status === 'Awaiting Compounding').length} Pending</div>
          <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 2 }}>Impounded vehicles in custody</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Compliance Rate</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', marginTop: 4 }}>98.4%</div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>Transit pass verification rate</div>
        </div>
      </div>

      {/* Checkpost Network Grid */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={18} color="#1A56DB" />
              District Mining Checkpost Network
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>Live status and inspection counts across key transit corridors</p>
          </div>
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>5/5 Online</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {DISTRICT_CHECKPOSTS.map(cp => (
            <div
              key={cp.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F1729' }}>{cp.name}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{cp.route}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.75rem', paddingTop: 6, borderTop: '1px dashed #CBD5E1' }}>
                <span style={{ fontWeight: 700, color: '#1A56DB' }}>{cp.checks} Inspected</span>
                <span style={{ color: cp.flags > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>
                  {cp.flags > 0 ? `⚠ ${cp.flags} Flagged` : '✓ All Clear'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weighbridge Mismatch Escrow Queue */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Scale size={18} color="#D97706" />
              Weighbridge Tolerance Escrow Queue
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>
              Transits with weight variance exceeding ±5% tolerance requiring statutory DMGO adjudication
            </p>
          </div>
          <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>{flags.length} Pending Orders</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Block ID</th>
                <th>Quarry of Origin</th>
                <th>Vehicle &amp; Driver</th>
                <th>AI Estimated</th>
                <th>Scale Actual</th>
                <th>Variance %</th>
                <th>Flag Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {flags.map(f => (
                <tr key={f.id}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB', fontSize: '0.8rem' }}>
                    {f.id}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{f.quarry}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}>{f.vehicle}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Driver: {f.driver}</div>
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{f.estWeight} T</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#DC2626' }}>{f.actualWeight} T</td>
                  <td>
                    <span className="badge badge-rose" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>
                      {f.variance > 0 ? `+${f.variance}%` : `${f.variance}%`}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: '#475569', maxWidth: 220 }}>
                    {f.reason}
                  </td>
                  <td>
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={() => setActionModalFlag(f)}
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      Adjudicate
                    </button>
                  </td>
                </tr>
              ))}
              {flags.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#059669' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700 }}>No weighbridge variance flags pending!</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>All current dispatches comply within ±5% tolerance.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form G Seizure Notices Table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gavel size={18} color="#DC2626" />
              Statutory Seizure Disposal — Form G Log
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>
              Vehicles impounded by vigilance squads under Section 21 MMDR Act awaiting DMGO compounding
            </p>
          </div>
          <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>Enforcement Custody</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Form G Notice ID</th>
                <th>Block ID</th>
                <th>Impounded Vehicle</th>
                <th>Seizure Date</th>
                <th>Violation Detail</th>
                <th>Impound Yard</th>
                <th>Compounding Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {seizures.map(s => (
                <tr key={s.formGId}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#DC2626', fontSize: '0.8rem' }}>
                    {s.formGId}
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.78rem' }}>
                    {s.blockId}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.vehicleNumber}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{s.owner}</div>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{s.date}</td>
                  <td style={{ fontSize: '0.75rem', color: '#334155', maxWidth: 240 }}>{s.reason}</td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.impoundedAt}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#DC2626' }}>
                    ₹{s.compoundingAmount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`badge ${s.status.includes('Compounded') ? 'badge-green' : 'badge-rose'}`} style={{ fontSize: '0.7rem' }}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.status === 'Awaiting Compounding' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedSeizure(s)}
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        Order Disposal
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>✓ Released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUDICATION MODAL */}
      {actionModalFlag && (
        <div className="modal-overlay" onClick={() => setActionModalFlag(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">
                ⚖️ Adjudicate Variance — {actionModalFlag.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActionModalFlag(null)}>✕</button>
            </div>

            <form onSubmit={handleResolveFlag}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 8, border: '1px solid #FDE68A', fontSize: '0.78rem', color: '#92400E' }}>
                  <strong>Variance Detected:</strong> {actionModalFlag.variance > 0 ? `+${actionModalFlag.variance}%` : `${actionModalFlag.variance}%`} ({actionModalFlag.estWeight}T AI vs {actionModalFlag.actualWeight}T Scale)
                </div>

                <div className="form-group">
                  <label className="form-label">DMGO Decision</label>
                  <select
                    className="form-control"
                    value={actionType}
                    onChange={e => setActionType(e.target.value)}
                  >
                    <option value="clear">Clear Variance (Acceptable Quarry Moisture Content / Rough Edge)</option>
                    <option value="reweigh">Order Secondary Re-weigh at Independent Scale</option>
                    <option value="compound">Assess Compounding Penalty for Overload &amp; Release</option>
                    <option value="impound">Issue Form G Seizure Order for Suspect Over-extraction</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Official Order Notes &amp; Statutory Justification</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter statutory grounds for clearing or compounding..."
                    value={actionRemarks}
                    onChange={e => setActionRemarks(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setActionModalFlag(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Sign &amp; Execute Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEIZURE DISPOSAL MODAL */}
      {selectedSeizure && (
        <div className="modal-overlay" onClick={() => setSelectedSeizure(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">
                🛑 Form G Disposal — {selectedSeizure.formGId}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedSeizure(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="alert alert-rose" style={{ fontSize: '0.75rem' }}>
                Vehicle {selectedSeizure.vehicleNumber} impounded under Sec 21 MMDR Act for unlawful transit.
              </div>

              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><strong>Impounded Truck:</strong> {selectedSeizure.vehicleNumber}</div>
                <div><strong>Carrier:</strong> {selectedSeizure.owner}</div>
                <div><strong>Compounding Fee to Remit:</strong> <span style={{ color: '#DC2626', fontWeight: 900 }}>₹{selectedSeizure.compoundingAmount.toLocaleString('en-IN')}</span></div>
                <div><strong>Depot Yard:</strong> {selectedSeizure.impoundedAt}</div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                Upon receipt of Government Treasury Challan for the compounding fee, the vehicle and granite block may be released from custody.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedSeizure(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleResolveSeizure(selectedSeizure.formGId)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Check size={16} /> Confirm Penalty Payment &amp; Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
