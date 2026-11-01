import React, { useState, useMemo } from 'react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import PermitCard from './PermitCard';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import { useLanguage } from '../i18n';
import {
  FileCheck, Search, Filter, Printer, Download, Eye,
  Clock, ShieldCheck, AlertCircle, CheckCircle, Truck,
  Calendar, Building, RefreshCw, Navigation
} from 'lucide-react';
import TransitTracker from './TransitTracker';

export default function DMGOPermits({ blocks = [], user, onRefresh }) {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedPermitBlock, setSelectedPermitBlock] = useState(null);
  const [issueModalBlock, setIssueModalBlock] = useState(null);
  const [trackingBlockId, setTrackingBlockId] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueForm, setIssueForm] = useState({
    vehicleNumber: '',
    destination: '',
    validityHours: '48',
    driverName: '',
  });

  const district = user?.district || 'Prakasam';

  // Blocks with permits or eligible for permits
  const permitBlocks = useMemo(() => {
    return (blocks || []).filter(b =>
      ['dmgo_approved', 'permit_ready', 'dispatched', 'weighbridge_verified', 'weighbridge_flagged', 'delivered'].includes(b.status)
    );
  }, [blocks]);

  const filteredPermits = useMemo(() => {
    return permitBlocks.filter(b => {
      if (filter === 'active' && !['permit_ready', 'dispatched', 'delivered'].includes(b.status)) return false;
      if (filter === 'completed' && b.status !== 'weighbridge_verified') return false;
      if (filter === 'flagged' && b.status !== 'weighbridge_flagged') return false;
      if (filter === 'ready' && b.status !== 'dmgo_approved') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const id = (b.id || '').toLowerCase();
        const quarry = (b.quarry_name || '').toLowerCase();
        const veh = (b.dispatch?.vehicle_number || '').toLowerCase();
        const type = (b.seigniorage?.granite_type || '').toLowerCase();
        if (!id.includes(q) && !quarry.includes(q) && !veh.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [permitBlocks, filter, search]);

  const pagination = usePagination(filteredPermits, 12);

  const activeCount = permitBlocks.filter(b => ['permit_ready', 'dispatched', 'delivered'].includes(b.status)).length;
  const completedCount = permitBlocks.filter(b => b.status === 'weighbridge_verified').length;
  const readyCount = permitBlocks.filter(b => b.status === 'dmgo_approved').length;
  const totalRevenue = permitBlocks.reduce((acc, b) => acc + (b.seigniorage?.total_fee || 0), 0);

  const handleIssuePermit = async (e) => {
    e.preventDefault();
    if (!issueModalBlock) return;
    setIssuing(true);
    setIssueError('');
    try {
      const validUntilDate = new Date(Date.now() + Number(issueForm.validityHours) * 3600 * 1000).toISOString();
      const updatedDispatch = await api.issueTransitPass({
        block_id: issueModalBlock.id,
        vehicle_number: issueForm.vehicleNumber.toUpperCase(),
        driver_name: issueForm.driverName,
        destination: issueForm.destination,
        validity_hours: Number(issueForm.validityHours),
        valid_until: validUntilDate,
      });

      issueModalBlock.dispatch = updatedDispatch;
      issueModalBlock.status = 'permit_ready';
      setIssueModalBlock(null);
      setIssueForm({ vehicleNumber: '', destination: '', validityHours: '48', driverName: '' });
      if (onRefresh) await onRefresh();
    } catch (err) {
      setIssueError(err.message || 'Failed to issue transit pass');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slideInUp 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{t('Statutory e-Transit Passes')}</h1>
            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Sec. 21 MMDR Act 1957</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            {lang === 'te' ? `${district} జిల్లా కోసం ఖనిజ రవాణా అనుమతుల జారీ, ట్రాకింగ్ మరియు డిజిటల్ ధృవీకరణ` : `Issuance, tracking and digital verification of mineral transit permits for ${district} District`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={onRefresh}>
            <RefreshCw size={14} /> {t('Refresh')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #1A56DB' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{t('Active Passes')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A56DB', marginTop: 4 }}>{activeCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: 2 }}>{t('En route on state highways')}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{t('Ready for Permit')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D97706', marginTop: 4 }}>{readyCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>{t('DMGO verified, awaiting transport')}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{t('Completed Transits')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', marginTop: 4 }}>{completedCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>{t('Cross-checked at weighbridge')}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #7C3AED' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{t('Permit Seigniorage')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>
            ₹{(totalRevenue / 100000).toFixed(1)}L
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>{t('100% digital collection')}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `${t('All Permits')} (${permitBlocks.length})` },
              { id: 'active', label: `${t('In Transit')} (${activeCount})` },
              { id: 'ready', label: `${t('Ready to Issue')} (${readyCount})` },
              { id: 'completed', label: `${t('Verified')} (${completedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`btn btn-sm ${filter === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 280 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                className="form-control"
                placeholder={t('Search permit, vehicle, quarry...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, fontSize: '0.8rem', height: 36 }}
              />
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>

        {/* Permits Table */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>{t('e-Permit ID')}</th>
                <th>{t('Block ID')}</th>
                <th>{t('Quarry / Lessee')}</th>
                <th>{t('Variety & Volume')}</th>
                <th>{t('Assigned Vehicle')}</th>
                <th>{t('Destination')}</th>
                <th>{t('Seigniorage')}</th>
                <th>{t('Status')}</th>
                <th>{t('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentData.map(b => {
                const permitNo = `APMG-${b.id?.replace('BLK-', '') || '0000'}-2025`;
                const isReady = b.status === 'dmgo_approved';
                return (
                  <tr key={b.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB', fontSize: '0.78rem' }}>
                      {permitNo}
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.78rem' }}>
                      {b.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0F1729' }}>
                        {b.quarry_name || `Quarry #${b.quarry_id}`}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{district} {t('District')}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{b.seigniorage?.granite_type || 'Black Galaxy'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.measurement?.volume ? `${b.measurement.volume.toFixed(3)} m³` : '—'}
                      </div>
                    </td>
                    <td>
                      {b.dispatch?.vehicle_number ? (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, background: '#F1F5F9', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', color: '#1E293B' }}>
                          🚛 {b.dispatch.vehicle_number}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{t('Not Assigned')}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#334155' }}>
                      {b.dispatch?.destination || 'Processing Plant'}
                    </td>
                    <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>
                      ₹{Number(b.seigniorage?.total_fee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedPermitBlock(b)}
                          title="View Official e-Permit Card"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={13} /> {t('View Pass')}
                        </button>
                        {isReady && (
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => {
                              setIssueModalBlock(b);
                              setIssueForm({
                                vehicleNumber: b.dispatch?.vehicle_number || '',
                                destination: b.dispatch?.destination || 'Chennai Port',
                                validityHours: '48',
                                driverName: b.dispatch?.driver_name || '',
                              });
                            }}
                            title="Verify and Seal Permit"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <FileCheck size={13} /> {t('Issue Pass')}
                          </button>
                        )}
                        {['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status) && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setTrackingBlockId(b.id)}
                            title="Track Transit"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' }}
                          >
                            <Navigation size={13} /> Track
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagination.currentData.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                    <FileCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700 }}>No transit permits found for this query</div>
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

      {/* VIEW PERMIT CARD MODAL */}
      {selectedPermitBlock && (
        <div className="modal-overlay" onClick={() => setSelectedPermitBlock(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F1729', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#1A56DB" />
                Statutory e-Transit Pass — AP Mines &amp; Geology
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedPermitBlock(null)}>✕</button>
            </div>

            <PermitCard block={selectedPermitBlock} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Digitally authenticated with OMEPS 2.0 PKI Signature
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={14} /> Print Pass
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setSelectedPermitBlock(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE PERMIT MODAL */}
      {issueModalBlock && (
        <div className="modal-overlay" onClick={() => setIssueModalBlock(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">
                📜 Issue Transit Pass — {issueModalBlock.id}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIssueModalBlock(null)}>✕</button>
            </div>

            <form onSubmit={handleIssuePermit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="alert alert-blue" style={{ fontSize: '0.75rem' }}>
                  Authorizing transit pass under AP Minor Mineral Rules. Vehicle must stop at all checkposts.
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Registration Number</label>
                  <input
                    className="form-control"
                    placeholder="e.g. AP 27 TX 5678"
                    value={issueForm.vehicleNumber}
                    onChange={e => setIssueForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                    required
                    style={{ textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Full Name</label>
                  <input
                    className="form-control"
                    placeholder="e.g. K. Venkat Rao"
                    value={issueForm.driverName}
                    onChange={e => setIssueForm(p => ({ ...p, driverName: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Destination / Processing Facility</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Chimakurthy Export Processing Zone"
                    value={issueForm.destination}
                    onChange={e => setIssueForm(p => ({ ...p, destination: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Validity Duration</label>
                  <select
                    className="form-control"
                    value={issueForm.validityHours}
                    onChange={e => setIssueForm(p => ({ ...p, validityHours: e.target.value }))}
                  >
                    <option value="24">24 Hours (Intra-District)</option>
                    <option value="48">48 Hours (Standard Inter-District)</option>
                    <option value="72">72 Hours (Export / Port Transit)</option>
                  </select>
                </div>
                {issueError && (
                  <div className="alert alert-rose" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    <AlertCircle size={14} /> {issueError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIssueModalBlock(null)} disabled={issuing}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={issuing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {issuing ? 'Authorizing & Sealing...' : <><FileCheck size={16} /> Sign &amp; Issue e-Pass</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transit Tracker Modal */}
      {trackingBlockId && (
        <TransitTracker 
          blockId={trackingBlockId} 
          onClose={() => setTrackingBlockId(null)} 
        />
      )}
    </div>
  );
}
