import React, { useState, useEffect } from 'react';
import StatCard from './StatCard';
import CountUpNumber from './CountUpNumber';
import StepTracker from './StepTracker';
import LiveBadge from './LiveBadge';
import { Layers, Camera, CheckCircle, Clock, XCircle, Truck, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

const CHART_DATA = [
  { name: 'Mon', blocks: 4 }, { name: 'Tue', blocks: 7 }, { name: 'Wed', blocks: 5 },
  { name: 'Thu', blocks: 9 }, { name: 'Fri', blocks: 6 }, { name: 'Sat', blocks: 11 }, { name: 'Sun', blocks: 3 },
];

const BLOCK_TIPS = [
  '📸 Place an ArUco marker (30×30 cm) at the base of the block for precise AI scaling.',
  '🌞 Capture in natural daylight — avoid shadows across the block face.',
  '📐 Minimum 4 photos needed: Front, Side, Top, and 3/4 angle view.',
  '📍 GPS auto-tags quarry location — ensure location permission is ON.',
  '🪨 Separate undressed and dressed blocks — they have different seigniorage tariffs.',
  '⚖️ Blocks > 270 cm × 150 cm qualify as Super Gangsaw/Gangsaw category (higher tariff).',
  '🔒 After DMGO approval, request dispatch immediately — permits expire in 7 days.',
  '🚛 Assign a vehicle with valid AP registration before generating the e-Transit Pass.',
];

const LIFECYCLE_STEPS = [
  { label: 'Registered', icon: '📋' },
  { label: 'AI Measured', icon: '🤖' },
  { label: 'DMGO Check', icon: '🏛️' },
  { label: 'Permit Ready', icon: '📜' },
  { label: 'Dispatched', icon: '🚛' },
];

function getBlockStep(status) {
  if (!status) return 0;
  if (['undressed', 'dressed', 'registered'].includes(status)) return 0;
  if (status === 'ai_measured') return 1;
  if (['check_requested', 'check_measurement_requested'].includes(status)) return 2;
  if (['dmgo_approved', 'permit_ready', 'weighbridge_approved'].includes(status)) return 3;
  if (['dispatched', 'weighbridge_verified', 'delivered'].includes(status)) return 4;
  return 0;
}

const ACTIVITY_TYPES = {
  'registered':    { color: '#1A56DB', icon: '📋', label: 'Registered' },
  'ai_measured':   { color: '#7C3AED', icon: '🤖', label: 'AI Measured' },
  'check_requested': { color: '#E67E22', icon: '🏛️', label: 'Sent to DMGO' },
  'dmgo_approved': { color: '#10B981', icon: '✅', label: 'DMGO Approved' },
  'dmgo_rejected': { color: '#EF4444', icon: '❌', label: 'DMGO Rejected' },
  'dispatched':    { color: '#0EA5E9', icon: '🚛', label: 'Dispatched' },
  'permit_ready':  { color: '#10B981', icon: '📜', label: 'Permit Ready' },
};

export default function OperatorDashboard({ blocks, setActiveTab, loading }) {
  const [tipIndex, setTipIndex] = useState(0);

  const total      = blocks.length;
  const undressed  = blocks.filter(b => b.block_type === 'undressed' || b.status === 'undressed').length;
  const dressed    = blocks.filter(b => b.block_type !== 'undressed' && b.status !== 'undressed').length;
  const pending    = blocks.filter(b => ['check_measurement_requested', 'check_requested', 'ai_measured'].includes(b.status)).length;
  const approved   = blocks.filter(b => ['dmgo_approved', 'permit_ready', 'weighbridge_approved'].includes(b.status)).length;
  const rejected   = blocks.filter(b => b.status === 'dmgo_rejected').length;
  const dispatched = blocks.filter(b => ['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status)).length;

  const totalVolume      = blocks.reduce((acc, b) => acc + (b.measurement?.volume || b.undressed_volume || 0), 0);
  const totalSeigniorage = blocks.reduce((acc, b) => acc + (b.seigniorage?.total_fee || 0), 0);

  const recentBlocks   = [...blocks].sort((a, b) => new Date(b.creation_time) - new Date(a.creation_time)).slice(0, 5);
  const activityBlocks = [...blocks].sort((a, b) => new Date(b.last_updated || b.creation_time) - new Date(a.last_updated || a.creation_time)).slice(0, 6);

  const phaseData = [
    { name: '🪨 Raw', count: undressed, fill: '#E67E22' },
    { name: '📐 Dressed', count: Math.max(0, dressed - pending - approved - rejected - dispatched), fill: '#1A56DB' },
    { name: '⏳ Pending', count: pending, fill: '#F59E0B' },
    { name: '✅ Approved', count: approved, fill: '#10B981' },
    { name: '🚛 Sent', count: dispatched, fill: '#7C3AED' },
  ].filter(d => d.count > 0);

  const seigniorageProgress = totalSeigniorage > 0 ? Math.min((totalSeigniorage / 500000) * 100, 100) : 0;

  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % BLOCK_TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12, animation: 'pulseDot 1s infinite' }}>⛏️</div>
          <div style={{ color: '#1E3A8A', fontWeight: 600 }}>Loading your blocks…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Productivity streak banner ─────────────────── */}
      {total > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
          borderRadius: 14, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(26,86,219,0.3)',
          animation: 'slideInUp 0.4s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 30 }}>🔥</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>
                {total} granite blocks in your quarry inventory!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                {approved} ready for dispatch · {pending} awaiting DMGO · {dispatched} in transit
              </div>
            </div>
          </div>
          <LiveBadge label="Live Data" variant="green" />
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quarry Dashboard</h1>
          <p className="page-subtitle">Overview of your registered granite blocks across excavation and dressing stages</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('capture')}>
          <Camera size={16} /> Capture / Register Block
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard label="Total Inventory" value={total} sub="All registered blocks" icon={Layers} color="#1A56DB" onClick={() => setActiveTab('blocks')} />
        <StatCard label="🪨 Raw Undressed" value={undressed} sub="Pit excavation stage" icon={TrendingUp} color="#D97706" onClick={() => setActiveTab('blocks')} />
        <StatCard label="📐 Dressed Blocks" value={dressed} sub="Dressing yard & AI" icon={Layers} color="#10B981" onClick={() => setActiveTab('blocks')} />
        <StatCard label="Pending DMGO" value={pending} sub="Awaiting check inspection" icon={Clock} color="#E67E22" onClick={() => setActiveTab('blocks')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label="Approved & Ready" value={approved} sub="Transit permit ready" icon={CheckCircle} color="#10B981" onClick={() => setActiveTab('dispatch')} />
        <StatCard label="Dispatched" value={dispatched} sub="Blocks in transit" icon={Truck} color="#7C3AED" />
        <StatCard label="Total Volume" value={`${totalVolume.toFixed(2)} m³`} sub="Pit & commercial vol" icon={TrendingUp} color="#0EA5E9" />
        <StatCard label="Seigniorage Payable" value={`₹${(totalSeigniorage / 1000).toFixed(1)}K`} sub="Assessed royalty fee" icon={AlertTriangle} color="#E67E22" />
      </div>

      {/* ── Quick Actions ─────────────────────────────── */}
      <div className="card" style={{ animation: 'slideInUp 0.4s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>⚡ Quick Actions</h3>
          <LiveBadge label="Active" />
        </div>
        <div className="quick-actions-grid">
          {[
            { icon: '📸', label: 'Register Undressed Block', bg: '#EFF6FF', onClick: () => setActiveTab('capture') },
            { icon: '📐', label: 'Register Dressed Block',   bg: '#ECFDF5', onClick: () => setActiveTab('capture') },
            { icon: '🏛️', label: 'Request DMGO Inspection', bg: '#FFF7ED', onClick: () => setActiveTab('blocks') },
            { icon: '📜', label: 'View e-Permits',           bg: '#F5F3FF', onClick: () => setActiveTab('dispatch') },
            { icon: '📋', label: 'My Block List',            bg: '#EFF6FF', onClick: () => setActiveTab('blocks') },
            { icon: '🤖', label: 'AI Assistant',             bg: '#F0FDF4', onClick: () => setActiveTab('ai_center') },
          ].map((action, i) => (
            <button key={i} className="quick-action-btn animate-slide-up"
              style={{ animationDelay: `${i * 0.07}s` }} onClick={action.onClick}>
              <div className="qa-icon" style={{ background: action.bg }}>{action.icon}</div>
              <span className="qa-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Seigniorage Meter + Phase Distribution ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-gold" style={{ animation: 'slideInLeft 0.5s ease-out' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 8 }}>💰 Seigniorage Assessed</h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#E67E22' }}>
              ₹<CountUpNumber target={totalSeigniorage} duration={1500} />
            </div>
            <div style={{ fontSize: 12, color: '#92400E' }}>Total royalty payable across all your blocks</div>
          </div>
          <div className="progress-track" style={{ marginBottom: 6 }}>
            <div className="progress-fill progress-fill-orange" style={{ width: `${seigniorageProgress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#92400E', fontWeight: 600 }}>
            <span>₹0</span>
            <span>{seigniorageProgress.toFixed(0)}% of ₹5L milestone</span>
            <span>₹5,00,000</span>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Avg per block', val: total > 0 ? `₹${Math.round(totalSeigniorage / total).toLocaleString('en-IN')}` : '₹0' },
              { label: 'Avg volume',    val: total > 0 ? `${(totalVolume / total).toFixed(2)} m³` : '0 m³' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: '#FFF8F0', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#92400E', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F1729' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-blue" style={{ animation: 'slideInRight 0.5s ease-out' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 4 }}>📊 Block Phase Distribution</h3>
          <div style={{ fontSize: 11, color: '#1E3A8A', marginBottom: 12 }}>Breakdown across quarry lifecycle stages</div>
          {phaseData.length > 0 ? (
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#1E3A8A' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {phaseData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#1E3A8A', fontSize: 13 }}>No blocks yet. Capture your first block!</div>
          )}
        </div>
      </div>

      {/* ── Charts + Recent ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-blue">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 16 }}>Block Registration — This Week</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A56DB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#1A56DB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1E3A8A' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="blocks" stroke="#1A56DB" strokeWidth={2.5} fill="url(#blueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-gold">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 16 }}>Recently Registered Blocks</h3>
          {recentBlocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#1E3A8A' }}>
              <Layers size={28} color="#BFDBFE" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: '0.85rem' }}>No blocks yet. Capture your first block!</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => setActiveTab('capture')}>
                <Plus size={13} /> Capture Block
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentBlocks.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: '#FFF8F0', border: '1px solid #FDE68A',
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                      {b.id}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#92400E', marginTop: 2 }}>
                      {b.measurement ? `${(b.measurement.volume || 0).toFixed(3)} m³` : 'Not measured'}
                    </div>
                  </div>
                  <span className={`badge ${
                    b.status === 'dmgo_approved' ? 'badge-green' :
                    b.status === 'dmgo_rejected' ? 'badge-rose' :
                    b.status === 'check_measurement_requested' ? 'badge-gold' : 'badge-blue'
                  }`}>
                    {b.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Feed + Lifecycle Tracker ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ animation: 'slideInLeft 0.6s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>📡 Live Activity Feed</h3>
            <LiveBadge label="Live" />
          </div>
          {activityBlocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#1E3A8A', fontSize: 13 }}>No activity yet</div>
          ) : (
            <div>
              {activityBlocks.map((b, i) => {
                const act = ACTIVITY_TYPES[b.status] || { color: '#64748B', icon: '📋', label: b.status?.replace(/_/g, ' ') || 'Unknown' };
                const time = b.last_updated || b.creation_time;
                return (
                  <div key={b.id} className="activity-item" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="activity-dot" style={{ background: act.color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F1729' }}>
                        {act.icon} {b.id}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {act.label}{b.measurement?.volume ? ` · ${b.measurement.volume.toFixed(2)} m³` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>
                      {time ? new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-green" style={{ animation: 'slideInRight 0.6s ease-out' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 4 }}>🔄 Block Lifecycle Tracker</h3>
          <div style={{ fontSize: 11, color: '#1E3A8A', marginBottom: 16 }}>
            {recentBlocks[0] ? `Showing: ${recentBlocks[0].id}` : 'Capture a block to see its lifecycle'}
          </div>
          <StepTracker steps={LIFECYCLE_STEPS} currentStep={recentBlocks[0] ? getBlockStep(recentBlocks[0].status) : 0} />
          {recentBlocks.length > 1 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: '#1E3A8A', fontWeight: 600, marginBottom: 10 }}>Other Recent Blocks:</div>
              {recentBlocks.slice(1, 4).map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', background: '#F0FDF4', borderRadius: 8, marginBottom: 6,
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#0F1729' }}>{b.id}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {LIFECYCLE_STEPS.map((_, si) => (
                      <div key={si} style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: si <= getBlockStep(b.status) ? '#10B981' : '#D1FAE5',
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rotating Tips ─────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
        border: '1px solid #BFDBFE', borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        animation: 'slideInUp 0.7s ease-out',
      }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>💡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            AP Granite Field Tip ({tipIndex + 1}/{BLOCK_TIPS.length})
          </div>
          <div key={tipIndex} style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.6, animation: 'slideInRight 0.4s ease-out' }}>
            {BLOCK_TIPS[tipIndex]}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          {BLOCK_TIPS.map((_, i) => (
            <div key={i} onClick={() => setTipIndex(i)} style={{
              width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
              background: i === tipIndex ? '#1A56DB' : '#BFDBFE',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* ── Action Items ──────────────────────────────── */}
      <div className="card card-green">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 14 }}>Action Items</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {pending > 0 && (
            <div className="alert alert-amber" style={{ flex: '1 1 200px' }}>
              <Clock size={16} />
              <div>
                <strong>{pending} block(s)</strong> waiting for DMGO check measurement.{' '}
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('blocks')} style={{ padding: '2px 8px', marginTop: 4 }}>View →</button>
              </div>
            </div>
          )}
          {rejected > 0 && (
            <div className="alert alert-rose" style={{ flex: '1 1 200px' }}>
              <XCircle size={16} />
              <div><strong>{rejected} block(s)</strong> were rejected by DMGO. Review remarks and resubmit.</div>
            </div>
          )}
          {approved > 0 && (
            <div className="alert alert-green" style={{ flex: '1 1 200px' }}>
              <CheckCircle size={16} />
              <div>
                <strong>{approved} block(s)</strong> approved — ready to request dispatch.{' '}
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('dispatch')} style={{ padding: '2px 8px', marginTop: 4 }}>Dispatch →</button>
              </div>
            </div>
          )}
          {pending === 0 && rejected === 0 && approved === 0 && (
            <div className="alert alert-blue" style={{ flex: 1 }}>
              <CheckCircle size={16} />
              All blocks are up to date. Capture new blocks to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
