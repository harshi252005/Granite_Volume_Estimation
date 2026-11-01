import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import {
  FileText, Layers, IndianRupee, Mountain, Truck, Scale,
  Download, Printer, Search, RefreshCw, CheckCircle2,
  FileSpreadsheet, ChevronRight
} from 'lucide-react';

const REPORT_TABS = [
  {
    id: 'block_status',
    title: 'Block Status Report',
    subtitle: 'Click to export as PDF/CSV',
    icon: Layers,
    color: '#1A56DB',
    badge: 'Inventory'
  },
  {
    id: 'seigniorage',
    title: 'Seigniorage Summary',
    subtitle: 'Click to export as PDF/CSV',
    icon: IndianRupee,
    color: '#E67E22',
    badge: 'Revenue'
  },
  {
    id: 'quarry_revenue',
    title: 'Quarry-wise Revenue',
    subtitle: 'Click to export as PDF/CSV',
    icon: Mountain,
    color: '#10B981',
    badge: 'Quarries'
  },
  {
    id: 'dispatch',
    title: 'Dispatch Register',
    subtitle: 'Click to export as PDF/CSV',
    icon: Truck,
    color: '#7C3AED',
    badge: 'Logistics'
  },
  {
    id: 'weighbridge',
    title: 'Weighbridge Log',
    subtitle: 'Click to export as PDF/CSV',
    icon: Scale,
    color: '#0EA5E9',
    badge: 'Reconciliation'
  },
  {
    id: 'audit',
    title: 'Audit Trail Export',
    subtitle: 'Click to export as PDF/CSV',
    icon: FileText,
    color: '#DC2626',
    badge: 'Security'
  },
];

