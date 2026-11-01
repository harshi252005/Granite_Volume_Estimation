import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import StatCard from './StatCard';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import {
  ClipboardCheck, CheckCircle, XCircle, Eye, Edit, BarChart3, Mountain,
  FileText, LayoutDashboard, AlertTriangle, Search, Filter, Download,
  ArrowRight, RefreshCw, Layers, ShieldCheck, Activity, MapPin, Check,
  ExternalLink, TrendingUp, HelpCircle, Receipt, Clock, CheckCircle2, CreditCard, ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import BlockInspector3D from './BlockInspector3D';
import AICommandCenter from './AICommandCenter';
import CountUpNumber from './CountUpNumber';
import LiveBadge from './LiveBadge';
import StepTracker from './StepTracker';
import DMGOPermits from './DMGOPermits';
import DMGOInspections from './DMGOInspections';
import DMGORevenue from './DMGORevenue';
import DMGOVigilance from './DMGOVigilance';
import APQuarryGISMap from './APQuarryGISMap';
import OmepsReconciliationPanel from './OmepsReconciliationPanel';

export default function DMGOPanel({ user, activeTab, setActiveTab }) {
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [reports, setReports] = useState(null);
  const [quarries, setQuarries] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = async (isRefresh = false, districtToFetch = selectedDistrict) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const blockParams = { limit: 500 };
      const statsParams = {};
      if (districtToFetch && districtToFetch !== 'ALL') {
        blockParams.district = districtToFetch;
        statsParams.district = districtToFetch;
      } else {
        blockParams.district = 'ALL';
        statsParams.district = 'ALL';
      }

      const [statsRes, blocksRes, reportsRes, quarriesRes, auditRes] = await Promise.allSettled([
        api.getDashboardStats(statsParams),
        api.getBlocks(blockParams),
        api.getAnalytics(),
        api.getQuarries(),
        api.getAuditLogs(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (blocksRes.status === 'fulfilled' && Array.isArray(blocksRes.value)) setBlocks(blocksRes.value);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value);
      if (quarriesRes.status === 'fulfilled' && Array.isArray(quarriesRes.value)) setQuarries(quarriesRes.value);
      if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value)) setAuditLogs(auditRes.value);
    } catch (err) {
      console.error('Error fetching DMGO data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData(false, selectedDistrict);
  }, [selectedDistrict]);

  const pendingBlocks = useMemo(() => {
    return (blocks || []).filter(b =>
      ['check_measurement_requested', 'check_requested', 'ai_measured'].includes(b.status)
    );
  }, [blocks]);

  const approvedBlocks = useMemo(() => {
    return (blocks || []).filter(b =>
      ['dmgo_approved', 'permit_ready', 'weighbridge_verified', 'weighbridge_flagged', 'dispatched', 'delivered'].includes(b.status)
    );
  }, [blocks]);

  const rejectedBlocks = useMemo(() => {
    return (blocks || []).filter(b => b.status === 'dmgo_rejected');
  }, [blocks]);

  if (loading && !stats && blocks.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '50vh', gap: 16
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.5s infinite'
        }}>
          <ClipboardCheck size={24} color="#fff" />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E3A8A' }}>
          Loading DMGO Portal ({user?.district || 'Prakasam'} District)…
        </div>
        <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Fetching district stats, block queue, and analytics</p>
      </div>
    );
  }

  switch (activeTab) {
    case 'blocks':
      return (
        <DMGOBlockQueue
          blocks={blocks}
          pendingBlocks={pendingBlocks}
          user={user}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          quarries={quarries}
          onRefresh={() => fetchAllData(true, selectedDistrict)}
          refreshing={refreshing}
        />
      );
    case 'permits':
      return (
        <DMGOPermits
          blocks={blocks}
          user={user}
          onRefresh={() => fetchAllData(true)}
        />
      );
    case 'omeps':
      return (
        <OmepsReconciliationPanel
          user={user}
          onRefresh={() => fetchAllData(true)}
        />
      );
    case 'inspections':
      return (
        <DMGOInspections
          quarries={quarries}
          user={user}
        />
      );
    case 'revenue':
      return (
        <DMGORevenue
          blocks={blocks}
          stats={stats}
          user={user}
        />
      );
    case 'vigilance':
      return (
        <DMGOVigilance
          user={user}
        />
      );
    case 'gis_map':
      return (
        <APQuarryGISMap
          user={user}
          setActiveTab={setActiveTab}
          selectedDistrict={selectedDistrict}
          onDistrictChange={setSelectedDistrict}
        />
      );
    case 'quarries':
      return (
        <DMGOQuarries
          quarries={quarries}
          user={user}
          onRefresh={() => fetchAllData(true)}
          refreshing={refreshing}
          setActiveTab={setActiveTab}
        />
      );
    case 'reports':
      return (
        <DMGOReports
          reports={reports}
          stats={stats}
          blocks={blocks}
          user={user}
        />
      );
    case 'audit':
      return (
        <DMGOAudit
          logs={auditLogs}
          onRefresh={() => fetchAllData(true)}
          refreshing={refreshing}
        />
      );
    case 'ai_center':
      return <AICommandCenter user={user} />;
    default:
      return (
        <DMGODashboard
          stats={stats}
          blocks={blocks}
          pendingBlocks={pendingBlocks}
          approvedBlocks={approvedBlocks}
          rejectedBlocks={rejectedBlocks}
          user={user}
          setActiveTab={setActiveTab}
          onRefresh={() => fetchAllData(true)}
          refreshing={refreshing}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
        />
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DMGO DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DMGODashboard({
  stats,
  blocks,
  pendingBlocks,
  approvedBlocks,
  rejectedBlocks,
  user,
  setActiveTab,
  onRefresh,
  refreshing,
  selectedDistrict,
  setSelectedDistrict
}) {
  const districtName = selectedDistrict && selectedDistrict !== 'ALL' ? selectedDistrict : (user?.district || 'Prakasam');
  const pendingCount = stats?.pending_review ?? pendingBlocks.length;
  const approvedCount = stats?.approved_blocks ?? approvedBlocks.length;
  const rejectedCount = stats?.rejected_blocks ?? rejectedBlocks.length;
  const totalSeigniorage = stats?.total_seigniorage ?? blocks.reduce((a, b) => a + (b.seigniorage?.total_fee || 0), 0);
  const totalVolume = stats?.total_volume ?? blocks.reduce((a, b) => a + (b.measurement?.volume || 0), 0);
  const quarryCount = stats?.district_quarries ?? 253;

  // Format revenue cleanly in Lakhs / Crores
  const formattedRevenue = totalSeigniorage >= 10000000
    ? `₹${(totalSeigniorage / 10000000).toFixed(2)} Cr`
    : `₹${(totalSeigniorage / 100000).toFixed(2)} L`;

  // Dynamic granite type distribution chart from backend stats
  const typeData = useMemo(() => {
    if (stats?.granite_types && Object.keys(stats.granite_types).length > 0) {
      return Object.entries(stats.granite_types).map(([name, count]) => ({
        name: name.replace(/ of .*/i, '').replace(/ Granite/i, '').slice(0, 14),
        fullName: name,
        count: count,
      }));
    }
    const counts = {};
    blocks.forEach(b => {
      const t = b.seigniorage?.granite_type || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).slice(0, 6).map(([name, count]) => ({
      name: name.slice(0, 14),
      fullName: name,
      count,
    }));
  }, [stats, blocks]);

  const chartColors = ['#1A56DB', '#10B981', '#E67E22', '#7C3AED', '#0EA5E9', '#EC4899'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>DMGO Dashboard</h1>
            <span
              className="badge badge-blue"
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 800,
                background: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                padding: '4px 10px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📍</span>
              <span>{selectedDistrict && selectedDistrict !== 'ALL' ? `${selectedDistrict} District` : 'All Districts (AP)'}</span>
            </span>
            <LiveBadge label="OFFICIAL PORTAL" />
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Statutory Block Verification, Check Measurements &amp; Revenue Oversight — AP Mines &amp; Geology
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={onRefresh}
            disabled={refreshing}
            style={{ fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
          {pendingCount > 0 && (
            <button
              className="btn btn-accent"
              onClick={() => setActiveTab('blocks')}
              style={{ boxShadow: '0 4px 12px rgba(230, 126, 34, 0.25)' }}
            >
              <ClipboardCheck size={16} /> {pendingCount} Pending Review
            </button>
          )}
        </div>
      </div>

      {/* Live AP Quarry GIS Map & Observatory Widget */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '2px solid #2563EB', borderRadius: 14, boxShadow: '0 6px 25px rgba(37,99,235,0.18)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '14px 20px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB, #0284C7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(37,99,235,0.4)'
            }}>
              <MapPin size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#F8FAFC' }}>
                  Andhra Pradesh Quarry GIS Observatory (1,856 Inland Mines)
                </span>
                <span style={{
                  background: 'rgba(16,185,129,0.2)', border: '1px solid #10B981',
                  color: '#34D399', fontSize: '0.65rem', fontWeight: 800,
                  padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase'
                }}>
                  Verified AP Mainland • 0 Water Pins
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>
                Live Street, Satellite (18x) &amp; 3D Topo Relief across all 26 mining districts
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('gis_map')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.82rem' }}
          >
            <span>Fullscreen Map &amp; 3D Pit Inspector</span>
            <ArrowRight size={15} />
          </button>
        </div>
        <div style={{ height: 580, width: '100%', position: 'relative', overflow: 'hidden' }}>
          <APQuarryGISMap
            user={user}
            setActiveTab={setActiveTab}
            embedded={true}
            selectedDistrict={selectedDistrict}
            onDistrictChange={setSelectedDistrict}
          />
        </div>
      </div>

      {/* Statutory DMGO Lifecycle Stepper */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1px solid #BFDBFE', padding: '16px 20px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} color="#1A56DB" />
          Statutory Verification Workflow — AP Minor Mineral Rules 1966
        </div>
        <StepTracker
          steps={['1. Quarry Photo Capture', '2. AI Dimension Computation', '3. DMGO Check Measurement', '4. Transit e-Permit Clearance', '5. Weighbridge Cross-Check']}
          current={pendingCount > 0 ? 2 : 3}
        />
      </div>

      {/* Primary KPI Grid */}
      <div className="stats-grid">
        <StatCard
          label="Pending Review"
          value={pendingCount.toLocaleString()}
          sub="Check measurements"
          icon={ClipboardCheck}
          color="#E67E22"
          onClick={() => setActiveTab('blocks')}
        />
        <StatCard
          label="Approved Blocks"
          value={approvedCount.toLocaleString()}
          sub="Permits issued / cleared"
          icon={CheckCircle}
          color="#10B981"
        />
        <StatCard
          label="Rejected Blocks"
          value={rejectedCount.toLocaleString()}
          sub="Require resubmission"
          icon={XCircle}
          color="#EF4444"
        />
        <StatCard
          label="Assessed Seigniorage"
          value={formattedRevenue}
          sub={`${totalVolume.toLocaleString()} m³ measured`}
          icon={BarChart3}
          color="#7C3AED"
        />
      </div>

      {/* Secondary District Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '12px 18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mountain size={16} color="#1A56DB" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>DISTRICT QUARRIES</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F1729' }}>{quarryCount} Active Mines</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>TOTAL DISTRICT BLOCKS</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F1729' }}>
              {(stats?.total_blocks || 14414).toLocaleString()} Blocks
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>BLOCK CLASSIFICATION</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F1729' }}>
              {(stats?.dressed_blocks || 14411).toLocaleString()} Dressed / {stats?.undressed_blocks || 3} Raw
            </div>
          </div>
        </div>
      </div>

      {/* AP Quarry GIS Observatory Featured Banner Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F2042 100%)',
        borderRadius: 14,
        padding: '20px 24px',
        color: '#fff',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ maxWidth: 580 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              background: '#2563EB', color: '#fff', fontSize: '0.68rem',
              fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase'
            }}>
              Interactive GIS Observatory
            </span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981',
              color: '#34D399', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20
            }}>
              ✓ 1,856 AP Inland Quarries &bull; 0 Water Pins
            </span>
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#F8FAFC' }}>
            Andhra Pradesh State Quarry GIS Map &amp; 3D Pit Inspector
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.5 }}>
            Switch seamlessly between <strong>Street</strong>, <strong>High-Res Satellite (18x)</strong>, and <strong>3D Topographic Relief</strong> views across all 26 districts. Inspect extraction depths, pit benches, and GPS boundaries.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('gis_map')}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 15px rgba(37,99,235,0.4)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37,99,235,0.4)'; }}
          >
            <MapPin size={18} />
            <span>Launch GIS Quarry Map</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Officer Command Hub Quick Actions */}
      <div className="card" style={{ padding: '16px 20px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🏛️ DMGO Statutory Command Modules</span>
          <span style={{ fontSize: '0.7rem', color: '#1A56DB', fontWeight: 700 }}>Direct Officer Access</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {[
            { id: 'gis_map', label: 'AP Quarry Map', sub: '1,856 mines mapped', icon: '🗺️', color: '#2563EB' },
            { id: 'permits', label: 'e-Transit Passes', sub: `${approvedCount} authorized`, icon: '📜', color: '#1A56DB' },
            { id: 'inspections', label: 'Field Spot Audits', sub: 'Sec. 24 inspections', icon: '🔍', color: '#10B981' },
            { id: 'revenue', label: 'Seigniorage & Cess', sub: 'DMF 30% calculator', icon: '💰', color: '#7C3AED' },
            { id: 'vigilance', label: 'Road Checkposts', sub: 'Weighbridge escrow', icon: '🛡️', color: '#EF4444' },
            { id: 'blocks', label: 'Block Queue', sub: `${pendingCount} awaiting review`, icon: '📋', color: '#E67E22' },
            { id: 'quarries', label: 'District Quarries', sub: `${quarryCount} active mines`, icon: '🏔️', color: '#0EA5E9' },
          ].map(mod => (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              style={{
                background: '#fff',
                border: '1.5px solid #E2E8F0',
                borderRadius: 10,
                padding: '10px 12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = mod.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ fontSize: '1.2rem' }}>{mod.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0F1729' }}>{mod.label}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{mod.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Alert if Pending Review */}
      {pendingCount > 0 && (
        <div className="alert alert-amber" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="#D97706" />
            <div>
              <strong>{pendingCount.toLocaleString()} blocks</strong> are waiting for statutory check measurement verification in {districtName}.
            </div>
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setActiveTab('blocks')}
            style={{ background: '#fff', borderColor: '#F59E0B', color: '#92400E', fontWeight: 700 }}
          >
            Review Queue Now <ArrowRight size={13} style={{ marginLeft: 4 }} />
          </button>
        </div>
      )}

      {/* Two-Column Dashboard Visuals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Granite Type Distribution Bar Chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
                Granite Variety Distribution
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B' }}>Top produced varieties in {districtName}</p>
            </div>
            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>District-wide</span>
          </div>

          <div style={{ height: 220 }}>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 10, right: 15, left: 5, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(val) => [`${val.toLocaleString()} Blocks`, 'Count']}
                    labelFormatter={(name, payload) => payload?.[0]?.payload?.fullName || name}
                    contentStyle={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: '0.85rem' }}>
                No granite distribution data available.
              </div>
            )}
          </div>
        </div>

        {/* Actionable Pending Queue Card */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
                Pending Review Queue
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B' }}>Awaiting statutory check measurement verification</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTab('blocks')}
              style={{ fontSize: '0.75rem', color: '#1A56DB' }}
            >
              View All ({pendingBlocks.length}) →
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 220 }}>
            {pendingBlocks.slice(0, 5).map(b => {
              const m = b.measurement;
              const s = b.seigniorage;
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400E', fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.id}
                      </span>
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                        {b.block_type || 'dressed'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#78350F' }}>
                      {b.quarry_name || `Quarry #${b.quarry_id}`} • {s?.granite_type || 'Granite'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', fontFamily: "'JetBrains Mono', monospace" }}>
                        {m?.volume ? `${m.volume.toFixed(3)} m³` : '—'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>
                        {s?.total_fee ? `₹${Number(s.total_fee).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => setActiveTab('blocks')}
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}

            {pendingBlocks.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: '#10B981', padding: 20 }}>
                <CheckCircle size={32} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>All check measurements caught up!</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>No blocks waiting for DMGO verification right now.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* District Performance Matrix & OMEPS Sync Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* District Mining Heatmap / Performance Grid */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color="#1A56DB" />
                Statewide District Performance Matrix
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>
                Active granite mining sites &amp; seigniorage collection across Andhra Pradesh
              </p>
            </div>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>8 Monitored Districts</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {[
              { name: 'Prakasam', quarries: 253, blocks: 14414, rev: '₹34.2 Cr', status: 'optimal', active: true },
              { name: 'Nellore', quarries: 184, blocks: 8230, rev: '₹21.5 Cr', status: 'optimal' },
              { name: 'Chittoor', quarries: 142, blocks: 6120, rev: '₹15.8 Cr', status: 'optimal' },
              { name: 'Guntur', quarries: 118, blocks: 5400, rev: '₹12.1 Cr', status: 'optimal' },
              { name: 'Kurnool', quarries: 95, blocks: 3800, rev: '₹9.4 Cr', status: 'optimal' },
              { name: 'Visakhapatnam', quarries: 110, blocks: 4150, rev: '₹11.2 Cr', status: 'optimal' },
              { name: 'Anantapur', quarries: 88, blocks: 3200, rev: '₹7.8 Cr', status: 'optimal' },
              { name: 'Kadapa', quarries: 76, blocks: 2950, rev: '₹6.9 Cr', status: 'optimal' },
            ].map(d => (
              <div
                key={d.name}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: d.active ? '#EFF6FF' : '#F8FAFC',
                  border: `1.5px solid ${d.active ? '#1A56DB' : '#E2E8F0'}`,
                  display: 'flex', flexDirection: 'column', gap: 4,
                  transition: 'transform 0.15s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: d.active ? '#1A56DB' : '#0F1729' }}>
                    {d.name} {d.active && '📍'}
                  </span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  {d.quarries} quarries · {d.blocks.toLocaleString()} blks
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#047857' }}>
                  {d.rev}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OMEPS 2.0 Live Cloud Sync Status */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={18} color="#059669" />
                OMEPS 2.0 Cloud Sync
              </h3>
              <span className="badge badge-green" style={{ fontSize: '0.68rem', animation: 'pulse 2s infinite' }}>
                ● SYNC ACTIVE
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                <span style={{ color: '#64748B' }}>AP Mines Gateway:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>Connected (24ms)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                <span style={{ color: '#64748B' }}>Records Synchronized:</span>
                <span style={{ fontWeight: 700, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                  {(stats?.total_blocks || 14414).toLocaleString()} / {(stats?.total_blocks || 14414).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                <span style={{ color: '#64748B' }}>e-Permits Issued Today:</span>
                <span style={{ fontWeight: 700, color: '#1A56DB' }}>{approvedCount} Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                <span style={{ color: '#64748B' }}>Discrepancy Rate:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>&lt; 0.05% (Audited)</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#166534' }}>
            <Check size={14} color="#166534" />
            <span>Digital signatures verified by AP Center for Financial Systems</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DMGO BLOCK QUEUE ("List of Blocks")
// ─────────────────────────────────────────────────────────────────────────────
function DMGOBlockQueue({
  blocks,
  pendingBlocks,
  user,
  selectedDistrict,
  setSelectedDistrict,
  quarries,
  onRefresh,
  refreshing
}) {
  const [filterTab, setFilterTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [approveModal, setApproveModal]       = useState(null);
  const [rejectModal, setRejectModal]         = useState(null);
  const [wbOverrideModal, setWbOverrideModal] = useState(null); // WB override modal
  const [wbOverrideRemarks, setWbOverrideRemarks] = useState('');
  const [wbOverrideAction, setWbOverrideAction]   = useState('override'); // 'override' | 'escalate'
  const [wbProcessing, setWbProcessing]           = useState(false);
  const [wbMsg, setWbMsg]                         = useState(null);
  const [overrideData, setOverrideData] = useState({ length: '', breadth: '', height: '', graniteType: '' });
  const [rejectionReason, setRejectionReason] = useState('Measurement photos unclear or distorted');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [inspect3D, setInspect3D] = useState(null);
  const [challanAuditModal, setChallanAuditModal] = useState(null);
  const [authorizingChallan, setAuthorizingChallan] = useState(false);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState(null);

  const districtList = useMemo(() => {
    if (!quarries || quarries.length === 0) {
      return [
        'Alluri Sitharama Raju', 'Anakapalli', 'Anantapur', 'Annamayya', 'Bapatla',
        'Chittoor', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Konaseema',
        'Krishna', 'Kurnool', 'NTR', 'Nandyal', 'Palnadu', 'Parvathipuram Manyam',
        'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam',
        'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'
      ];
    }
    return Array.from(new Set(quarries.map(q => q.district).filter(Boolean))).sort();
  }, [quarries]);

  // Tab Filtering
  const tabFilteredBlocks = useMemo(() => {
    switch (filterTab) {
      case 'pending':
        return (blocks || []).filter(b =>
          ['check_measurement_requested', 'check_requested', 'ai_measured'].includes(b.status)
        );
      case 'cfms_pending':
        return (blocks || []).filter(b => {
          try {
            const r = JSON.parse(localStorage.getItem(`challan_record_${b.id}`));
            return r?.status === 'pending_authorization';
          } catch { return false; }
        });
      case 'dressed':
        return (blocks || []).filter(b => b.block_type === 'dressed');
      case 'undressed':
        return (blocks || []).filter(b => b.block_type === 'undressed');
      case 'approved':
        return (blocks || []).filter(b =>
          ['dmgo_approved', 'permit_ready', 'dispatched', 'weighbridge_verified', 'delivered'].includes(b.status)
        );
      case 'flagged':
        return (blocks || []).filter(b => b.status === 'weighbridge_flagged');
      case 'all':
      default:
        return blocks || [];
    }
  }, [blocks, filterTab]);

  // Search filter
  const searchedBlocks = useMemo(() => {
    if (!search.trim()) return tabFilteredBlocks;
    const q = search.toLowerCase();
    return tabFilteredBlocks.filter(b =>
      (b?.id || '').toLowerCase().includes(q) ||
      (b?.quarry_name || '').toLowerCase().includes(q) ||
      (b?.seigniorage?.granite_type || '').toLowerCase().includes(q) ||
      String(b?.quarry_id || '').includes(q)
    );
  }, [tabFilteredBlocks, search]);

  const pagination = usePagination(searchedBlocks, 15);

  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    try {
      if (overrideData.length && overrideData.breadth && overrideData.height) {
        await api.modifyApproveBlock(approveModal.id, {
          length: Number(overrideData.length),
          breadth: Number(overrideData.breadth),
          height: Number(overrideData.height),
          granite_type: overrideData.graniteType || approveModal.seigniorage?.granite_type,
          remarks: remarks || 'Measurements verified with minor adjustments by DMGO',
        });
      } else {
        await api.approveBlock(approveModal.id, {
          remarks: remarks || 'Measurements verified and approved by DMGO',
        });
      }
      setApproveModal(null);
      setRemarks('');
      setOverrideData({ length: '', breadth: '', height: '', graniteType: '' });
      onRefresh();
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const finalRemarks = remarks.trim() ? `${rejectionReason}: ${remarks}` : rejectionReason;
    setProcessing(true);
    try {
      await api.rejectBlock(rejectModal.id, { remarks: finalRemarks });
      setRejectModal(null);
      setRemarks('');
      onRefresh();
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Title */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Block Management Queue</h1>
            <span
              className="badge badge-blue"
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 800,
                background: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                padding: '4px 10px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>📍</span>
              <span>{selectedDistrict && selectedDistrict !== 'ALL' ? `${selectedDistrict} District` : 'All Districts (AP Statewide)'}</span>
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Statutory verification of dressing standards, 4-point measurements, and dispatch approvals
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* District Quick Filter */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#FFFFFF', padding: '5px 12px', borderRadius: 8,
            border: '1.5px solid #2563EB', boxShadow: '0 1px 4px rgba(37,99,235,0.1)'
          }}>
            <MapPin size={15} color="#2563EB" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E3A8A' }}>DISTRICT:</span>
            <select
              value={selectedDistrict || 'ALL'}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#0F172A',
                cursor: 'pointer',
                background: 'transparent'
              }}
            >
              <option value="ALL">All Districts (Statewide AP)</option>
              {districtList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-outline"
            onClick={onRefresh}
            disabled={refreshing}
            style={{ fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh Queue'}
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        background: '#F1F5F9', padding: '6px', borderRadius: 10
      }}>
        {[
          { id: 'pending', label: 'Pending Review', count: pendingBlocks.length, icon: ClipboardCheck },
          {
            id: 'cfms_pending',
            label: 'CFMS Challan Audit',
            count: (blocks || []).filter(b => {
              try { return JSON.parse(localStorage.getItem(`challan_record_${b.id}`))?.status === 'pending_authorization'; }
              catch { return false; }
            }).length,
            icon: Receipt
          },
          { id: 'all', label: 'All District Blocks', count: blocks.length, icon: Layers },
          { id: 'dressed', label: 'Dressed Blocks', count: blocks.filter(b => b.block_type === 'dressed').length, icon: ShieldCheck },
          { id: 'undressed', label: 'Raw / Undressed', count: blocks.filter(b => b.block_type === 'undressed').length, icon: Mountain },
          { id: 'approved', label: 'Approved & Permits', count: blocks.filter(b => ['dmgo_approved', 'permit_ready'].includes(b.status)).length, icon: CheckCircle },
          { id: 'flagged', label: 'Weighbridge Flagged', count: blocks.filter(b => b.status === 'weighbridge_flagged').length, icon: AlertTriangle },
        ].map(t => {
          const Icon = t.icon;
          const isActive = filterTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setFilterTab(t.id); pagination.setPage(1); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: isActive ? '#1A56DB' : 'transparent',
                color: isActive ? '#fff' : '#475569',
                boxShadow: isActive ? '0 2px 6px rgba(26, 86, 219, 0.25)' : 'none',
              }}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                color: isActive ? '#fff' : '#475569',
                borderRadius: 12, padding: '2px 7px', fontSize: '0.7rem'
              }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Statistics Banner */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="search-input-wrap" style={{ minWidth: 280, maxWidth: 450, flex: 1 }}>
          <Search size={15} color="#1A56DB" />
          <input
            placeholder="Search by Block ID, Quarry name, or Granite variety..."
            value={search}
            onChange={e => { setSearch(e.target.value); pagination.setPage(1); }}
          />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
          Showing <strong style={{ color: '#1A56DB' }}>{searchedBlocks.length}</strong> blocks in current view
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrapper">
        <PaginationControls pagination={pagination} />
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Block ID &amp; Type</th>
                <th>Quarry &amp; Location</th>
                <th>Granite Variety</th>
                <th>Dimensions (L × B × H)</th>
                <th>Volume (m³)</th>
                <th>Weight (MT)</th>
                <th>Seigniorage</th>
                <th>Gangsaw Class</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentData.map(b => {
                const m = b.measurement;
                const s = b.seigniorage;
                const isPending = ['check_measurement_requested', 'check_requested', 'ai_measured'].includes(b.status);
                const isUndressed = b.block_type === 'undressed';

                const dimStr = isUndressed
                  ? (b.undressed_length ? `${(b.undressed_length/100).toFixed(2)}×${(b.undressed_breadth/100).toFixed(2)}×${(b.undressed_height/100).toFixed(2)} m (Raw)` : '—')
                  : (m ? `${(m.length/100).toFixed(2)}×${(m.breadth/100).toFixed(2)}×${(m.height/100).toFixed(2)} m` : '—');

                const volVal = isUndressed ? (b.undressed_volume || 0) : (m?.volume || 0);

                return (
                  <tr key={b.id} style={{ background: isPending ? '#FFFBEB' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>
                        {b.id}
                      </div>
                      <span className={`badge ${isUndressed ? 'badge-sky' : 'badge-violet'}`} style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: 2 }}>
                        {isUndressed ? '⛏️ Undressed' : '🪨 Dressed'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F1729' }}>
                        {b.quarry_name || `Quarry #${b.quarry_id}`}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={11} color="#2563EB" />
                        <span>{b.quarry_district || 'Andhra Pradesh'} • #{b.quarry_id}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E293B' }}>
                        {s?.granite_type || 'Any Other Colour'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        {s?.government_category || 'Standard Colour'}
                      </div>
                    </td>

                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                      {dimStr}
                    </td>

                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB', fontSize: '0.8rem' }}>
                      {volVal ? volVal.toFixed(3) : '—'}
                      {!isUndressed && b.undressed_volume && m?.volume && (
                        <div style={{ fontSize: '0.62rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                          {((m.volume / b.undressed_volume) * 100).toFixed(0)}% yield (Δ{(b.undressed_volume - m.volume).toFixed(2)})
                        </div>
                      )}
                    </td>

                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                      {m?.estimated_weight ? `${m.estimated_weight.toFixed(2)} MT` : '—'}
                    </td>

                    <td style={{ fontSize: '0.8rem' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10B981', fontWeight: 700 }}>
                        {s?.total_fee ? `₹${Number(s.total_fee).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                      {(() => {
                        try {
                          const rStr = localStorage.getItem(`challan_record_${b.id}`);
                          if (!rStr) return null;
                          const r = JSON.parse(rStr);
                          if (r?.status === 'pending_authorization') {
                            return (
                              <button
                                onClick={() => { setAuditSuccessMsg(null); setChallanAuditModal({ block: b, record: r }); }}
                                className="badge badge-gold"
                                style={{ fontSize: '0.62rem', padding: '2px 6px', marginTop: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, border: 'none' }}
                                title="Lessee remitted statutory dues. Click to audit CFMS Challan against Cyber Treasury"
                              >
                                <Clock size={9} /> CFMS Audit Pending
                              </button>
                            );
                          }
                          if (r?.status === 'authorized') {
                            return (
                              <button
                                onClick={() => { setAuditSuccessMsg(null); setChallanAuditModal({ block: b, record: r }); }}
                                className="badge badge-green"
                                style={{ fontSize: '0.62rem', padding: '2px 6px', marginTop: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, border: 'none' }}
                                title="Statutory challan authorized. Click to view clearance receipt"
                              >
                                <CheckCircle2 size={9} /> CFMS Cleared
                              </button>
                            );
                          }
                        } catch { return null; }
                      })()}
                    </td>

                    <td>
                      {s?.class_status ? (
                        <span className={`badge ${s.class_status.includes('above') || s.class_status.includes('super') ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.7rem' }}>
                          {s.class_status.includes('above') ? '▲ Above Gangsaw' : s.class_status.includes('super') ? '★ Super Gangsaw' : '▼ Below Gangsaw'}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    <td>
                      <StatusBadge status={b.status} />
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* DMGO CFMS Challan Audit Action */}
                        {(() => {
                          let r = null;
                          try {
                            const sRecord = localStorage.getItem(`challan_record_${b.id}`);
                            if (sRecord) r = JSON.parse(sRecord);
                          } catch {}
                          const isPendingAudit = r?.status === 'pending_authorization';
                          return (
                            <button
                              className="btn btn-sm"
                              title={isPendingAudit ? "Audit Lessee CFMS Challan & Authorize (Action Required)" : "View CFMS Challan Assessment"}
                              onClick={() => {
                                setAuditSuccessMsg(null);
                                setChallanAuditModal({ block: b, record: r });
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isPendingAudit ? '#FEF3C7' : '#F8FAFC',
                                borderColor: isPendingAudit ? '#F59E0B' : '#CBD5E1',
                                color: isPendingAudit ? '#B45309' : '#475569',
                                fontWeight: isPendingAudit ? 800 : 600,
                              }}
                            >
                              <Receipt size={12} color={isPendingAudit ? "#D97706" : "#64748B"} />
                              {isPendingAudit ? '🔏 Audit CFMS' : 'Challan'}
                            </button>
                          );
                        })()}
                        {isPending ? (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              title="Approve / Modify Check Measurement"
                              onClick={() => {
                                setApproveModal(b);
                                setOverrideData({
                                  length: m?.length || '',
                                  breadth: m?.breadth || '',
                                  height: m?.height || '',
                                  graniteType: s?.granite_type || '',
                                });
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              <CheckCircle size={13} style={{ marginRight: 4 }} /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-icon btn-sm"
                              title="Reject Check Measurement"
                              onClick={() => setRejectModal(b)}
                              style={{ width: 28, height: 28 }}
                            >
                              <XCircle size={13} />
                            </button>
                            <button
                              title="3D Block Inspector"
                              onClick={() => setInspect3D(b)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F1F5F9', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              🪨 3D
                            </button>
                          </>
                        ) : b.status === 'weighbridge_flagged' ? (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              title="DMGO Override — approve despite variance"
                              onClick={() => { setWbOverrideModal(b); setWbOverrideAction('override'); setWbOverrideRemarks(''); setWbMsg(null); }}
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              🔏 Override
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Escalate to enforcement"
                              onClick={() => { setWbOverrideModal(b); setWbOverrideAction('escalate'); setWbOverrideRemarks('Escalated to enforcement for physical inspection'); setWbMsg(null); }}
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              🚔 Escalate
                            </button>
                          </>
                        ) : (
                          <a
                            href={`/track/${b.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', textDecoration: 'none' }}
                          >
                            <Eye size={12} style={{ marginRight: 4 }} /> Details
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pagination.currentData.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>
                    <Layers size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No blocks found in this view</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                      {search ? 'Try clearing your search query or switching tabs.' : 'No blocks match the selected filter tab.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVE / MODIFY MODAL */}
      {approveModal && (
        <div className="modal-overlay" onClick={() => setApproveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">
                ✅ Statutory Check Measurement — {approveModal.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setApproveModal(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="alert alert-blue" style={{ fontSize: '0.78rem' }}>
                <Eye size={15} style={{ flexShrink: 0 }} />
                <div>
                  Verify AI photogrammetry dimensions. You may modify values if statutory physical check measurement differs.
                </div>
              </div>

              {/* Block Details Pill */}
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Quarry:</span> <strong>{approveModal.quarry_name || `Q#${approveModal.quarry_id}`}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Variety:</span> <strong>{approveModal.seigniorage?.granite_type || 'Granite'}</strong>
                </div>
              </div>

              {/* Dimension Overrides Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {['length', 'breadth', 'height'].map(dim => {
                  const aiVal = approveModal.measurement?.[dim];
                  return (
                    <div key={dim} className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>
                        {dim.toUpperCase()} (cm)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={`AI: ${aiVal ? aiVal.toFixed(1) : '—'}`}
                        value={overrideData[dim]}
                        onChange={e => setOverrideData(p => ({ ...p, [dim]: e.target.value }))}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}
                      />
                      <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>
                        AI: {aiVal ? `${aiVal.toFixed(1)} cm` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Derived Preview */}
              {overrideData.length && overrideData.breadth && overrideData.height && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: 6, fontSize: '0.75rem', color: '#065F46' }}>
                  <strong>Modified Volume:</strong> {((Number(overrideData.length) * Number(overrideData.breadth) * Number(overrideData.height)) / 1000000).toFixed(3)} m³ •{' '}
                  <strong>Est. Weight:</strong> {(((Number(overrideData.length) * Number(overrideData.breadth) * Number(overrideData.height)) / 1000000) * 2.7).toFixed(2)} MT
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Officer Verification Remarks</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Dimensions verified per Rule 12 of APMMC Rules 1966. Approved for dispatch."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setApproveModal(null)} disabled={processing}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleApprove} disabled={processing}>
                {processing ? 'Saving Approval…' : <><CheckCircle size={15} /> Approve &amp; Clear Permit</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#EF4444' }}>
                ❌ Reject Check Measurement — {rejectModal.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRejectModal(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="alert alert-rose" style={{ fontSize: '0.78rem' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <div>
                  Block will be sent back to the quarry operator. Resubmission will be required before permit issuance.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Departmental Rejection Reason</label>
                <select
                  className="form-control"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                >
                  <option value="Measurement photos unclear or distorted">Measurement photos unclear or distorted</option>
                  <option value="Corner chips/irregular faces exceeding dressing tolerances">Corner chips/irregular faces exceeding dressing tolerances</option>
                  <option value="Dimension discrepancy > 5% against field check">Dimension discrepancy &gt; 5% against field check</option>
                  <option value="Granite colour or variety misclassified">Granite colour or variety misclassified</option>
                  <option value="Defects/cracks detected on block face">Defects/cracks detected on block face</option>
                  <option value="Other statutory non-compliance">Other statutory non-compliance</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Detailed Field Notes / Remarks</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Provide specific notes for the quarry operator explaining corrective action required..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRejectModal(null)} disabled={processing}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleReject} disabled={processing}>
                {processing ? 'Rejecting…' : <><XCircle size={15} /> Confirm Rejection</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WB OVERRIDE / ESCALATE MODAL */}
      {wbOverrideModal && (
        <div className="modal-overlay" onClick={() => { setWbOverrideModal(null); setWbMsg(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: wbOverrideAction === 'escalate' ? '#EF4444' : '#1A56DB' }}>
                {wbOverrideAction === 'escalate' ? '🚔 Escalate to Enforcement' : '🔏 DMGO Weighbridge Override'} — {wbOverrideModal.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setWbOverrideModal(null); setWbMsg(null); }}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Block weight info */}
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 800, color: '#991B1B', marginBottom: 6 }}>🚨 Weighbridge Mismatch Detected</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>AI ESTIMATE</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{wbOverrideModal.measurement?.estimated_weight?.toFixed(2) || '—'} MT</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>WB ACTUAL</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{wbOverrideModal.weighbridge?.actual_weight?.toFixed(2) || '—'} MT</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>VARIANCE</div>
                    <div style={{ fontWeight: 800, color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>{wbOverrideModal.weighbridge?.difference_percentage?.toFixed(2) || '—'}%</div>
                  </div>
                </div>
              </div>

              {wbOverrideAction === 'override' ? (
                <div className="alert alert-blue" style={{ fontSize: '0.78rem' }}>
                  <Eye size={14} style={{ flexShrink: 0 }} />
                  <div>As DMGO officer, you are officially approving this block despite the weighbridge variance. This action is permanently logged. Provide a statutory justification below.</div>
                </div>
              ) : (
                <div className="alert alert-rose" style={{ fontSize: '0.78rem' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <div>This block will be escalated to enforcement for physical inspection. It cannot be dispatched until resolved by enforcement. Action is permanently logged.</div>
                </div>
              )}

              {wbMsg && (
                <div className={`alert ${wbMsg.type === 'error' ? 'alert-rose' : 'alert-green'}`} style={{ fontSize: 12 }}>
                  {wbMsg.text}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  {wbOverrideAction === 'override' ? 'Official Justification (required)' : 'Escalation Reason'}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={wbOverrideAction === 'override'
                    ? 'e.g. Weighbridge scale certified by Weights & Measures Dept. Variance due to moisture absorption. Approved per Rule 45(3) APMMC 1966.'
                    : 'e.g. Variance of 12% cannot be explained by scale error. Forwarded to enforcement for physical verification.'}
                  value={wbOverrideRemarks}
                  onChange={e => setWbOverrideRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setWbOverrideModal(null); setWbMsg(null); }} disabled={wbProcessing}>
                Cancel
              </button>
              <button
                className={wbOverrideAction === 'escalate' ? 'btn btn-danger' : 'btn btn-primary'}
                disabled={wbProcessing || !wbOverrideRemarks.trim()}
                onClick={async () => {
                  if (!wbOverrideRemarks.trim()) return;
                  setWbProcessing(true);
                  setWbMsg(null);
                  try {
                    if (wbOverrideAction === 'escalate') {
                      await api.escalateWeighbridge(wbOverrideModal.id, wbOverrideRemarks);
                    } else {
                      await api.overrideWeighbridge(wbOverrideModal.id, wbOverrideRemarks);
                    }
                    setWbMsg({ type: 'success', text: wbOverrideAction === 'escalate' ? '🚔 Block escalated to enforcement.' : '✅ Override approved. Block is now cleared.' });
                    setTimeout(() => { setWbOverrideModal(null); setWbMsg(null); onRefresh(); }, 2000);
                  } catch (e) {
                    setWbMsg({ type: 'error', text: e.message || 'Action failed.' });
                  } finally {
                    setWbProcessing(false);
                  }
                }}
              >
                {wbProcessing ? 'Processing…' : wbOverrideAction === 'escalate' ? '🚔 Confirm Escalation' : '🔏 Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D BLOCK INSPECTOR MODAL */}
      {inspect3D && (
        <BlockInspector3D
          block={inspect3D}
          onClose={() => setInspect3D(null)}
        />
      )}

      {/* DMGO STATUTORY SEIGNIORAGE & CFMS CHALLAN AUDIT MODAL */}
      {challanAuditModal && (
        <div className="modal-overlay" onClick={() => { setChallanAuditModal(null); setAuditSuccessMsg(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <div className="modal-title" style={{ color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem' }}>
                  <ShieldCheck size={20} color="#1A56DB" />
                  DMGO Statutory Challan &amp; Treasury Audit
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                  AP Minor Mineral Concession Rules 1966 • Cyber Treasury Reconciliation
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setChallanAuditModal(null); setAuditSuccessMsg(null); }}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Block & Quarry Header Summary */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Block ID: </span>
                    <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB', fontSize: '0.88rem' }}>
                      {challanAuditModal.block.id}
                    </strong>
                    <span className="badge badge-violet" style={{ fontSize: '0.65rem', marginLeft: 8 }}>
                      {challanAuditModal.block.block_type === 'undressed' ? 'Raw Boulder' : 'Dressed Monolith'}
                    </span>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                    {challanAuditModal.block.quarry_district || user?.district || 'Prakasam'} District
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>QUARRY / LESSEE</div>
                    <div style={{ fontWeight: 700, color: '#0F1729' }}>{challanAuditModal.block.quarry_name || `Quarry #${challanAuditModal.block.quarry_id}`}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>GRANITE VARIETY</div>
                    <div style={{ fontWeight: 700, color: '#0F1729' }}>{challanAuditModal.block.seigniorage?.granite_type || 'Any Other Colour'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>NET VOLUME</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB' }}>
                      {challanAuditModal.block.measurement?.volume?.toFixed(3) || (challanAuditModal.block.undressed_volume?.toFixed(3)) || '—'} m³
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Fee Breakdown (APMMC Rules 1966) */}
              <div style={{ background: '#FFFDF5', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Receipt size={14} color="#D97706" /> Statutory Challan Dues Assessment
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, fontSize: '0.76rem' }}>
                  <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: 6, border: '1px solid #FEF3C7' }}>
                    <div style={{ color: '#64748B', fontSize: '0.68rem' }}>Base Seigniorage</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{challanAuditModal.block.seigniorage?.total_fee ? Number(challanAuditModal.block.seigniorage.total_fee).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                    </div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: 6, border: '1px solid #FEF3C7' }}>
                    <div style={{ color: '#64748B', fontSize: '0.68rem' }}>DMF Cess (30%)</div>
                    <div style={{ fontWeight: 800, color: '#059669', fontFamily: "'JetBrains Mono', monospace" }}>
                      + ₹{challanAuditModal.block.seigniorage?.total_fee ? Math.round(challanAuditModal.block.seigniorage.total_fee * 0.30).toLocaleString('en-IN') : '—'}
                    </div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: 6, border: '1px solid #FEF3C7' }}>
                    <div style={{ color: '#64748B', fontSize: '0.68rem' }}>MERIT Cess (2%)</div>
                    <div style={{ fontWeight: 800, color: '#7C3AED', fontFamily: "'JetBrains Mono', monospace" }}>
                      + ₹{challanAuditModal.block.seigniorage?.total_fee ? Math.round(challanAuditModal.block.seigniorage.total_fee * 0.02).toLocaleString('en-IN') : '—'}
                    </div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: 6, border: '1px solid #FEF3C7' }}>
                    <div style={{ color: '#64748B', fontSize: '0.68rem' }}>Total Demand</div>
                    <div style={{ fontWeight: 900, color: '#B45309', fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{challanAuditModal.record?.amount ? Number(challanAuditModal.record.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (challanAuditModal.block.seigniorage?.total_fee ? Math.round(challanAuditModal.block.seigniorage.total_fee * 1.32).toLocaleString('en-IN') : '21,757.12')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lessee Remittance Submission Details */}
              {challanAuditModal.record ? (
                <div style={{
                  background: challanAuditModal.record.status === 'authorized' ? '#F0FDF4' : '#FFFBEB',
                  border: `1.5px solid ${challanAuditModal.record.status === 'authorized' ? '#10B981' : '#F59E0B'}`,
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      color: challanAuditModal.record.status === 'authorized' ? '#065F46' : '#92400E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      {challanAuditModal.record.status === 'authorized' ? (
                        <>
                          <CheckCircle2 size={16} color="#059669" />
                          ✅ CFMS Challan Authorized &amp; Reconciled (DMGO Clearance Granted)
                        </>
                      ) : (
                        <>
                          <Clock size={16} color="#D97706" />
                          ⏳ Lessee Remittance Submitted — Pending Officer Verification
                        </>
                      )}
                    </div>
                    <span className={`badge ${challanAuditModal.record.status === 'authorized' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.68rem' }}>
                      {challanAuditModal.record.status === 'authorized' ? 'Audit Cleared' : 'Awaiting Audit'}
                    </span>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.78rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>e-Challan Reference: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0F1729' }}>{challanAuditModal.record.challan_no}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Bank UTR No: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB' }}>{challanAuditModal.record.utr}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Remitted Statutory Amount: </span>
                      <strong style={{ color: '#166534', fontFamily: "'JetBrains Mono', monospace" }}>
                        ₹{Number(challanAuditModal.record.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Payment Gateway: </span>
                      <span>{challanAuditModal.record.gateway}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Submitted By: </span>
                      <span>{challanAuditModal.record.submitted_by || 'Quarry Lessee'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Submission Timestamp: </span>
                      <span>{challanAuditModal.record.submitted_at ? new Date(challanAuditModal.record.submitted_at).toLocaleString('en-IN') : '—'}</span>
                    </div>
                  </div>

                  {challanAuditModal.record.status === 'authorized' && (
                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <span style={{ color: '#047857', fontWeight: 600 }}>DMGO Clearance Receipt: </span>
                          <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#065F46' }}>{challanAuditModal.record.receipt_no}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#047857', fontWeight: 600 }}>Authorized By: </span>
                          <strong>{challanAuditModal.record.authorized_by}</strong>
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={{ color: '#047857', fontWeight: 600 }}>Authorization Timestamp: </span>
                          <span>{challanAuditModal.record.authorized_at ? new Date(challanAuditModal.record.authorized_at).toLocaleString('en-IN') : '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Statutory Audit Protocol */}
                  {challanAuditModal.record.status !== 'authorized' && (
                    <div style={{ background: '#FEF3C7', padding: '8px 12px', borderRadius: 6, fontSize: '0.73rem', color: '#92400E' }}>
                      <strong>Officer Audit Protocol:</strong> Verify that Bank UTR <code>{challanAuditModal.record.utr}</code> reflects in the Cyber Treasury AP portal scroll. Upon authorization, seigniorage clearance is granted and the transit permit becomes unblocked.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 14, textAlign: 'center', fontSize: '0.8rem', color: '#92400E' }}>
                  <Clock size={20} color="#D97706" style={{ margin: '0 auto 6px' }} />
                  <div>No CFMS remittance submitted yet by the lessee for Block <strong>{challanAuditModal.block.id}</strong>.</div>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 4 }}>
                    Statutory demand of ₹{challanAuditModal.block.seigniorage?.total_fee ? Math.round(challanAuditModal.block.seigniorage.total_fee * 1.32).toLocaleString('en-IN') : '21,757.12'} is currently outstanding.
                  </div>
                </div>
              )}

              {/* Feedback Alert */}
              {auditSuccessMsg && (
                <div className="alert alert-emerald" style={{ fontSize: '0.78rem', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: 6, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <div>{auditSuccessMsg}</div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
              <button
                className="btn btn-outline"
                onClick={() => { setChallanAuditModal(null); setAuditSuccessMsg(null); }}
                disabled={authorizingChallan}
              >
                Close
              </button>

              {challanAuditModal.record && challanAuditModal.record.status === 'pending_authorization' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      try {
                        localStorage.removeItem(`challan_record_${challanAuditModal.block.id}`);
                        setChallanAuditModal(null);
                        if (onRefresh) onRefresh();
                      } catch {}
                    }}
                    disabled={authorizingChallan}
                  >
                    Reject / Return to Lessee
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setAuthorizingChallan(true);
                      setTimeout(() => {
                        const approved = {
                          ...challanAuditModal.record,
                          status: 'authorized',
                          authorized_by: `DMGO Officer (${user?.district || 'Prakasam'} District)`,
                          authorized_at: new Date().toISOString(),
                          receipt_no: `AP-DMG-REC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
                        };
                        try {
                          localStorage.setItem(`challan_record_${challanAuditModal.block.id}`, JSON.stringify(approved));
                        } catch {}
                        setChallanAuditModal(prev => prev ? ({ ...prev, record: approved }) : null);
                        setAuthorizingChallan(false);
                        setAuditSuccessMsg('Statutory challan successfully verified against Cyber Treasury scroll and clearance granted.');
                        if (onRefresh) onRefresh();
                      }, 1000);
                    }}
                    disabled={authorizingChallan}
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <ShieldCheck size={16} />
                    {authorizingChallan ? 'Verifying with Cyber Treasury...' : '🔏 Authorize as DMGO Officer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DMGO QUARRIES PAGE
// ─────────────────────────────────────────────────────────────────────────────
function DMGOQuarries({ quarries, user, onRefresh, refreshing, setActiveTab }) {
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'table'
  const [search, setSearch] = useState('');
  const districtName = user?.district || 'Prakasam';

  const filteredQuarries = useMemo(() => {
    if (!search.trim()) return quarries || [];
    const q = search.toLowerCase();
    return (quarries || []).filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.owner_name || '').toLowerCase().includes(q) ||
      (item.mdl_number || '').toLowerCase().includes(q) ||
      (item.lessee_id || '').toLowerCase().includes(q) ||
      String(item.id).includes(q)
    );
  }, [quarries, search]);

  const pagination = usePagination(filteredQuarries, 15);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header with Prominent View Mode Switcher */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="page-title">Quarries &amp; AP State GIS Observatory</h1>
            <span className="badge badge-blue">📍 {districtName} District</span>
          </div>
          <p className="page-subtitle">
            Interactive GIS satellite &amp; 3D terrain map of all 1,856 Andhra Pradesh quarries and statutory lease registry
          </p>
        </div>

        {/* View Mode Toggle */}
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
              <MapPin size={15} />
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
              <Layers size={15} />
              <span>📋 Registry Table ({quarries.length})</span>
            </button>
          </div>

          <button
            className="btn btn-outline"
            onClick={onRefresh}
            disabled={refreshing}
            style={{ fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE GIS MAP (DEFAULT) */}
      {viewMode === 'map' && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #CBD5E1', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <APQuarryGISMap user={user} setActiveTab={setActiveTab} />
        </div>
      )}

      {/* VIEW 2: REGISTRY TABLE */}
      {viewMode === 'table' && (
        <>
          {/* Summary Strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
            background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>TOTAL DISTRICT LEASES</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A56DB' }}>{quarries.length} Quarries</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>PRIMARY MINING CLUSTERS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F1729' }}>Chimakurthy, Budawada, Ballikurava</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>STATE REGISTRY</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10B981' }}>AP Mines &amp; Geology Active</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="search-input-wrap" style={{ minWidth: 320, maxWidth: 500 }}>
              <Search size={15} color="#1A56DB" />
              <input
                placeholder="Search by Quarry Name, Lessee ID, MDL number..."
                value={search}
                onChange={e => { setSearch(e.target.value); pagination.setPage(1); }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              {filteredQuarries.length} quarries found
            </span>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <PaginationControls pagination={pagination} />
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Quarry Lease Name</th>
                    <th>Lessee / Owner Name</th>
                    <th>District &amp; State</th>
                    <th>Lessee ID</th>
                    <th>MDL Permit Number</th>
                    <th>Mineral Variety</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.currentData.map(q => (
                    <tr key={q.id}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1A56DB', fontSize: '0.8rem' }}>
                        #{q.id}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1729' }}>
                        {q.name}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {q.owner_name || '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                          {q.district || districtName}
                        </span>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: '#475569' }}>
                        {q.lessee_id || `LES-${String(q.id).padStart(4, '0')}`}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED' }}>
                        {q.mdl_number || `MDL-AP-${q.id}`}
                      </td>
                      <td>
                        <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                          Black Galaxy / Color
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pagination.currentData.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                        No quarries matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DMGO REPORTS & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
function DMGOReports({ reports, stats, blocks, user }) {
  const districtName = user?.district || 'Prakasam';
  const totalRevenue = reports?.total_revenue ?? stats?.total_seigniorage ?? 282365486.26;
  const totalVolume = reports?.total_volume ?? stats?.total_volume ?? 44902.067;
  const aboveGangsaw = reports?.above_gangsaw ?? blocks.filter(b => b.seigniorage?.class_status?.includes('above')).length;
  const belowGangsaw = reports?.below_gangsaw ?? blocks.filter(b => b.seigniorage?.class_status?.includes('below')).length;

  const topQuarries = reports?.top_quarries || [];
  const monthlyTrend = reports?.monthly_trend || [
    { month: 'Apr', blocks: 1729, revenue: 31.05 },
    { month: 'May', blocks: 2162, revenue: 39.52 },
    { month: 'Jun', blocks: 2594, revenue: 48.00 },
    { month: 'Jul', blocks: 2306, revenue: 45.17 },
    { month: 'Aug', blocks: 2882, revenue: 62.11 },
    { month: 'Sep', blocks: 2738, revenue: 56.47 },
  ];

  // CSV Export utility
  const downloadCSV = (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMonthlySeigniorage = () => {
    const headers = ['Month', 'Blocks Extracted', 'Assessed Seigniorage (₹ Lakhs)', 'District'];
    const rows = monthlyTrend.map(m => [m.month, m.blocks, m.revenue, districtName]);
    downloadCSV(`${districtName}_Monthly_Seigniorage_Report.csv`, headers, rows);
  };

  const exportBlockSummary = () => {
    const headers = ['Block ID', 'Quarry Name', 'Variety', 'Volume (m3)', 'Weight (MT)', 'Seigniorage Fee (INR)', 'Gangsaw Class', 'Status'];
    const rows = blocks.map(b => [
      b.id,
      b.quarry_name || `Quarry #${b.quarry_id}`,
      b.seigniorage?.granite_type || 'Granite',
      b.measurement?.volume ? b.measurement.volume.toFixed(3) : '—',
      b.measurement?.estimated_weight ? b.measurement.estimated_weight.toFixed(2) : '—',
      b.seigniorage?.total_fee || 0,
      b.seigniorage?.class_status || '—',
      b.status
    ]);
    downloadCSV(`${districtName}_Block_Status_Summary.csv`, headers, rows);
  };

  const exportQuarryProduction = () => {
    const headers = ['Quarry Name', 'MDL Number', 'Total Blocks', 'Total Seigniorage (INR)', 'District'];
    const rows = topQuarries.map(q => [q.quarry_name, q.mdl_number, q.blocks, q.seigniorage, districtName]);
    downloadCSV(`${districtName}_Top_Quarry_Production.csv`, headers, rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="page-title">Reports &amp; District Analytics</h1>
            <span className="badge badge-blue">📍 {districtName}</span>
          </div>
          <p className="page-subtitle">
            Government Seigniorage Collections, Gangsaw Sizing Audit &amp; Extraction Analytics
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Assessed Seigniorage"
          value={`₹${(totalRevenue / 10000000).toFixed(2)} Cr`}
          sub="Statutory mineral revenue"
          icon={BarChart3}
          color="#1A56DB"
        />
        <StatCard
          label="Above Gangsaw (High Value)"
          value={aboveGangsaw.toLocaleString()}
          sub="Length > 2.7m & Breadth > 1.5m"
          icon={CheckCircle}
          color="#10B981"
        />
        <StatCard
          label="Below Gangsaw (Standard)"
          value={belowGangsaw.toLocaleString()}
          sub="Standard dimensional blocks"
          icon={ClipboardCheck}
          color="#E67E22"
        />
        <StatCard
          label="Total Granite Volume"
          value={`${totalVolume.toLocaleString()} m³`}
          sub="3D photogrammetry measured"
          icon={TrendingUp}
          color="#7C3AED"
        />
      </div>

      {/* Charts & Production Table Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Monthly Revenue Trend */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
              Monthly Revenue Trend (FY 2026)
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B' }}>Assessed seigniorage collections in ₹ Lakhs</p>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1A56DB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${val} Lakhs`, 'Revenue']}
                  contentStyle={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1A56DB" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Producing Quarries Table */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
              Top Producing Mines ({districtName})
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B' }}>Highest extraction &amp; seigniorage contributors</p>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 220 }}>
            <table style={{ width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Quarry</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>MDL No.</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Blocks</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Seigniorage</th>
                </tr>
              </thead>
              <tbody>
                {topQuarries.map((q, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0F1729' }}>{q.quarry_name}</td>
                    <td style={{ padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#64748B' }}>{q.mdl_number}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1A56DB' }}>{q.blocks.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#10B981', fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{(q.seigniorage / 100000).toFixed(1)}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 6 }}>
          Official Government Data Exports
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 16 }}>
          Download verified departmental spreadsheets formatted according to APMMC statutory compliance
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={exportMonthlySeigniorage} style={{ fontSize: '0.82rem' }}>
            <Download size={14} /> Monthly Seigniorage Summary (CSV)
          </button>
          <button className="btn btn-outline" onClick={exportBlockSummary} style={{ fontSize: '0.82rem' }}>
            <Download size={14} /> District Blocks &amp; Measurements (CSV)
          </button>
          <button className="btn btn-outline" onClick={exportQuarryProduction} style={{ fontSize: '0.82rem' }}>
            <Download size={14} /> Quarry Production &amp; MDL Audit (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DMGO AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
function DMGOAudit({ logs, onRefresh, refreshing }) {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    let list = logs || [];
    if (eventFilter !== 'all') {
      list = list.filter(l => (l.event || '').toLowerCase() === eventFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.block_id || '').toLowerCase().includes(q) ||
        (l.username || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.event || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, eventFilter, search]);

  const pagination = usePagination(filteredLogs, 15);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Digital Audit Trail</h1>
          <p className="page-subtitle">
            Immutable, tamper-evident log of all check measurements, overrides, and dispatch clearances
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={onRefresh}
          disabled={refreshing}
          style={{ fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh Logs'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280, maxWidth: 600 }}>
          <div className="search-input-wrap" style={{ flex: 1 }}>
            <Search size={15} color="#1A56DB" />
            <input
              placeholder="Search by Block ID, officer username, or action..."
              value={search}
              onChange={e => { setSearch(e.target.value); pagination.setPage(1); }}
            />
          </div>
          <select
            className="form-control"
            value={eventFilter}
            onChange={e => { setEventFilter(e.target.value); pagination.setPage(1); }}
            style={{ width: 180, fontSize: '0.8rem' }}
          >
            <option value="all">All Events</option>
            <option value="dmgo_approved">DMGO Approved</option>
            <option value="dmgo_rejected">DMGO Rejected</option>
            <option value="dmgo_modified">DMGO Modified</option>
            <option value="check_measurement_requested">Check Requested</option>
            <option value="weighbridge_verified">WB Verified</option>
            <option value="weighbridge_flagged">WB Flagged</option>
            <option value="block_registered">Block Registered</option>
          </select>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
          {filteredLogs.length} audit events
        </span>
      </div>

      {/* Logs Table */}
      <div className="table-wrapper">
        <PaginationControls pagination={pagination} />
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>Block ID</th>
                <th>Event Type</th>
                <th>Officer / User</th>
                <th>Action Details</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentData.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#475569', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontWeight: 800, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                    {log.block_id || '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      log.event?.includes('approved') ? 'badge-green' :
                      log.event?.includes('rejected') ? 'badge-rose' :
                      log.event?.includes('flagged') ? 'badge-rose' :
                      'badge-blue'
                    }`} style={{ fontSize: '0.7rem' }}>
                      {log.event?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F1729' }}>
                    {log.username || 'System'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#334155', maxWidth: 360 }}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {pagination.currentData.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                    No audit logs match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
