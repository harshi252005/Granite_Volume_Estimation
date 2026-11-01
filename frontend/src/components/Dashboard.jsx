import React, { useState, useEffect } from 'react';
import { api } from '../api';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import {
  Layers, Users, Mountain, Scale, IndianRupee, BarChart3, FileText, Settings,
  Brain, CheckCircle, XCircle, Clock, Truck, Plus, Trash2, Search, Edit, AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import EnforcementPanel from './EnforcementPanel';
import AICommandCenter from './AICommandCenter';
import CountUpNumber from './CountUpNumber';
import LiveBadge from './LiveBadge';
import APQuarryGISMap from './APQuarryGISMap';
import AdminReports from './AdminReports';
import OmepsReconciliationPanel from './OmepsReconciliationPanel';
import ThresholdSettings from './ThresholdSettings';

const CHART = [
  { month: 'Apr', revenue: 23, blocks: 120 }, { month: 'May', revenue: 31, blocks: 148 },
  { month: 'Jun', revenue: 27, blocks: 136 }, { month: 'Jul', revenue: 42, blocks: 180 },
  { month: 'Aug', revenue: 38, blocks: 165 }, { month: 'Sep', revenue: 45, blocks: 195 },
];
const PIE_COLORS = ['#1A56DB', '#10B981', '#E67E22', '#7C3AED', '#0EA5E9'];

export default function Dashboard({ user, activeTab, setActiveTab }) {
  const [blocks, setBlocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [quarries, setQuarries] = useState([]);
  const [wbHistory, setWbHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [b, u, q, w, a] = await Promise.allSettled([
        api.getBlocks(), api.getUsers(), api.getQuarries(),
        api.getWeighbridgeHistory(), api.getAuditLogs(),
      ]);
      setBlocks(b.status === 'fulfilled' && Array.isArray(b.value) ? b.value : []);
      setUsers(u.status === 'fulfilled' && Array.isArray(u.value) ? u.value : []);
      setQuarries(q.status === 'fulfilled' && Array.isArray(q.value) ? q.value : []);
      setWbHistory(w.status === 'fulfilled' && Array.isArray(w.value) ? w.value : []);
      setAuditLogs(a.status === 'fulfilled' && Array.isArray(a.value) ? a.value : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  switch (activeTab) {
    case 'gis_map':      return <APQuarryGISMap user={user} setActiveTab={setActiveTab} />;
    case 'users':        return <AdminUsers users={users} onRefresh={fetchAll} />;
    case 'quarries':     return <AdminQuarries quarries={quarries} onRefresh={fetchAll} user={user} setActiveTab={setActiveTab} />;
    case 'blocks':       return <AdminBlocks blocks={blocks} onRefresh={fetchAll} />;
    case 'weighbridge':  return <AdminWeighbridge history={wbHistory} />;
    case 'omeps':        return <OmepsReconciliationPanel user={user} onRefresh={fetchAll} />;
    case 'seigniorage':  return <AdminSeigniorage blocks={blocks} />;
    case 'reports':      return <AdminReports blocks={blocks} wbHistory={wbHistory} quarries={quarries} auditLogs={auditLogs} users={users} onRefresh={fetchAll} />;
    case 'audit':        return <AdminAudit logs={auditLogs} />;
    case 'settings':     return <ThresholdSettings user={user} />;
    case 'thresholds':   return <ThresholdSettings user={user} />;
    case 'enforcement':  return <EnforcementPanel user={user} />;
    case 'ai_center':    return <AICommandCenter user={user} />;
    case 'ai':           return <AICommandCenter user={user} />;
    default:             return <AdminOverview blocks={blocks} users={users} quarries={quarries} wbHistory={wbHistory} setActiveTab={setActiveTab} loading={loading} />;
  }
}

// ── Admin Overview ────────────────────────────────────────────────────────────
function AdminOverview({ blocks, users, quarries, wbHistory, setActiveTab, loading }) {
  const total = blocks.length;
  const pending = blocks.filter(b => b.status === 'check_measurement_requested').length;
  const approved = blocks.filter(b => ['dmgo_approved', 'permit_ready', 'weighbridge_approved'].includes(b.status)).length;
  const dispatched = blocks.filter(b => ['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status)).length;
  const totalRevenue = blocks.reduce((acc, b) => acc + (b.seigniorage?.total_fee || 0), 0);
  const flagged = wbHistory.filter(h => h.status === 'flagged').length;

  const pieData = [
    { name: 'Registered', value: blocks.filter(b => ['registered', 'dressed'].includes(b.status)).length },
    { name: 'AI Measured', value: blocks.filter(b => b.status === 'ai_measured').length },
    { name: 'Pending DMGO', value: pending },
    { name: 'Approved', value: approved },
    { name: 'Dispatched', value: dispatched },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* State Revenue Ticker */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#F8FAFC',
        borderRadius: 14,
        padding: '14px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        boxShadow: '0 4px 20px rgba(15,23,42,0.12)',
        animation: 'slideInUp 0.3s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            borderRadius: 10, width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
          }}>
            🏛️
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              AP State Mines &amp; Geology Directorate · Statutory Oversight
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Total Assessed Revenue:</span>
              <span style={{ color: '#34D399', fontFamily: "'JetBrains Mono', monospace" }}>
                ₹<CountUpNumber target={Number((totalRevenue / 100000).toFixed(2))} end={Number((totalRevenue / 100000).toFixed(2))} decimals={2} /> Lakhs
              </span>
            </div>
          </div>
        </div>

        {/* Live Active Sessions Pill Badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { role: 'Admin', count: 1, color: '#A855F7' },
            { role: 'DMGO', count: 8, color: '#3B82F6' },
            { role: 'Quarry Ops', count: 24, color: '#10B981' },
            { role: 'Weighbridge', count: 12, color: '#F59E0B' },
            { role: 'Vigilance', count: 6, color: '#EF4444' },
          ].map(s => (
            <div key={s.role} style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${s.color}44`,
              borderRadius: 20,
              padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.72rem', fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
              <span style={{ color: '#CBD5E1' }}>{s.role}:</span>
              <span style={{ color: '#fff', fontWeight: 800 }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Admin Overview</h1>
            <LiveBadge label="AP MINES CLOUD ACTIVE" />
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Comprehensive State-Wide Monitoring &amp; Mining Administration Portal
          </p>
        </div>
        {flagged > 0 && (
          <div className="badge badge-rose" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
            <AlertTriangle size={12} /> {flagged} WB Mismatches
          </div>
        )}
      </div>

      {/* Primary KPIs */}
      <div className="stats-grid">
        <StatCard label="Total Blocks" value={total} sub="All quarries" icon={Layers} color="#1A56DB" onClick={() => setActiveTab('blocks')} />
        <StatCard label="Registered Users" value={users.length} sub="All roles" icon={Users} color="#7C3AED" onClick={() => setActiveTab('users')} />
        <StatCard label="Active Quarries" value={quarries.length} sub="Registered sites" icon={Mountain} color="#10B981" onClick={() => setActiveTab('quarries')} />
        <StatCard label="Total Revenue" value={`₹${(totalRevenue/100000).toFixed(2)}L`} sub="Assessed seigniorage" icon={IndianRupee} color="#E67E22" onClick={() => setActiveTab('seigniorage')} />
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Pending Review" value={pending} sub="DMGO queue" icon={Clock} color="#E67E22" />
        <StatCard label="Approved" value={approved} sub="Ready dispatch" icon={CheckCircle} color="#10B981" />
        <StatCard label="Dispatched" value={dispatched} sub="In transit" icon={Truck} color="#0EA5E9" />
        <StatCard label="WB Flagged" value={flagged} sub="Weight mismatches" icon={Scale} color="#EF4444" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card card-blue">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>Revenue Trend (Lakhs)</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#1E3A8A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#1E3A8A' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#1A56DB" strokeWidth={2.5} dot={{ fill: '#1A56DB', r: 4 }} name="Revenue (L)" />
                <Line type="monotone" dataKey="blocks" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} name="Blocks" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card card-violet">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>Block Status Distribution</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* District Revenue Leaderboard & System Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* District Revenue Leaderboard */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                District Revenue Leaderboard
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>Ranked by seigniorage collection</p>
            </div>
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Top 5 Districts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { rank: 1, name: 'Prakasam District', revenue: '₹34.2 Cr', share: 92, blocks: 14414, color: '#1A56DB' },
              { rank: 2, name: 'Nellore District', revenue: '₹21.5 Cr', share: 68, blocks: 8230, color: '#10B981' },
              { rank: 3, name: 'Chittoor District', revenue: '₹15.8 Cr', share: 50, blocks: 6120, color: '#7C3AED' },
              { rank: 4, name: 'Guntur District', revenue: '₹12.1 Cr', share: 38, blocks: 5400, color: '#E67E22' },
              { rank: 5, name: 'Visakhapatnam', revenue: '₹11.2 Cr', share: 35, blocks: 4150, color: '#0EA5E9' },
            ].map(d => (
              <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>
                      {d.rank}
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F1729' }}>{d.name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>({d.blocks.toLocaleString()} blks)</span>
                  </div>
                  <span style={{ fontWeight: 800, color: d.color, fontFamily: "'JetBrains Mono', monospace" }}>{d.revenue}</span>
                </div>
                <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${d.share}%`, height: '100%', background: d.color, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Infrastructure Health Panel */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Brain size={18} color="#7C3AED" />
                  System &amp; AI Health
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>Core services status</p>
              </div>
              <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>99.98% UPTIME</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'FastAPI Backend Core', status: 'Online · 18ms latency', ok: true },
                { name: 'Computer Vision AI Engine', status: 'Model v2.4 · GPU Active', ok: true },
                { name: 'OMEPS 2.0 Cloud Bridge', status: 'Active Sync (14.4k records)', ok: true },
                { name: 'PostgreSQL Database', status: 'Pool 15/20 · Healthy', ok: true },
                { name: 'Weighbridge IoT Gateway', status: 'All 12 Scales Polling', ok: true },
              ].map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#F8FAFC', borderRadius: 8, fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.ok ? '#10B981' : '#EF4444', animation: s.ok ? 'pulse 2s infinite' : 'none' }} />
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{s.name}</span>
                  </div>
                  <span style={{ color: s.ok ? '#059669' : '#DC2626', fontWeight: 700, fontSize: '0.72rem' }}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: '0.72rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} color="#1A56DB" />
            <span>Automated backup completed at 04:00 AM · Encrypted AWS S3</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ background: '#EFF6FF' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 14 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Add User', tab: 'users', icon: Users, color: '#7C3AED' },
            { label: 'Add Quarry', tab: 'quarries', icon: Mountain, color: '#10B981' },
            { label: 'View Audit Logs', tab: 'audit', icon: FileText, color: '#1A56DB' },
            { label: 'Weighbridge', tab: 'weighbridge', icon: Scale, color: '#E67E22' },
            { label: 'Thresholds & Models', tab: 'settings', icon: Settings, color: '#0F1729' },
          ].map(({ label, tab, icon: Icon, color }) => (
            <button key={tab} className="btn btn-ghost" onClick={() => setActiveTab(tab)} style={{ gap: 7, borderColor: `${color}25`, color }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin Users ───────────────────────────────────────────────────────────────
function AdminUsers({ users, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'operator', district: '' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const pagination = usePagination((users || []).filter(u => !search || (u?.username || '').toLowerCase().includes(search.toLowerCase())), 20);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createUser(form);
      setForm({ username: '', password: '', full_name: '', role: 'operator', district: '' });
      setShowForm(false);
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await api.deleteUser(id); onRefresh(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage all portal users and their role assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {showForm && (
        <div className="card card-violet">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>Create New User</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-control" placeholder="username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" placeholder="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="Full Name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="operator">Quarry Operator</option>
                <option value="dmgo">DMGO Officer</option>
                <option value="weighbridge">Weighbridge Operator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">District</label>
              <input className="form-control" placeholder="e.g., Prakasam" value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} color="#1A56DB" />
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1A56DB' }}>{users.length} total users</span>
      </div>

      <div className="table-wrapper">
        <PaginationControls pagination={pagination} />
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>District</th>
              <th>Quarry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.currentData.map(u => (
              <tr key={u.id}>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB', fontWeight: 700 }}>#{u.id}</td>
                <td style={{ fontWeight: 700 }}>{u.username}</td>
                <td>{u.full_name || '—'}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-violet' : u.role === 'dmgo' ? 'badge-green' : u.role === 'weighbridge' ? 'badge-gold' : 'badge-blue'}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.district || '—'}</td>
                <td>{u.quarry_id ? `Q#${u.quarry_id}` : '—'}</td>
                <td>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(u.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Admin Quarries ────────────────────────────────────────────────────────────
function AdminQuarries({ quarries, onRefresh, user, setActiveTab }) {
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'table'
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', district: '', mandal: '', owner_name: '', lessee_id: '', mdl_number: '', location_gps: '' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const pagination = usePagination((quarries || []).filter(q => !search || (q?.name || '').toLowerCase().includes(search.toLowerCase()) || (q?.district || '').toLowerCase().includes(search.toLowerCase())), 20);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await api.createQuarry(form); setShowForm(false); setForm({ name: '', district: '', mandal: '', owner_name: '', lessee_id: '', mdl_number: '', location_gps: '' }); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Quarry Management &amp; GIS Observatory</h1>
          <p className="page-subtitle">All 1,856 registered quarry sites across Andhra Pradesh</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', gap: 4, background: '#E2E8F0', padding: 4, borderRadius: 10,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <button
              onClick={() => setViewMode('map')}
              style={{
                background: viewMode === 'map' ? '#1A56DB' : 'transparent',
                color: viewMode === 'map' ? '#fff' : '#475569',
                border: 'none', borderRadius: 7, padding: '7px 16px',
                fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: viewMode === 'map' ? '0 2px 8px rgba(26,86,219,0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🗺️ GIS Map View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#1A56DB' : 'transparent',
                color: viewMode === 'table' ? '#fff' : '#475569',
                border: 'none', borderRadius: 7, padding: '7px 16px',
                fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: viewMode === 'table' ? '0 2px 8px rgba(26,86,219,0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📋 Table ({quarries.length})</span>
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={15} /> Register Quarry
          </button>
        </div>
      </div>

      {/* Map View (Default) */}
      {viewMode === 'map' && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
          <APQuarryGISMap user={user} setActiveTab={setActiveTab} />
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          {showForm && (
            <div className="card card-green">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>Register New Quarry</h3>
              <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Quarry Name', 'name', 'text', 'e.g., Palnadu Granite Site'],
                  ['Owner Name', 'owner_name', 'text', 'Full name'],
                  ['District', 'district', 'text', 'e.g., Prakasam'],
                  ['Mandal', 'mandal', 'text', 'e.g., Giddalur'],
                  ['Lessee ID', 'lessee_id', 'text', '10-digit ID'],
                  ['MDL Number', 'mdl_number', 'text', 'Mineral Dealer License'],
                  ['GPS Location', 'location_gps', 'text', 'lat, lng'],
                ].map(([label, key, type, placeholder]) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-control" placeholder={placeholder} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} {...(key === 'name' ? { required: true } : {})} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', gridColumn: '1/-1' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={submitting}>{submitting ? 'Registering…' : <><Plus size={14} /> Register Quarry</>}</button>
                </div>
              </form>
            </div>
          )}

          <div className="filter-bar">
            <div className="search-input-wrap">
              <Search size={15} color="#1A56DB" />
              <input placeholder="Search by name or district..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10B981' }}>{quarries.length} quarries</span>
          </div>

          <div className="table-wrapper">
            <PaginationControls pagination={pagination} />
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Quarry Name</th>
                  <th>Owner</th>
                  <th>District</th>
                  <th>Mandal</th>
                  <th>Lessee ID</th>
                  <th>MDL No.</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.map(q => (
                  <tr key={q.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10B981', fontWeight: 700 }}>#{q.id}</td>
                    <td style={{ fontWeight: 700, color: '#0F1729' }}>{q.name}</td>
                    <td>{q.owner_name || '—'}</td>
                    <td><span className="badge badge-blue">{q.district || '—'}</span></td>
                    <td>{q.mandal || '—'}</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{q.lessee_id || '—'}</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{q.mdl_number || '—'}</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#1E3A8A' }}>{q.location_gps || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin Blocks ──────────────────────────────────────────────────────────────
function AdminBlocks({ blocks, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filtered = (blocks || []).filter(b => {
    const ms = !search || (b?.id || '').toLowerCase().includes(search.toLowerCase());
    const mf = !statusFilter || b?.status === statusFilter;
    return ms && mf;
  });
  const pagination = usePagination(filtered, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Granite Blocks</h1>
          <p className="page-subtitle">System-wide view of all registered blocks across all quarries</p>
        </div>
      </div>
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} color="#1A56DB" />
          <input placeholder="Search Block ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ maxWidth: 200 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['registered', 'ai_measured', 'check_measurement_requested', 'dmgo_approved', 'dmgo_rejected', 'dispatched', 'weighbridge_verified', 'weighbridge_flagged', 'delivered'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1A56DB' }}>{filtered.length} blocks</span>
      </div>
      <div className="table-wrapper">
        <PaginationControls pagination={pagination} />
        <table>
          <thead>
            <tr>
              <th>Block ID</th>
              <th>Quarry</th>
              <th>Type</th>
              <th>Volume (m³)</th>
              <th>Weight (MT)</th>
              <th>Seigniorage</th>
              <th>Class</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {pagination.currentData.map(b => {
              const m = b.measurement; const s = b.seigniorage;
              const vol = m?.volume != null ? m.volume.toFixed(3) : (b.undressed_volume != null ? b.undressed_volume.toFixed(3) : null);
              const wt = m?.estimated_weight != null ? m.estimated_weight.toFixed(2) : (b.undressed_volume ? (b.undressed_volume * 2.65).toFixed(2) : null);
              const gType = s?.granite_type || b.granite_type || (b.block_type === 'undressed' ? 'Raw Undressed' : '—');
              return (
                <tr key={b.id}>
                  <td style={{ fontWeight: 800, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>{b.id}</td>
                  <td style={{ fontSize: '0.8rem' }}>{b.quarry_name || `Q#${b.quarry_id}`}</td>
                  <td style={{ fontSize: '0.75rem' }}>{gType}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB' }}>{vol || '—'}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{wt || '—'}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10B981', fontWeight: 700 }}>
                    {s ? `₹${Number(s.total_fee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td>
                    {s && <span className={`badge ${s.class_status?.includes('above') ? 'badge-green' : 'badge-gold'}`}>{s.class_status?.includes('above') ? '▲' : '▼'}</span>}
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td style={{ fontSize: '0.72rem', color: '#1E3A8A' }}>{b.creation_time ? new Date(b.creation_time).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminWeighbridge({ history }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header"><div><h1 className="page-title">Weighbridge Records</h1><p className="page-subtitle">All weighbridge validation records</p></div></div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Block ID</th><th>Actual (MT)</th><th>Diff %</th><th>Status</th><th>Operator</th><th>Time</th></tr></thead>
          <tbody>
            {(history || []).map(h => (
              <tr key={h.id}>
                <td style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB' }}>{h.block_id}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{h.actual_weight != null ? Number(h.actual_weight).toFixed(3) : '—'}</td>
                <td><span className={`badge ${Math.abs(h.difference_percentage || 0) > 5 ? 'badge-rose' : 'badge-green'}`}>{h.difference_percentage != null ? Number(h.difference_percentage).toFixed(2) : '0.00'}%</span></td>
                <td><StatusBadge status={h.status === 'approved' ? 'weighbridge_verified' : 'weighbridge_flagged'} /></td>
                <td>{h.operator_username || '—'}</td>
                <td style={{ fontSize: '0.75rem' }}>{h.validation_time ? new Date(h.validation_time).toLocaleString('en-IN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSeigniorage({ blocks }) {
  const aboveRate = { 'Black Galaxy': 1830, 'Black Granite': 1520, 'Colour Granite': 940 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header"><div><h1 className="page-title">Seigniorage Configuration</h1><p className="page-subtitle">Current fee rates per AP DMG regulations</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {['Above Gangsaw (> 270×150 cm)', 'Below Gangsaw (≤ 270×150 cm)'].map((tier, idx) => (
          <div key={tier} className={`card ${idx === 0 ? 'card-green' : 'card-gold'}`}>
            <div className={`badge ${idx === 0 ? 'badge-green' : 'badge-gold'}`} style={{ marginBottom: 14 }}>{idx === 0 ? '▲' : '▼'} {tier}</div>
            <table>
              <thead><tr><th>Granite Type</th><th>Rate (₹/MT)</th></tr></thead>
              <tbody>
                {[
                  ['Black Galaxy Granite', idx === 0 ? 1830 : 1530],
                  ['Black Granite (Other)', idx === 0 ? 1520 : 1300],
                  ['Srikakulam Blue / Moon White', idx === 0 ? 1660 : 1410],
                  ['Silver Waves / Madanapalli White', idx === 0 ? 1360 : 1200],
                  ['Colour Granite (Others)', idx === 0 ? 940 : 720],
                ].map(([type, rate]) => (
                  <tr key={type}>
                    <td style={{ fontSize: '0.78rem' }}>{type}</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: idx === 0 ? '#10B981' : '#E67E22' }}>₹{rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}


function AdminAudit({ logs: propLogs }) {
  const [logs, setLogs] = useState(propLogs || []);
  useEffect(() => {
    if (propLogs && propLogs.length > 0) {
      setLogs(propLogs);
    } else {
      api.getAuditLogs().then(data => setLogs(Array.isArray(data) ? data : [])).catch(() => {});
    }
  }, [propLogs]);
  const pagination = usePagination(logs || [], 30);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header"><div><h1 className="page-title">Audit Logs</h1><p className="page-subtitle">Complete system audit trail — all events logged</p></div></div>
      <div className="table-wrapper">
        <PaginationControls pagination={pagination} />
        <table>
          <thead><tr><th>Time</th><th>Block</th><th>Event</th><th>User</th><th>Details</th></tr></thead>
          <tbody>
            {pagination.currentData.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#1E3A8A' }}>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                <td style={{ fontWeight: 700, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{log.block_id || '—'}</td>
                <td><span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{log.event?.replace(/_/g, ' ')}</span></td>
                <td style={{ fontSize: '0.8rem' }}>{log.username || 'System'}</td>
                <td style={{ fontSize: '0.75rem', color: '#1E3A8A', maxWidth: 250 }}>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">System Settings</h1><p className="page-subtitle">Portal configuration and integrations</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {[
          { title: 'OMEPS 2.0 Integration', desc: 'API endpoint and sync configuration', status: 'Connected', cls: 'badge-green' },
          { title: 'Gemini AI Model', desc: 'AI measurement engine configuration', status: 'Active', cls: 'badge-blue' },
          { title: 'Email Notifications', desc: 'SMTP settings for alert emails', status: 'Configured', cls: 'badge-green' },
          { title: 'GPS Configuration', desc: 'Location services and accuracy settings', status: 'Active', cls: 'badge-blue' },
          { title: 'Database Backup', desc: 'Automated backup schedule', status: 'Scheduled', cls: 'badge-gold' },
          { title: 'Security', desc: 'JWT settings, session timeout', status: 'Secure', cls: 'badge-green' },
        ].map(({ title, desc, status, cls }) => (
          <div key={title} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Settings size={20} color="#1A56DB" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.9rem' }}>{title}</div>
                <span className={`badge ${cls}`}>{status}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E3A8A' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAI() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><div><h1 className="page-title">AI Command Center</h1><p className="page-subtitle">AI measurement engine status and configuration</p></div></div>
      <div className="card card-violet" style={{ padding: '40px', textAlign: 'center' }}>
        <Brain size={48} color="#7C3AED" style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#0F1729', marginBottom: 12 }}>Gemini AI Measurement Engine</h2>
        <p style={{ color: '#1E3A8A', maxWidth: 500, margin: '0 auto 24px' }}>
          The AI system processes multi-angle granite block photographs to compute precise dimensions
          using computer vision and photogrammetry algorithms.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['Model', 'Gemini Vision Pro'], ['Accuracy', '99.2%'], ['Status', 'Active'], ['Queue', '0 pending']].map(([l, v]) => (
            <div key={l} style={{ background: '#EDE9FE', padding: '12px 20px', borderRadius: 12, border: '1px solid #C4B5FD', minWidth: 120 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{l}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1729', marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