// Utility: Clean CSV Export
function exportToCSV(filename, headers, rows) {
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminReports({
  blocks = [],
  wbHistory = [],
  quarries = [],
  auditLogs = [],
  users = [],
  onRefresh
}) {
  const [activeReportId, setActiveReportId] = useState('block_status');
  const [search, setSearch] = useState('');
  const [filterOption, setFilterOption] = useState('ALL');
  const [dispatches, setDispatches] = useState([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const [localAudit, setLocalAudit] = useState(auditLogs);

  // Fetch dispatches if not available
  useEffect(() => {
    setLoadingDispatches(true);
    api.getDispatches()
      .then(res => setDispatches(Array.isArray(res) ? res : []))
      .catch(() => setDispatches([]))
      .finally(() => setLoadingDispatches(false));
  }, []);

  // Sync audit logs if updated
  useEffect(() => {
    if (auditLogs && auditLogs.length > 0) {
      setLocalAudit(auditLogs);
    } else {
      api.getAuditLogs()
        .then(res => setLocalAudit(Array.isArray(res) ? res : []))
        .catch(() => {});
    }
  }, [auditLogs]);

  // Reset search and filter when changing reports
  const handleSelectReport = (id) => {
    setActiveReportId(id);
    setSearch('');
    setFilterOption('ALL');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Block Status Report Data
  // ───────────────────────────────────────────────────────────────────────────
  const blockStatusFiltered = useMemo(() => {
    return blocks.filter(b => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (b.id || '').toLowerCase().includes(q) ||
        (b.quarry_name || '').toLowerCase().includes(q) ||
        (b.color || '').toLowerCase().includes(q) ||
        (b.seigniorage?.granite_type || '').toLowerCase().includes(q);

      const matchFilter = filterOption === 'ALL' || b.status === filterOption;
      return matchSearch && matchFilter;
    });
  }, [blocks, search, filterOption]);

  const blockStatusKPIs = useMemo(() => {
    const totalBlocks = blocks.length;
    const totalVol = blocks.reduce((acc, b) => acc + (b.measurement?.volume || 0), 0);
    const totalWeight = blocks.reduce((acc, b) => acc + (b.measurement?.estimated_weight || 0), 0);
    const dispatched = blocks.filter(b => ['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status)).length;
    return [
      { label: 'Total Blocks', value: totalBlocks, icon: Layers, color: 'blue' },
      { label: 'Total Volume', value: `${totalVol.toFixed(2)} m³`, icon: Layers, color: 'green' },
      { label: 'Total Weight', value: `${totalWeight.toFixed(2)} MT`, icon: Scale, color: 'gold' },
      { label: 'Dispatched', value: dispatched, icon: Truck, color: 'violet' },
    ];
  }, [blocks]);

  const handleExportBlockStatus = () => {
    const headers = [
      'Block ID', 'Quarry Name', 'Variety/Color', 'Length (m)', 'Breadth (m)', 'Height (m)',
      'Volume (m3)', 'Est Weight (MT)', 'Gangsaw Class', 'Status', 'Registration Date'
    ];
    const rows = blockStatusFiltered.map(b => [
      b.id,
      b.quarry_name || `Quarry #${b.quarry_id}`,
      b.seigniorage?.granite_type || b.color || 'Granite',
      b.measurement?.length?.toFixed(2) || '—',
      b.measurement?.breadth?.toFixed(2) || '—',
      b.measurement?.height?.toFixed(2) || '—',
      b.measurement?.volume?.toFixed(3) || '—',
      b.measurement?.estimated_weight?.toFixed(2) || '—',
      b.seigniorage?.class_status || '—',
      b.status,
      b.creation_time ? new Date(b.creation_time).toLocaleDateString('en-IN') : '—'
    ]);
    exportToCSV('Block_Status_Report', headers, rows);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Seigniorage Summary Data
  // ───────────────────────────────────────────────────────────────────────────
  const seigniorageFiltered = useMemo(() => {
    return blocks.filter(b => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (b.id || '').toLowerCase().includes(q) ||
        (b.quarry_name || '').toLowerCase().includes(q) ||
        (b.seigniorage?.granite_type || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (filterOption === 'ALL') return true;
      if (filterOption === 'ABOVE') return b.seigniorage?.class_status?.includes('above');
      if (filterOption === 'BELOW') return b.seigniorage?.class_status?.includes('below');
      return true;
    });
  }, [blocks, search, filterOption]);

  const seigniorageKPIs = useMemo(() => {
    const totalFee = blocks.reduce((acc, b) => acc + (b.seigniorage?.total_fee || 0), 0);
    const aboveCount = blocks.filter(b => b.seigniorage?.class_status?.includes('above')).length;
    const belowCount = blocks.filter(b => b.seigniorage?.class_status?.includes('below')).length;
    const avgFee = blocks.length > 0 ? (totalFee / blocks.length).toFixed(0) : 0;
    return [
      { label: 'Total Assessed Fee', value: `₹${totalFee.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'green' },
      { label: 'Above Gangsaw', value: aboveCount, icon: Layers, color: 'blue' },
      { label: 'Below Gangsaw', value: belowCount, icon: Layers, color: 'gold' },
      { label: 'Avg Fee / Block', value: `₹${Number(avgFee).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'violet' },
    ];
  }, [blocks]);

  const handleExportSeigniorage = () => {
    const headers = [
      'Block ID', 'Quarry Name', 'Granite Variety', 'Gangsaw Class',
      'Volume (m3)', 'Weight (MT)', 'Basic Fee Rate', 'Market Value Rate', 'Total Fee (INR)', 'Status'
    ];
    const rows = seigniorageFiltered.map(b => [
      b.id,
      b.quarry_name || `Quarry #${b.quarry_id}`,
      b.seigniorage?.granite_type || b.color || 'Granite',
      b.seigniorage?.class_status || '—',
      b.measurement?.volume?.toFixed(3) || '—',
      b.measurement?.estimated_weight?.toFixed(2) || '—',
      b.seigniorage?.basic_fee || '—',
      b.seigniorage?.market_value || '—',
      b.seigniorage?.total_fee || 0,
      b.status
    ]);
    exportToCSV('Seigniorage_Summary_Report', headers, rows);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Quarry-wise Revenue Data
  // ───────────────────────────────────────────────────────────────────────────
  const quarryRows = useMemo(() => {
    const map = {};
    blocks.forEach(b => {
      const qId = b.quarry_id || 'Unknown';
      if (!map[qId]) {
        map[qId] = {
          quarry_id: qId,
          name: b.quarry_name || `Quarry #${qId}`,
          mdl_number: '—',
          district: '—',
          total_blocks: 0,
          dispatched_blocks: 0,
          total_volume: 0,
          total_weight: 0,
          total_revenue: 0,
        };
      }
      map[qId].total_blocks += 1;
      if (['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status)) {
        map[qId].dispatched_blocks += 1;
      }
      map[qId].total_volume += (b.measurement?.volume || 0);
      map[qId].total_weight += (b.measurement?.estimated_weight || 0);
      map[qId].total_revenue += (b.seigniorage?.total_fee || 0);
    });

    // Merge metadata from quarries prop
    quarries.forEach(q => {
      if (map[q.id]) {
        map[q.id].name = q.name || map[q.id].name;
        map[q.id].mdl_number = q.mdl_number || '—';
        map[q.id].district = q.district || '—';
      } else {
        map[q.id] = {
          quarry_id: q.id,
          name: q.name,
          mdl_number: q.mdl_number || '—',
          district: q.district || '—',
          total_blocks: 0,
          dispatched_blocks: 0,
          total_volume: 0,
          total_weight: 0,
          total_revenue: 0,
        };
      }
    });

    return Object.values(map);
  }, [blocks, quarries]);

  const quarryFiltered = useMemo(() => {
    return quarryRows.filter(q => {
      const s = search.toLowerCase();
      return !search ||
        q.name.toLowerCase().includes(s) ||
        q.mdl_number.toLowerCase().includes(s) ||
        q.district.toLowerCase().includes(s);
    });
  }, [quarryRows, search]);

  const quarryKPIs = useMemo(() => {
    const totalQ = quarryRows.length;
    const totalRev = quarryRows.reduce((a, q) => a + q.total_revenue, 0);
    const topQ = [...quarryRows].sort((a, b) => b.total_revenue - a.total_revenue)[0];
    const avgRev = totalQ > 0 ? (totalRev / totalQ).toFixed(0) : 0;
    return [
      { label: 'Active Quarries', value: totalQ, icon: Mountain, color: 'blue' },
      { label: 'Total Quarry Revenue', value: `₹${totalRev.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'green' },
      { label: 'Top Revenue Quarry', value: topQ ? topQ.name : '—', icon: Mountain, color: 'gold' },
      { label: 'Avg Revenue / Quarry', value: `₹${Number(avgRev).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'violet' },
    ];
  }, [quarryRows]);

  const handleExportQuarry = () => {
    const headers = [
      'Quarry ID', 'Quarry Name', 'MDL Number', 'District', 'Total Blocks',
      'Dispatched Blocks', 'Total Volume (m3)', 'Total Weight (MT)', 'Total Revenue (INR)'
    ];
    const rows = quarryFiltered.map(q => [
      q.quarry_id,
      q.name,
      q.mdl_number,
      q.district,
      q.total_blocks,
      q.dispatched_blocks,
      q.total_volume.toFixed(3),
      q.total_weight.toFixed(2),
      q.total_revenue.toFixed(2)
    ]);
    exportToCSV('Quarry_Wise_Revenue_Report', headers, rows);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Dispatch Register Data
  // ───────────────────────────────────────────────────────────────────────────
  const dispatchRows = useMemo(() => {
    if (dispatches.length > 0) return dispatches;
    // Fallback: derive from dispatched blocks
    return blocks
      .filter(b => ['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status) || b.transit_pass_number)
      .map(b => ({
        id: b.id,
        block_id: b.id,
        transit_pass_number: b.transit_pass_number || `TRANSIT-26-${b.id}`,
        e_permit_number: b.e_permit_number || `PR${b.quarry_id || '01'}0001`,
        vehicle_number: b.vehicle_number || 'AP-27-TY-4421',
        driver_name: b.driver_name || 'Driver Registered',
        destination: b.destination || 'Krishnapatnam Port, AP',
        dispatch_time: b.dispatch_time || b.creation_time,
        status: b.status
      }));
  }, [dispatches, blocks]);

  const dispatchFiltered = useMemo(() => {
    return dispatchRows.filter(d => {
      const q = search.toLowerCase();
      return !search ||
        (d.transit_pass_number || '').toLowerCase().includes(q) ||
        (d.e_permit_number || '').toLowerCase().includes(q) ||
        (d.block_id || '').toLowerCase().includes(q) ||
        (d.vehicle_number || '').toLowerCase().includes(q) ||
        (d.destination || '').toLowerCase().includes(q);
    });
  }, [dispatchRows, search]);

  const dispatchKPIs = useMemo(() => {
    const totalD = dispatchRows.length;
    const verified = dispatchRows.filter(d => ['approved', 'weighbridge_verified', 'cleared'].includes(d.status)).length;
    const inTransit = totalD - verified;
    return [
      { label: 'Total Dispatches', value: totalD, icon: Truck, color: 'blue' },
      { label: 'Cleared / Delivered', value: verified, icon: CheckCircle2, color: 'green' },
      { label: 'In-Transit', value: inTransit > 0 ? inTransit : totalD, icon: Truck, color: 'gold' },
      { label: 'Unique Blocks', value: new Set(dispatchRows.map(d => d.block_id)).size, icon: Layers, color: 'violet' },
    ];
  }, [dispatchRows]);

  const handleExportDispatch = () => {
    const headers = [
      'Transit Pass No', 'E-Permit No', 'Block ID', 'Vehicle Number',
      'Driver Name', 'Destination', 'Dispatch Time', 'Status'
    ];
    const rows = dispatchFiltered.map(d => [
      d.transit_pass_number || '—',
      d.e_permit_number || '—',
      d.block_id || '—',
      d.vehicle_number || '—',
      d.driver_name || '—',
      d.destination || '—',
      d.dispatch_time ? new Date(d.dispatch_time).toLocaleString('en-IN') : '—',
      d.status || 'dispatched'
    ]);
    exportToCSV('Dispatch_Register_Report', headers, rows);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Weighbridge Log Data
  // ───────────────────────────────────────────────────────────────────────────
  const wbFiltered = useMemo(() => {
    return (wbHistory || []).filter(h => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (h.block_id || '').toLowerCase().includes(q) ||
        (h.operator_username || '').toLowerCase().includes(q) ||
        (h.status || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (filterOption === 'ALL') return true;
      if (filterOption === 'PASSED') return Math.abs(h.difference_percentage || 0) <= 5;
      if (filterOption === 'FLAGGED') return Math.abs(h.difference_percentage || 0) > 5;
      return true;
    });
  }, [wbHistory, search, filterOption]);

  const wbKPIs = useMemo(() => {
    const totalWb = wbHistory.length;
    const passed = wbHistory.filter(h => Math.abs(h.difference_percentage || 0) <= 5).length;
    const flagged = wbHistory.filter(h => Math.abs(h.difference_percentage || 0) > 5).length;
    const totalTonnage = wbHistory.reduce((acc, h) => acc + (Number(h.actual_weight) || 0), 0);
    return [
      { label: 'Total Weighments', value: totalWb, icon: Scale, color: 'blue' },
      { label: 'Passed Tolerance (≤5%)', value: passed, icon: CheckCircle2, color: 'green' },
      { label: 'Flagged Discrepancies', value: flagged, icon: Scale, color: 'rose' },
      { label: 'Total Verified Tonnage', value: `${totalTonnage.toFixed(2)} MT`, icon: Scale, color: 'gold' },
    ];
  }, [wbHistory]);

  const handleExportWeighbridge = () => {
    const headers = [
      'Record ID', 'Block ID', 'Actual Weight (MT)', 'Difference %',
      'Status', 'Operator', 'Validation Time'
    ];
    const rows = wbFiltered.map(h => [
      h.id,
      h.block_id,
      h.actual_weight != null ? Number(h.actual_weight).toFixed(3) : '—',
      h.difference_percentage != null ? `${Number(h.difference_percentage).toFixed(2)}%` : '0.00%',
      h.status === 'approved' ? 'Passed' : 'Flagged',
      h.operator_username || 'Operator',
      h.validation_time ? new Date(h.validation_time).toLocaleString('en-IN') : '—'
    ]);
    exportToCSV('Weighbridge_Log_Report', headers, rows);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Audit Trail Data
  // ───────────────────────────────────────────────────────────────────────────
  const auditFiltered = useMemo(() => {
    return (localAudit || []).filter(l => {
      const q = search.toLowerCase();
      return !search ||
        (l.block_id || '').toLowerCase().includes(q) ||
        (l.event || '').toLowerCase().includes(q) ||
        (l.username || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q);
    });
  }, [localAudit, search]);

  const auditKPIs = useMemo(() => {
    const totalLogs = localAudit.length;
    const blocksCount = new Set(localAudit.map(l => l.block_id).filter(Boolean)).size;
    const userCount = new Set(localAudit.map(l => l.username).filter(Boolean)).size;
    const aiEvents = localAudit.filter(l => (l.event || '').toLowerCase().includes('measure') || (l.event || '').toLowerCase().includes('ai')).length;
    return [
      { label: 'Total Audit Events', value: totalLogs, icon: FileText, color: 'blue' },
      { label: 'Associated Blocks', value: blocksCount, icon: Layers, color: 'green' },
      { label: 'Active Actors/Users', value: userCount, icon: FileText, color: 'gold' },
      { label: 'AI & Measurement Events', value: aiEvents, icon: FileText, color: 'violet' },
    ];
  }, [localAudit]);

  const handleExportAudit = () => {
    const headers = ['Timestamp', 'Block ID', 'Event Type', 'User/Actor', 'Event Details'];
    const rows = auditFiltered.map(l => [
      new Date(l.timestamp).toLocaleString('en-IN'),
      l.block_id || '—',
      l.event || '—',
      l.username || 'System',
      l.details || '—'
    ]);
    exportToCSV('System_Audit_Trail_Report', headers, rows);
  };

  // Pagination for currently active filtered data
  const currentDataset = useMemo(() => {
    switch (activeReportId) {
      case 'block_status': return blockStatusFiltered;
      case 'seigniorage': return seigniorageFiltered;
      case 'quarry_revenue': return quarryFiltered;
      case 'dispatch': return dispatchFiltered;
      case 'weighbridge': return wbFiltered;
      case 'audit': return auditFiltered;
      default: return [];
    }
  }, [activeReportId, blockStatusFiltered, seigniorageFiltered, quarryFiltered, dispatchFiltered, wbFiltered, auditFiltered]);

  const pagination = usePagination(currentDataset, 15);

  const activeTabMeta = REPORT_TABS.find(t => t.id === activeReportId) || REPORT_TABS[0];

  const handleCurrentExport = () => {
    switch (activeReportId) {
      case 'block_status': return handleExportBlockStatus();
      case 'seigniorage': return handleExportSeigniorage();
      case 'quarry_revenue': return handleExportQuarry();
      case 'dispatch': return handleExportDispatch();
      case 'weighbridge': return handleExportWeighbridge();
      case 'audit': return handleExportAudit();
      default: break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">Reports &amp; Regulatory Intelligence</h1>
            <span className="badge badge-blue">AP Mines &amp; Geology</span>
          </div>
          <p className="page-subtitle">
            Official system-wide statutory records, seigniorage calculations, weighbridge reconciliations, and dispatch registers.
          </p>
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (onRefresh) onRefresh();
              api.getDispatches().then(res => setDispatches(Array.isArray(res) ? res : [])).catch(() => {});
            }}
            title="Refresh Report Data"
          >
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh Data
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={handlePrint}
            title="Print or Save PDF"
          >
            <Printer size={14} style={{ marginRight: 6 }} /> Print / PDF
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCurrentExport}
            title="Download CSV"
          >
            <Download size={14} style={{ marginRight: 6 }} /> Export CSV ({activeTabMeta.title})
          </button>
        </div>
      </div>

      {/* ── 6 Interactive Report Cards Grid ───────────────────────────── */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Report Category
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeReportId === tab.id;
            return (
              <div
                key={tab.id}
                className="card"
                onClick={() => handleSelectReport(tab.id)}
                style={{
                  borderLeft: `4px solid ${tab.color}`,
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                  borderColor: isActive ? tab.color : 'var(--border-light)',
                  boxShadow: isActive ? '0 4px 18px rgba(26, 86, 219, 0.18)' : 'var(--shadow-xs)',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.18s ease-in-out'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    backgroundColor: `${tab.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={20} color={tab.color} />
                  </div>
                  {isActive ? (
                    <span className="badge badge-blue" style={{ fontSize: '0.62rem', gap: 4 }}>
                      <CheckCircle2 size={11} /> Active View
                    </span>
                  ) : (
                    <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>
                      {tab.badge}
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.92rem', marginBottom: 4 }}>
                  {tab.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Click to view &amp; export</span>
                  <ChevronRight size={13} color={tab.color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Report View Section ──────────────────────────────── */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        {/* Active Report Title Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              backgroundColor: `${activeTabMeta.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <activeTabMeta.icon size={24} color={activeTabMeta.color} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F1729' }}>
                  {activeTabMeta.title}
                </h2>
                <span className="badge badge-blue">
                  {currentDataset.length} Records Found
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#1E3A8A', marginTop: 2 }}>
                {activeReportId === 'block_status' && 'Complete granite block lifecycle inventory, geometric dimensions, status, and registration logs.'}
                {activeReportId === 'seigniorage' && 'Official seigniorage assessment summary per AP DMG regulations, gangsaw classifications, and cess fees.'}
                {activeReportId === 'quarry_revenue' && 'Aggregate volumetric production and seigniorage revenue grouped by mining lease / quarry.'}
                {activeReportId === 'dispatch' && 'Official transport dispatch register, vehicle tracking numbers, driver manifests, and e-permits.'}
                {activeReportId === 'weighbridge' && 'Electronic weighbridge gross/tare/net scale logs, automated cross-validation, and fraud tolerance flags.'}
                {activeReportId === 'audit' && 'Immutable cryptographic audit trail of all officer events, AI measurements, and administrative overrides.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleCurrentExport}
            >
              <FileSpreadsheet size={14} style={{ marginRight: 6 }} /> Download CSV
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} style={{ marginRight: 6 }} /> Print Table
            </button>
          </div>
        </div>

        {/* Dynamic 4-Stat KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {activeReportId === 'block_status' && blockStatusKPIs.map(k => <StatCard key={k.label} {...k} />)}
          {activeReportId === 'seigniorage' && seigniorageKPIs.map(k => <StatCard key={k.label} {...k} />)}
          {activeReportId === 'quarry_revenue' && quarryKPIs.map(k => <StatCard key={k.label} {...k} />)}
          {activeReportId === 'dispatch' && dispatchKPIs.map(k => <StatCard key={k.label} {...k} />)}
          {activeReportId === 'weighbridge' && wbKPIs.map(k => <StatCard key={k.label} {...k} />)}
          {activeReportId === 'audit' && auditKPIs.map(k => <StatCard key={k.label} {...k} />)}
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
            <Search size={16} color="#3B82F6" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
              placeholder={`Search in ${activeTabMeta.title}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Contextual Filters */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {activeReportId === 'block_status' && (
              <select
                className="form-control"
                style={{ height: 38, fontSize: '0.82rem', padding: '6px 12px', minWidth: 160 }}
                value={filterOption}
                onChange={e => setFilterOption(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="registered">Registered</option>
                <option value="ai_measured">AI Measured</option>
                <option value="check_measurement_requested">Pending Check</option>
                <option value="dmgo_approved">DMGO Approved</option>
                <option value="permit_ready">Permit Ready</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>
            )}

            {activeReportId === 'seigniorage' && (
              <select
                className="form-control"
                style={{ height: 38, fontSize: '0.82rem', padding: '6px 12px', minWidth: 170 }}
                value={filterOption}
                onChange={e => setFilterOption(e.target.value)}
              >
                <option value="ALL">All Classifications</option>
                <option value="ABOVE">Above Gangsaw (&gt;2.7×1.5m)</option>
                <option value="BELOW">Below Gangsaw (≤2.7×1.5m)</option>
              </select>
            )}

            {activeReportId === 'weighbridge' && (
              <select
                className="form-control"
                style={{ height: 38, fontSize: '0.82rem', padding: '6px 12px', minWidth: 160 }}
                value={filterOption}
                onChange={e => setFilterOption(e.target.value)}
              >
                <option value="ALL">All Weighments</option>
                <option value="PASSED">Passed (Within 5%)</option>
                <option value="FLAGGED">Flagged (&gt; 5% Diff)</option>
              </select>
            )}

            {(search || filterOption !== 'ALL') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setSearch(''); setFilterOption('ALL'); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Table Container ────────────────────────────────────────── */}
        <div className="table-wrapper">
          <PaginationControls pagination={pagination} />

          {/* 1. Block Status Table */}
          {activeReportId === 'block_status' && (
            <table>
              <thead>
                <tr>
                  <th>Block ID</th>
                  <th>Quarry</th>
                  <th>Variety / Color</th>
                  <th>Dimensions (L×B×H)</th>
                  <th>Volume (m³)</th>
                  <th>Est. Weight (MT)</th>
                  <th>Gangsaw Class</th>
                  <th>Status</th>
                  <th>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: '#1E3A8A' }}>No blocks match your search or filter.</td></tr>
                ) : (
                  pagination.currentData.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1A56DB' }}>
                        {b.id}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0F1729' }}>
                        {b.quarry_name || `Quarry #${b.quarry_id}`}
                      </td>
                      <td>
                        <span className="badge badge-blue">{b.seigniorage?.granite_type || b.color || 'Granite'}</span>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                        {b.measurement?.length != null
                          ? `${Number(b.measurement.length).toFixed(2)} × ${Number(b.measurement.breadth).toFixed(2)} × ${Number(b.measurement.height).toFixed(2)} m`
                          : '—'}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#10B981' }}>
                        {b.measurement?.volume != null ? Number(b.measurement.volume).toFixed(3) : '—'}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.measurement?.estimated_weight != null ? Number(b.measurement.estimated_weight).toFixed(2) : '—'}
                      </td>
                      <td>
                        {b.seigniorage?.class_status ? (
                          <span className={`badge ${b.seigniorage.class_status.includes('above') ? 'badge-green' : 'badge-gold'}`}>
                            {b.seigniorage.class_status.includes('above') ? '▲ Above Gangsaw' : '▼ Below Gangsaw'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#1E3A8A' }}>
                        {b.creation_time ? new Date(b.creation_time).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 2. Seigniorage Summary Table */}
          {activeReportId === 'seigniorage' && (
            <table>
              <thead>
                <tr>
                  <th>Block ID</th>
                  <th>Quarry</th>
                  <th>Variety</th>
                  <th>Gangsaw Class</th>
                  <th>Volume (m³)</th>
                  <th>Basic Fee (₹)</th>
                  <th>Market Value (₹)</th>
                  <th>Total Seigniorage (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: '#1E3A8A' }}>No seigniorage records match your criteria.</td></tr>
                ) : (
                  pagination.currentData.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1A56DB' }}>
                        {b.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.quarry_name || `Quarry #${b.quarry_id}`}</td>
                      <td>{b.seigniorage?.granite_type || b.color || 'Granite'}</td>
                      <td>
                        <span className={`badge ${b.seigniorage?.class_status?.includes('above') ? 'badge-green' : 'badge-gold'}`}>
                          {b.seigniorage?.class_status || 'Standard'}
                        </span>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.measurement?.volume != null ? Number(b.measurement.volume).toFixed(3) : '—'}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        ₹{b.seigniorage?.basic_fee != null ? Number(b.seigniorage.basic_fee).toLocaleString('en-IN') : '—'}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        ₹{b.seigniorage?.market_value != null ? Number(b.seigniorage.market_value).toLocaleString('en-IN') : '—'}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#10B981', fontSize: '0.88rem' }}>
                        ₹{b.seigniorage?.total_fee != null ? Number(b.seigniorage.total_fee).toLocaleString('en-IN') : '0'}
                      </td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 3. Quarry-wise Revenue Table */}
          {activeReportId === 'quarry_revenue' && (
            <table>
              <thead>
                <tr>
                  <th>Quarry Name</th>
                  <th>MDL No. / Lease</th>
                  <th>District</th>
                  <th>Extracted Blocks</th>
                  <th>Dispatched</th>
                  <th>Total Volume (m³)</th>
                  <th>Total Weight (MT)</th>
                  <th>Total Seigniorage (₹)</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#1E3A8A' }}>No quarry records found.</td></tr>
                ) : (
                  pagination.currentData.map(q => (
                    <tr key={q.quarry_id}>
                      <td style={{ fontWeight: 700, color: '#0F1729' }}>{q.name}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>{q.mdl_number}</td>
                      <td><span className="badge badge-blue">{q.district}</span></td>
                      <td style={{ fontWeight: 600 }}>{q.total_blocks}</td>
                      <td><span className="badge badge-green">{q.dispatched_blocks}</span></td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{q.total_volume.toFixed(3)}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{q.total_weight.toFixed(2)}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#10B981' }}>
                        ₹{Number(q.total_revenue.toFixed(0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 4. Dispatch Register Table */}
          {activeReportId === 'dispatch' && (
            <table>
              <thead>
                <tr>
                  <th>Transit Pass No.</th>
                  <th>E-Permit No.</th>
                  <th>Block ID</th>
                  <th>Vehicle Number</th>
                  <th>Driver Name</th>
                  <th>Destination</th>
                  <th>Dispatch Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#1E3A8A' }}>No dispatch records found.</td></tr>
                ) : (
                  pagination.currentData.map((d, i) => (
                    <tr key={d.transit_pass_number || d.id || i}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#7C3AED' }}>
                        {d.transit_pass_number || `TRANSIT-26-${d.block_id}`}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                        {d.e_permit_number || 'PR-PENDING'}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#1A56DB' }}>
                        {d.block_id}
                      </td>
                      <td>
                        <span className="badge badge-gold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {d.vehicle_number || '—'}
                        </span>
                      </td>
                      <td>{d.driver_name || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#1E3A8A', maxWidth: 180 }}>
                        {d.destination || '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#1E3A8A' }}>
                        {d.dispatch_time ? new Date(d.dispatch_time).toLocaleString('en-IN') : '—'}
                      </td>
                      <td>
                        <StatusBadge status={d.status || 'dispatched'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 5. Weighbridge Log Table */}
          {activeReportId === 'weighbridge' && (
            <table>
              <thead>
                <tr>
                  <th>Weighment ID</th>
                  <th>Block ID</th>
                  <th>Actual Weight (MT)</th>
                  <th>Difference %</th>
                  <th>Tolerance Status</th>
                  <th>Operator</th>
                  <th>Validation Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#1E3A8A' }}>No weighbridge records match filter.</td></tr>
                ) : (
                  pagination.currentData.map(h => {
                    const isFlagged = Math.abs(h.difference_percentage || 0) > 5;
                    return (
                      <tr key={h.id}>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1E3A8A', fontSize: '0.78rem' }}>
                          #{h.id}
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1A56DB' }}>
                          {h.block_id}
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {h.actual_weight != null ? Number(h.actual_weight).toFixed(3) : '—'} MT
                        </td>
                        <td>
                          <span className={`badge ${isFlagged ? 'badge-rose' : 'badge-green'}`}>
                            {h.difference_percentage != null ? Number(h.difference_percentage).toFixed(2) : '0.00'}%
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={isFlagged ? 'weighbridge_flagged' : 'weighbridge_verified'} />
                        </td>
                        <td>{h.operator_username || 'Operator'}</td>
                        <td style={{ fontSize: '0.75rem', color: '#1E3A8A' }}>
                          {h.validation_time ? new Date(h.validation_time).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* 6. Audit Trail Table */}
          {activeReportId === 'audit' && (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Block ID</th>
                  <th>Event Type</th>
                  <th>User / Officer</th>
                  <th>Action Details</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#1E3A8A' }}>No audit trail logs match search.</td></tr>
                ) : (
                  pagination.currentData.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#1E3A8A' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                        {log.block_id || '—'}
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                          {log.event?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {log.username || 'System'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#1E3A8A', maxWidth: 360 }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
