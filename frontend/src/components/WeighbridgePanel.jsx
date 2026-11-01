import React, { useState, useEffect } from 'react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import StatCard from './StatCard';
import VarianceGauge from './VarianceGauge';
import CountUpNumber from './CountUpNumber';
import LiveBadge from './LiveBadge';
import { Scale, CheckCircle, XCircle, AlertTriangle, Truck, Search, FileCheck } from 'lucide-react';
import AICommandCenter from './AICommandCenter';
import OmepsReconciliationPanel from './OmepsReconciliationPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function WeighbridgePanel({ user, activeTab, setActiveTab }) {
  const [dispatches, setDispatches] = useState([]);
  const [wbHistory, setWbHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [d, w] = await Promise.all([api.getDispatches(), api.getWeighbridgeHistory()]);
      setDispatches(Array.isArray(d) ? d : []);
      setWbHistory(Array.isArray(w) ? w : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  switch (activeTab) {
    case 'entry':     return <WeighbridgeEntry dispatches={dispatches} onRefresh={fetchAll} />;
    case 'history':   return <WeighbridgeHistory history={wbHistory} onRefresh={fetchAll} />;
    case 'omeps':     return <OmepsReconciliationPanel user={user} onRefresh={fetchAll} />;
    case 'ai_center': return <AICommandCenter user={user} />;
    default:          return <WBDashboard dispatches={dispatches} history={wbHistory} setActiveTab={setActiveTab} loading={loading} />;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function WBDashboard({ dispatches, history, setActiveTab, loading }) {
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const pending  = dispatches.filter(d => !history.find(h => h.block_id === d.block_id));
  const verified = history.filter(h => ['approved', 'dmgo_override', 'reweighed'].includes(h.status));
  const flagged  = history.filter(h => h.status === 'flagged');

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [sessionStart]);

  const elapsedStr = `${String(Math.floor(elapsed / 3600)).padStart(2,'0')}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;

  const varianceRanges = [
    { range: '0–2%',  count: history.filter(h => Math.abs(h.difference_percentage || 0) <= 2).length,  fill: '#10B981' },
    { range: '2–5%',  count: history.filter(h => { const v = Math.abs(h.difference_percentage || 0); return v > 2 && v <= 5; }).length, fill: '#F59E0B' },
    { range: '5–10%', count: history.filter(h => { const v = Math.abs(h.difference_percentage || 0); return v > 5 && v <= 10; }).length, fill: '#EF4444' },
    { range: '>10%',  count: history.filter(h => Math.abs(h.difference_percentage || 0) > 10).length, fill: '#7C3AED' },
  ];

  const avgVariance = history.length > 0
    ? history.reduce((acc, h) => acc + Math.abs(h.difference_percentage || 0), 0) / history.length
    : 0;

  const handleLookup = () => {
    if (!lookupId.trim()) return;
    const dispatch = dispatches.find(d => d.block_id?.toLowerCase() === lookupId.trim().toLowerCase());
    setLookupResult(dispatch || 'not_found');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Weighbridge Dashboard</h1>
          <p className="page-subtitle">Validate physical granite block weights against AI estimates</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#1A56DB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Time</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#0F1729', fontSize: 16 }}>{elapsedStr}</div>
          </div>
          <button className="btn btn-outline" onClick={() => setActiveTab('omeps')} style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#1A56DB', color: '#1A56DB' }}>
            <FileCheck size={15} /> OMEPS 2.0 Validation
          </button>
          <button className="btn btn-accent" onClick={() => setActiveTab('entry')}>
            <Scale size={15} /> Enter Weight Reading
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard label="Pending Verification" value={pending.length} sub="Blocks arriving" icon={Truck} color="#E67E22" onClick={() => setActiveTab('entry')} />
        <StatCard label="Verified Today"        value={verified.length} sub="Weights confirmed" icon={CheckCircle} color="#10B981" />
        <StatCard label="Flagged Mismatches"    value={flagged.length}  sub="Weight discrepancies" icon={AlertTriangle} color="#EF4444" onClick={() => setActiveTab('history')} />
        <StatCard label="Total Weighed"         value={history.length}  sub="All time" icon={Scale} color="#1A56DB" />
      </div>

      {/* Flagged Alert */}
      {flagged.length > 0 && (
        <div className="alert alert-rose">
          <XCircle size={16} />
          <strong>{flagged.length} weight mismatches detected!</strong> Use the Re-Weigh action in History to submit corrected readings.
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('history')} style={{ padding: '2px 8px', marginLeft: 8 }}>Review →</button>
        </div>
      )}

      {/* Variance Gauge + Shift Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-blue" style={{ animation: 'slideInLeft 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>⚖️ Average Weight Variance</h3>
            <LiveBadge label="Live" />
          </div>
          <VarianceGauge variance={avgVariance} />
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Avg Variance', val: `${avgVariance.toFixed(2)}%`, color: avgVariance <= 2 ? '#10B981' : avgVariance <= 5 ? '#F59E0B' : '#EF4444' },
              { label: 'Min Variance', val: history.length > 0 ? `${Math.min(...history.map(h => Math.abs(h.difference_percentage || 0))).toFixed(2)}%` : '—', color: '#10B981' },
              { label: 'Max Variance', val: history.length > 0 ? `${Math.max(...history.map(h => Math.abs(h.difference_percentage || 0))).toFixed(2)}%` : '—', color: '#EF4444' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#1E3A8A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-green" style={{ animation: 'slideInRight 0.4s ease-out' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 14 }}>📋 This Shift Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Blocks Verified', val: verified.length, color: '#10B981', icon: '✅' },
              { label: 'Flagged',         val: flagged.length,  color: '#EF4444', icon: '🚨' },
              { label: 'Pending Queue',   val: pending.length,  color: '#E67E22', icon: '⏳' },
              { label: 'Total Processed', val: history.length,  color: '#1A56DB', icon: '📊' },
            ].map(({ label, val, color, icon }) => (
              <div key={label} style={{ background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color }}><CountUpNumber target={val} duration={1000} /></div>
                <div style={{ fontSize: 10, color: '#065F46', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#ECFDF5', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600 }}>
              ✅ Approval Rate: <strong>{history.length > 0 ? ((verified.length / history.length) * 100).toFixed(1) : 0}%</strong>
            </div>
            <div className="progress-track" style={{ marginTop: 6 }}>
              <div className="progress-fill progress-fill-green" style={{ width: `${history.length > 0 ? (verified.length / history.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Variance Distribution Chart */}
      {history.length > 0 && (
        <div className="card card-violet" style={{ animation: 'slideInUp 0.5s ease-out' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 4 }}>📊 Variance Distribution</h3>
          <div style={{ fontSize: 11, color: '#1E3A8A', marginBottom: 14 }}>How blocks distribute across weight variance bands</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varianceRanges} barSize={34}>
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#1E3A8A' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {varianceRanges.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {varianceRanges.map(({ range, count, fill }) => (
                <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: fill, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#0F1729' }}>{range}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: fill }}>{count}</span>
                    </div>
                    <div className="progress-track" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${history.length > 0 ? (count / history.length) * 100 : 0}%`, background: fill }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Block Lookup */}
      <div className="card" style={{ animation: 'slideInUp 0.55s ease-out' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 14 }}>🔍 Quick Block Lookup</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-control" placeholder="Enter Block ID e.g. BLK-001-25-KNL"
            value={lookupId}
            onChange={e => setLookupId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleLookup}><Search size={15} /> Lookup</button>
        </div>
        {lookupResult && lookupResult !== 'not_found' && (
          <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', animation: 'scalePop 0.3s ease-out' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F1729', marginBottom: 8 }}>
              ✅ Block found: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB' }}>{lookupResult.block_id}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Vehicle', val: lookupResult.vehicle_number || '—' },
                { label: 'Driver', val: lookupResult.driver_name || '—' },
                { label: 'Transporter', val: lookupResult.transporter_name || '—' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: '#1E3A8A', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F1729' }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-accent btn-sm" onClick={() => setActiveTab('entry')}>
                <Scale size={13} /> Proceed to Weigh →
              </button>
            </div>
          </div>
        )}
        {lookupResult === 'not_found' && (
          <div className="alert alert-rose" style={{ marginTop: 10 }}>
            <XCircle size={14} /> Block ID not found in pending dispatch queue.
          </div>
        )}
      </div>

      {/* Incoming queue */}
      <div className="card card-gold">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 14 }}>Incoming Dispatches — Awaiting Weighing</h3>
        {pending.length === 0 ? (
          <p style={{ color: '#1E3A8A', fontSize: '0.85rem' }}>No dispatches pending weighbridge verification. ✅</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.slice(0, 6).map(d => (
              <div key={d.block_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#FFF8F0', borderRadius: 10, border: '1px solid #FDE68A' }}>
                <div>
                  <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', color: '#0F1729' }}>{d.block_id}</div>
                  <div style={{ fontSize: '0.7rem', color: '#92400E', marginTop: 2 }}>Vehicle: {d.vehicle_number} · Driver: {d.driver_name}</div>
                </div>
                <button className="btn btn-accent btn-sm" onClick={() => setActiveTab('entry')}>Weigh Now →</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── WeighbridgeEntry ──────────────────────────────────────────────────────────
function WeighbridgeEntry({ dispatches, onRefresh }) {
  const [blockId, setBlockId] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blockId || !actualWeight) return setError('Please select a block and enter weight.');
    try {
      setSubmitting(true);
      setError(null);
      await api.submitWeighbridge({ block_id: blockId, actual_weight: parseFloat(actualWeight) });
      setSuccess(true);
      setBlockId('');
      setActualWeight('');
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit reading.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 500, margin: '0 auto', animation: 'slideInUp 0.3s ease-out' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>Enter Weighbridge Reading</h3>

      {error && <div className="alert alert-rose" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-green" style={{ marginBottom: 16 }}>Weight recorded successfully!</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="form-label">Select Pending Block</label>
          <select className="form-control" value={blockId} onChange={e => setBlockId(e.target.value)} required>
            <option value="">-- Select Block --</option>
            {dispatches.map(d => (
              <option key={d.block_id} value={d.block_id}>{d.block_id} (Vehicle: {d.vehicle_number})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Actual Weight (MT)</label>
          <input
            type="number" className="form-control"
            placeholder="e.g. 24.50"
            value={actualWeight}
            onChange={e => setActualWeight(e.target.value)}
            required step="0.01"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? 'Submitting...' : '⚖ Submit Reading'}
        </button>
      </form>
    </div>
  );
}

// ── WeighbridgeHistory with Re-Weigh UI ───────────────────────────────────────
function WeighbridgeHistory({ history, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [reweighRow, setReweighRow] = useState(null);
  const [newWeight, setNewWeight] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [localHistory, setLocalHistory] = useState(history);

  useEffect(() => { setLocalHistory(history); }, [history]);

  const flaggedCount = localHistory.filter(h => h.status === 'flagged').length;

  const filtered = localHistory.filter(h => {
    if (filter === 'flagged')  return h.status === 'flagged';
    if (filter === 'approved') return ['approved', 'dmgo_override', 'reweighed'].includes(h.status);
    return true;
  });

  const handleReweigh = async (blockId, aiEst) => {
    if (!newWeight) return setErrorMsg('Please enter the new weight.');
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await api.reweighBlock(blockId, parseFloat(newWeight), remarks || 'Re-weigh after calibration check');
      setLocalHistory(prev => prev.map(h =>
        h.block_id === blockId
          ? { ...h, actual_weight: updated.actual_weight, difference_percentage: updated.difference_percentage, status: updated.status, resolution_action: updated.resolution_action, previous_weight: updated.previous_weight }
          : h
      ));
      const outcome = updated.status === 'approved' ? '✅ Block is now APPROVED' : '⚠ Still flagged — variance too high';
      setSuccessMsg(`Re-weigh submitted! ${outcome} (Variance: ${updated.difference_percentage}%)`);
      setReweighRow(null);
      setNewWeight('');
      setRemarks('');
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to submit re-weigh.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = (s) => ({
    approved:      { bg: '#F0FDF4', color: '#10B981', border: '#BBF7D0', label: '✅ Approved' },
    flagged:       { bg: '#FEF2F2', color: '#EF4444', border: '#FECACA', label: '🚨 Flagged' },
    dmgo_override: { bg: '#EFF6FF', color: '#1A56DB', border: '#BFDBFE', label: '🔏 DMGO Override' },
    reweighed:     { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7', label: '⚖ Re-weighed' },
    escalated:     { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: '🚔 Escalated' },
  }[s] || { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: s });

  if (!localHistory || localHistory.length === 0) {
    return (
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>Weighbridge History</h3>
        <p style={{ color: '#64748B' }}>No weighbridge records found.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ animation: 'slideInUp 0.3s ease-out' }}>
      {/* Header + filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>⚖️ Weighbridge History</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all',      label: `All (${localHistory.length})` },
            { key: 'flagged',  label: `🚨 Flagged (${flaggedCount})` },
            { key: 'approved', label: '✅ Approved' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: filter === key ? '#1A56DB' : '#EFF6FF',
              color: filter === key ? '#fff' : '#1E3A8A',
              borderColor: filter === key ? '#1A56DB' : '#BFDBFE',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {successMsg && <div className="alert alert-green" style={{ marginBottom: 12, fontSize: 13 }}>{successMsg}</div>}
      {flaggedCount > 0 && filter !== 'approved' && (
        <div className="alert alert-rose" style={{ marginBottom: 12, fontSize: 13 }}>
          <AlertTriangle size={14} />
          <strong>{flaggedCount} flagged block{flaggedCount > 1 ? 's' : ''}</strong> — click <strong>⚖ Re-Weigh</strong> to submit a corrected reading.
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Block ID</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Time</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Operator</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>AI Est. (MT)</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Actual (MT)</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Variance</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Status</th>
              <th style={{ padding: '11px 12px', color: '#475569' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record, i) => {
              const date = record.created_at ? new Date(record.created_at).toLocaleString('en-IN') : 'N/A';
              const diff = record.difference_percentage || 0;
              const isFlagged = record.status === 'flagged';
              const ss = statusStyle(record.status);
              const isReweighOpen = reweighRow === record.block_id;
              const aiEst = record.ai_estimated_weight || 0;
              const previewDiff = newWeight && aiEst > 0
                ? Math.abs((aiEst - parseFloat(newWeight)) / aiEst * 100).toFixed(2)
                : null;
              const previewOk = previewDiff !== null && parseFloat(previewDiff) <= 8;

              return (
                <React.Fragment key={i}>
                  <tr style={{ borderBottom: isReweighOpen ? 'none' : '1px solid #F1F5F9', background: isFlagged ? '#FFFBEB' : 'transparent' }}>
                    <td style={{ padding: '11px 12px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.79rem' }}>{record.block_id}</td>
                    <td style={{ padding: '11px 12px', color: '#64748B', fontSize: '0.77rem' }}>{date}</td>
                    <td style={{ padding: '11px 12px' }}>{record.operator_username || 'Unknown'}</td>
                    <td style={{ padding: '11px 12px' }}>{aiEst > 0 ? aiEst.toFixed(2) : '—'}</td>
                    <td style={{ padding: '11px 12px', fontWeight: 700 }}>
                      {record.actual_weight?.toFixed(2) || '—'}
                      {record.previous_weight > 0 && (
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>prev: {record.previous_weight?.toFixed(2)}</div>
                      )}
                    </td>
                    <td style={{ padding: '11px 12px', color: isFlagged ? '#EF4444' : '#10B981', fontWeight: 700 }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: '0.71rem', fontWeight: 700, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                        {ss.label}
                      </span>
                      {record.resolution_remarks && (
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.resolution_remarks}>
                          {record.resolution_remarks}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      {isFlagged && (
                        <button
                          className="btn btn-accent btn-sm"
                          onClick={() => { setReweighRow(isReweighOpen ? null : record.block_id); setNewWeight(''); setRemarks(''); setErrorMsg(null); }}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          {isReweighOpen ? '✕ Cancel' : '⚖ Re-Weigh'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Inline Re-Weigh Form */}
                  {isReweighOpen && (
                    <tr style={{ background: '#FFF8F0', borderBottom: '2px solid #FDE68A' }}>
                      <td colSpan={8} style={{ padding: '14px 16px' }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #FDE68A', maxWidth: 620 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E', marginBottom: 8 }}>
                            ⚖️ Re-Weigh: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{record.block_id}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                            AI Estimate: <strong>{aiEst} MT</strong> · Previous Actual: <strong>{record.actual_weight?.toFixed(2)} MT</strong> · Original Variance: <strong style={{ color: '#EF4444' }}>{diff.toFixed(2)}%</strong>
                          </div>

                          {errorMsg && <div className="alert alert-rose" style={{ marginBottom: 10, fontSize: 12 }}>{errorMsg}</div>}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                            <div>
                              <label className="form-label" style={{ fontSize: 11 }}>New Actual Weight (MT) *</label>
                              <input
                                type="number" step="0.01" className="form-control"
                                placeholder="e.g. 24.50"
                                value={newWeight}
                                onChange={e => setNewWeight(e.target.value)}
                                style={{ fontSize: 13 }}
                              />
                              {previewDiff !== null && (
                                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: previewOk ? '#10B981' : '#EF4444' }}>
                                  {previewOk ? '✅' : '⚠'} New variance: {previewDiff}% — {previewOk ? 'WILL BE APPROVED' : 'STILL FLAGGED'}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: 11 }}>Remarks (optional)</label>
                              <input
                                type="text" className="form-control"
                                placeholder="e.g. Scale recalibrated and re-checked"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                style={{ fontSize: 13 }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleReweigh(record.block_id, aiEst)}
                              disabled={submitting || !newWeight}
                              style={{ fontSize: 12 }}
                            >
                              {submitting ? 'Submitting...' : '⚖ Submit Re-Weigh'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setReweighRow(null); setErrorMsg(null); }} style={{ fontSize: 12 }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: 13 }}>
            No records match this filter. ✅
          </div>
        )}
      </div>
    </div>
  );
}
