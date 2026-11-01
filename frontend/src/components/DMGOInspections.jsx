import React, { useState, useMemo } from 'react';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import {
  ClipboardCheck, Search, Plus, Calendar, MapPin, CheckCircle2,
  AlertTriangle, XCircle, ShieldAlert, FileText, UserCheck, Eye,
  Building, Compass, ArrowRight, RefreshCw, Check
} from 'lucide-react';

const INITIAL_INSPECTIONS = [
  {
    id: 'INS-2025-091',
    quarryName: 'Chimakurthy Galaxy Quarry A-1',
    quarryId: 101,
    officer: 'S. K. Ramanathan (Asst. DMGO)',
    date: '2025-09-06',
    type: 'High AI Variance Verification',
    priority: 'High',
    status: 'Completed',
    finding: 'Minor 1.8% deviation in breadth; within statutory 5% tolerance. Cleared.',
    gps: '15.5864° N, 79.8642° E',
    fine: 0,
  },
  {
    id: 'INS-2025-092',
    quarryName: 'Ballikurava Black Pearl Quarry',
    quarryId: 104,
    officer: 'M. V. Naidu (Field Geologist)',
    date: '2025-09-07',
    type: 'Boundary Pillar & Depth Audit',
    priority: 'Routine',
    status: 'Completed',
    finding: 'Pillars intact. Lease boundary compliant with AP Mining Plan.',
    gps: '16.0215° N, 79.9140° E',
    fine: 0,
  },
  {
    id: 'INS-2025-093',
    quarryName: 'Prakasam Premium Granite Unit 3',
    quarryId: 108,
    officer: 'K. Srinivasa Rao (DMGO)',
    date: '2025-09-08',
    type: 'Suspect Overload / ArUco Scale Check',
    priority: 'Emergency',
    status: 'Violation Found',
    finding: 'ArUco marker displaced; manual remeasurement showed +8.4% excess volume. Compounding notice issued.',
    gps: '15.6200° N, 79.7900° E',
    fine: 250000,
  },
  {
    id: 'INS-2025-094',
    quarryName: 'Martur Black Galaxy Mines',
    quarryId: 112,
    officer: 'S. K. Ramanathan (Asst. DMGO)',
    date: '2025-09-10',
    type: 'Routine Annual Lease Review',
    priority: 'Routine',
    status: 'Scheduled',
    finding: 'Awaiting field visit on scheduled date.',
    gps: '15.9870° N, 80.1240° E',
    fine: 0,
  },
  {
    id: 'INS-2025-095',
    quarryName: 'Santhanuthalapadu Stone Works',
    quarryId: 115,
    officer: 'M. V. Naidu (Field Geologist)',
    date: '2025-09-11',
    type: 'Weighbridge Discrepancy Spot Audit',
    priority: 'High',
    status: 'Scheduled',
    finding: 'Awaiting field visit on scheduled date.',
    gps: '15.5400° N, 79.9900° E',
    fine: 0,
  },
];

export default function DMGOInspections({ quarries = [], user }) {
  const [inspections, setInspections] = useState(INITIAL_INSPECTIONS);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [form, setForm] = useState({
    quarryId: '',
    type: 'Routine Compliance Audit',
    priority: 'Routine',
    officer: user?.full_name || 'K. Srinivasa Rao (DMGO)',
    date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    checklist: ['ArUco Scale Placement', 'Block ID Paint Stamping', 'Boundary Pillar Verification'],
  });

  const district = user?.district || 'Prakasam';

  const filteredInspections = useMemo(() => {
    return inspections.filter(ins => {
      if (filter === 'completed' && ins.status !== 'Completed') return false;
      if (filter === 'scheduled' && ins.status !== 'Scheduled') return false;
      if (filter === 'violation' && ins.status !== 'Violation Found') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          ins.id.toLowerCase().includes(q) ||
          ins.quarryName.toLowerCase().includes(q) ||
          ins.officer.toLowerCase().includes(q) ||
          ins.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inspections, filter, search]);

  const pagination = usePagination(filteredInspections, 10);

  const completedCount = inspections.filter(i => i.status === 'Completed').length;
  const scheduledCount = inspections.filter(i => i.status === 'Scheduled').length;
  const violationCount = inspections.filter(i => i.status === 'Violation Found').length;
  const totalFines = inspections.reduce((acc, i) => acc + (i.fine || 0), 0);

  const handleCreateInspection = (e) => {
    e.preventDefault();
    const selectedQ = quarries.find(q => String(q.id) === String(form.quarryId)) || {
      name: `District Quarry #${form.quarryId || 101}`,
      lat: 15.5864,
      lng: 79.8642,
    };

    const newIns = {
      id: `INS-2025-0${inspections.length + 91}`,
      quarryName: selectedQ.name,
      quarryId: form.quarryId,
      officer: form.officer,
      date: form.date,
      type: form.type,
      priority: form.priority,
      status: 'Scheduled',
      finding: 'Scheduled under Sec. 24 MMDR Act. Checklist assigned to officer.',
      gps: `${selectedQ.lat || 15.5864}° N, ${selectedQ.lng || 79.8642}° E`,
      fine: 0,
    };

    setInspections([newIns, ...inspections]);
    setShowScheduleModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slideInUp 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Statutory Field Inspections</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>Sec. 24 MMDR Act</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Schedule and manage on-site check measurements, boundary audits, and compliance reviews in {district}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowScheduleModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Schedule Spot Audit
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Audits Completed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', marginTop: 4 }}>{completedCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>Formal field verification filed</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #1A56DB' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Upcoming Scheduled</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A56DB', marginTop: 4 }}>{scheduledCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>Field officers deployed</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Violations Flagged</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#DC2626', marginTop: 4 }}>{violationCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 2 }}>Compounding notices served</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #7C3AED' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Penalties Assessed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>
            ₹{(totalFines / 100000).toFixed(1)}L
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>Under AP Minor Mineral Rules</div>
        </div>
      </div>

      {/* Main List Card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Inspections (${inspections.length})` },
              { id: 'scheduled', label: `Upcoming (${scheduledCount})` },
              { id: 'completed', label: `Completed (${completedCount})` },
              { id: 'violation', label: `Violations (${violationCount})` },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`btn btn-sm ${filter === t.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: 280 }}>
            <input
              className="form-control"
              placeholder="Search audit ID, quarry, officer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, fontSize: '0.8rem', height: 36 }}
            />
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Inspections Table */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Target Quarry</th>
                <th>Scheduled Date</th>
                <th>Audit Purpose</th>
                <th>Priority</th>
                <th>Assigned Officer</th>
                <th>Finding / Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentData.map(ins => (
                <tr key={ins.id}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB', fontSize: '0.8rem' }}>
                    {ins.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1729' }}>{ins.quarryName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> {ins.gps}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                    {new Date(ins.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#1E293B', fontWeight: 600 }}>
                    {ins.type}
                  </td>
                  <td>
                    <span className={`badge ${
                      ins.priority === 'Emergency' ? 'badge-rose' :
                      ins.priority === 'High' ? 'badge-amber' : 'badge-blue'
                    }`} style={{ fontSize: '0.7rem' }}>
                      {ins.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#334155' }}>
                    {ins.officer}
                  </td>
                  <td>
                    <span className={`badge ${
                      ins.status === 'Completed' ? 'badge-green' :
                      ins.status === 'Violation Found' ? 'badge-rose' : 'badge-gold'
                    }`} style={{ fontSize: '0.7rem' }}>
                      {ins.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedInspection(ins)}
                      style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Eye size={13} /> Dossier
                    </button>
                  </td>
                </tr>
              ))}
              {pagination.currentData.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                    <ClipboardCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700 }}>No inspection records match this filter</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.goToPage}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          totalItems={pagination.totalItems}
        />
      </div>

      {/* INSPECTION DOSSIER MODAL */}
      {selectedInspection && (
        <div className="modal-overlay" onClick={() => setSelectedInspection(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardCheck size={20} color="#1A56DB" />
                Audit Report — {selectedInspection.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedInspection(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>{selectedInspection.quarryName}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>GPS: {selectedInspection.gps} · {district} District</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.78rem' }}>
                <div style={{ padding: '8px 12px', background: '#F1F5F9', borderRadius: 8 }}>
                  <div style={{ color: '#64748B' }}>Assigned Officer:</div>
                  <div style={{ fontWeight: 700, color: '#0F1729', marginTop: 2 }}>{selectedInspection.officer}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#F1F5F9', borderRadius: 8 }}>
                  <div style={{ color: '#64748B' }}>Inspection Date:</div>
                  <div style={{ fontWeight: 700, color: '#0F1729', marginTop: 2 }}>{selectedInspection.date}</div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 10, background: selectedInspection.status === 'Violation Found' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${selectedInspection.status === 'Violation Found' ? '#FECACA' : '#BBF7D0'}` }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: selectedInspection.status === 'Violation Found' ? '#B91C1C' : '#15803D', textTransform: 'uppercase', marginBottom: 4 }}>
                  Officer Finding &amp; Disposition:
                </div>
                <div style={{ fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.5 }}>
                  {selectedInspection.finding}
                </div>
                {selectedInspection.fine > 0 && (
                  <div style={{ marginTop: 8, fontSize: '0.85rem', fontWeight: 800, color: '#DC2626' }}>
                    Compounding Penalty Demanded: ₹{selectedInspection.fine.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Statutory Checklist verified */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>Verified Statutory Checkpoints:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    'ArUco Scale Marker Placement (30×30 cm verified)',
                    'Boundary Pillars intact as per AP Mining Plan',
                    'Dressed Block Identification Stamp inspection',
                    'Weighbridge Calibration Certificate valid',
                  ].map((chk, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#166534' }}>
                      <Check size={14} color="#16A34A" /> {chk}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedInspection(null)}>
                Close Dossier
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedInspection(null)}>
                Acknowledged
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE SPOT AUDIT MODAL */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">
                🗓️ Schedule Quarry Spot Audit
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateInspection}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Target District Quarry</label>
                  <select
                    className="form-control"
                    value={form.quarryId}
                    onChange={e => setForm(p => ({ ...p, quarryId: e.target.value }))}
                    required
                  >
                    <option value="">— Select Quarry to Inspect —</option>
                    {(quarries.length > 0 ? quarries : [
                      { id: 101, name: 'Chimakurthy Galaxy Quarry A-1' },
                      { id: 104, name: 'Ballikurava Black Pearl Quarry' },
                      { id: 108, name: 'Prakasam Premium Granite Unit 3' },
                      { id: 112, name: 'Martur Black Galaxy Mines' },
                    ]).map(q => (
                      <option key={q.id} value={q.id}>{q.name} (Q#{q.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Purpose / Reason</label>
                  <select
                    className="form-control"
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  >
                    <option value="Routine Statutory Compliance Audit">Routine Statutory Compliance Audit</option>
                    <option value="High AI Variance Verification">High AI Variance Verification (&gt;5%)</option>
                    <option value="Boundary Pillar & Depth Audit">Boundary Pillar &amp; Depth Audit</option>
                    <option value="Weighbridge Discrepancy Spot Audit">Weighbridge Discrepancy Spot Audit</option>
                    <option value="Citizen Tip-off Vigilance">Citizen Tip-off Vigilance</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Priority Level</label>
                    <select
                      className="form-control"
                      value={form.priority}
                      onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    >
                      <option value="Routine">Routine</option>
                      <option value="High">High Priority</option>
                      <option value="Emergency">Emergency Vigilance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Inspecting Officer Assigned</label>
                  <input
                    className="form-control"
                    value={form.officer}
                    onChange={e => setForm(p => ({ ...p, officer: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm &amp; Dispatch Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
