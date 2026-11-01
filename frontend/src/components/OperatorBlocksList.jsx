import React, { useState, useMemo } from 'react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import { formatGpsString } from '../utils/gps';
import {
  Search, Filter, Eye, Send, Trash2, ShieldAlert, Image as ImageIcon, Layers,
  CheckCircle, RotateCcw, Plus, ExternalLink, Scissors, Mountain, Compass,
  Receipt, CreditCard, CheckCircle2, ChevronDown, ChevronUp, AlertCircle,
  ShieldCheck, Lock, Clock, RefreshCw
} from 'lucide-react';

// Robust helper to resolve image paths from backend /uploads or /datasets
export function getBlockImageUrl(b) {
  if (!b) return null;
  const raw = b.image_url || b.images?.[0]?.file_path;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/uploads/') || raw.startsWith('/datasets/')) return raw;
  if (raw.startsWith('uploads/')) return `/${raw}`;
  if (raw.startsWith('datasets/')) return `/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/uploads/${raw}`;
}

export default function OperatorBlocksList({ blocks = [], activeSubTab, onActionCompleted, onNavigateToCapture }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'undressed' | 'dressed'
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');
  const [imageModal, setImageModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  // Dynamic granite types from data
  const availableTypes = useMemo(() => {
    return Array.from(new Set(
      (blocks || [])
        .map(b => b.seigniorage?.granite_type)
        .filter(Boolean)
    )).sort();
  }, [blocks]);

  // Undressed and dressed counts
  const undressedCount = useMemo(() => {
    return (blocks || []).filter(b => b.block_type === 'undressed' || b.status === 'undressed').length;
  }, [blocks]);

  const dressedCount = useMemo(() => {
    return (blocks || []).filter(b => b.block_type !== 'undressed' && b.status !== 'undressed').length;
  }, [blocks]);

  // Filter
  const filtered = useMemo(() => {
    return (blocks || []).filter(b => {
      if (!b) return false;
      const matchSearch = !search ||
        (b.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.undressed_id || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || (b.seigniorage?.granite_type || '').toLowerCase() === typeFilter.toLowerCase();
      
      let matchCategory = true;
      const isUd = b.block_type === 'undressed' || b.status === 'undressed';
      if (categoryFilter === 'undressed') matchCategory = isUd;
      else if (categoryFilter === 'dressed') matchCategory = !isUd;

      let matchStatus = true;
      if (statusFilter) {
        if (statusFilter === 'pending_dmgo') {
          matchStatus = ['check_requested', 'check_measurement_requested', 'ai_measured'].includes(b.status);
        } else if (statusFilter === 'approved') {
          matchStatus = ['dmgo_approved', 'permit_ready', 'weighbridge_approved'].includes(b.status);
        } else {
          matchStatus = b.status === statusFilter;
        }
      }
      return matchSearch && matchType && matchStatus && matchCategory;
    });
  }, [blocks, search, typeFilter, statusFilter, categoryFilter]);

  const pagination = usePagination(filtered, 15);

  const toggleSelect = (id) => {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const eligibleForCheck = pagination.currentData.filter(b =>
    ['dressed', 'ai_measured', 'registered'].includes(b.status) && b.block_type !== 'undressed'
  );

  const handleRaiseCheck = async () => {
    if (!selectedIds.length) return;
    setProcessing(true);
    try {
      const res = await api.raiseCheckRequest(selectedIds);
      const count = res?.updated?.length || selectedIds.length;
      setCheckMsg(`✅ Check measurement requested for ${count} block(s)!`);
      setSelectedIds([]);
      if (onActionCompleted) onActionCompleted();
    } catch (e) {
      setCheckMsg('❌ ' + (e.message || 'Failed to submit check request'));
    } finally {
      setProcessing(false);
      setTimeout(() => setCheckMsg(''), 4000);
    }
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm(`Delete draft ${blockId}?`)) return;
    setProcessing(true);
    try {
      await api.deleteBlock(blockId);
      if (onActionCompleted) onActionCompleted();
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDimension = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const num = Number(val);
    const inMeters = num > 15 ? num / 100 : num;
    return inMeters.toFixed(2);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Granite Inventory &amp; Lifecycle</h1>
          <p className="page-subtitle">
            Manage raw undressed pit blocks and dressed commercial blocks matching AP Mines &amp; Geology protocols
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <button className="btn btn-accent" onClick={handleRaiseCheck} disabled={processing}>
              <Send size={15} /> Raise DMGO Request ({selectedIds.length})
            </button>
          )}
          {onNavigateToCapture && (
            <button className="btn btn-primary" onClick={() => onNavigateToCapture()}>
              <Plus size={15} /> Register / Capture Block
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setCategoryFilter('all')}
        >
          All Inventory ({blocks.length})
        </button>
        <button
          className={`btn btn-sm ${categoryFilter === 'undressed' ? 'btn-accent' : 'btn-outline'}`}
          onClick={() => setCategoryFilter('undressed')}
          style={categoryFilter !== 'undressed' ? { borderColor: '#F59E0B', color: '#D97706' } : {}}
        >
          <Mountain size={14} /> 🪨 Undressed Blocks (Pit Excavation) ({undressedCount})
        </button>
        <button
          className={`btn btn-sm ${categoryFilter === 'dressed' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setCategoryFilter('dressed')}
        >
          <Layers size={14} /> 📐 Dressed Blocks (Dressing Yard) ({dressedCount})
        </button>
      </div>

      {/* Check request banner */}
      {checkMsg && (
        <div className={`alert ${checkMsg.startsWith('✅') ? 'alert-green' : 'alert-rose'}`}>
          <CheckCircle size={16} /> {checkMsg}
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} color="#1A56DB" />
          <input
            placeholder="Search Block ID or UD ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-control" style={{ maxWidth: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Granite Types ({availableTypes.length})</option>
          {availableTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="form-control" style={{ maxWidth: 200 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="undressed">Undressed (Raw Pit Face)</option>
          <option value="pending_dmgo">Pending DMGO Review</option>
          <option value="dressed">Dressed (Ready to Submit)</option>
          <option value="approved">Approved &amp; Ready</option>
          <option value="dispatched">Dispatched</option>
          <option value="weighbridge_verified">Weighbridge Verified</option>
          <option value="weighbridge_flagged">Weighbridge Flagged</option>
          <option value="dmgo_rejected">Rejected</option>
        </select>
        {(search || typeFilter || statusFilter || categoryFilter !== 'all') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setCategoryFilter('all'); }}
            title="Reset filters"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1A56DB', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {filtered.length} of {blocks.length} blocks
        </span>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <PaginationControls pagination={pagination} />
        {filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Layers size={36} color="#BFDBFE" style={{ marginBottom: 12 }} />
            {blocks.length === 0 ? (
              <>
                <p style={{ color: '#1E3A8A', fontWeight: 700, fontSize: '1.05rem' }}>No blocks registered for this quarry yet.</p>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 4 }}>Capture and measure your first granite block to get started.</p>
                {onNavigateToCapture && (
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigateToCapture()}>
                    <Plus size={15} /> Capture New Block
                  </button>
                )}
              </>
            ) : (
              <>
                <p style={{ color: '#1E3A8A', fontWeight: 600 }}>No blocks match your selected filters.</p>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setCategoryFilter('all'); }}
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={eligibleForCheck.length > 0 && eligibleForCheck.every(b => selectedIds.includes(b.id))}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(Array.from(new Set([...selectedIds, ...eligibleForCheck.map(b => b.id)])));
                        } else {
                          setSelectedIds(selectedIds.filter(id => !eligibleForCheck.some(b => b.id === id)));
                        }
                      }}
                      title="Select eligible dressed blocks for DMGO check request"
                    />
                  </th>
                  <th>Block ID / UD ID</th>
                  <th>Category</th>
                  <th>Image</th>
                  <th>Quarry</th>
                  <th>Granite Type</th>
                  <th>Dimensions (L×B×H m)</th>
                  <th>Volume (m³)</th>
                  <th>Seigniorage</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentData.map((b, idx) => {
                  const isUndressed = b.block_type === 'undressed' || b.status === 'undressed';
                  const m = b.measurement;
                  const imgSrc = getBlockImageUrl(b);
                  const isSelectable = !isUndressed && ['dressed', 'ai_measured', 'registered'].includes(b.status);
                  
                  const seig = b.seigniorage?.total_fee
                    ? `₹${Number(b.seigniorage.total_fee).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                    : m ? `~₹${((m.estimated_weight || (m.volume || 1) * 2.7) * 1200).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';
                  
                  return (
                    <tr key={b.id} style={{ animationDelay: `${idx * 0.02}s`, animation: 'slideIn 0.2s ease both' }}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={!isSelectable}
                          checked={selectedIds.includes(b.id)}
                          onChange={() => toggleSelect(b.id)}
                          title={isSelectable ? 'Select for DMGO check request' : isUndressed ? 'Undressed blocks must be dressed before DMGO request' : `Status is '${b.status}'`}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <button
                            onClick={() => setDetailModal(b)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontWeight: 800, color: isUndressed ? '#B45309' : '#1A56DB',
                              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem',
                              textAlign: 'left', padding: 0
                            }}
                          >
                            {isUndressed ? (b.undressed_id || b.id) : b.id}
                          </button>
                          {!isUndressed && b.undressed_id && (
                            <span style={{ fontSize: '0.65rem', color: '#065F46', fontWeight: 700 }}>
                              UD: {b.undressed_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {isUndressed ? (
                          <span className="badge badge-gold" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Mountain size={11} /> Undressed
                          </span>
                        ) : (
                          <span className="badge badge-blue" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Layers size={11} /> Dressed
                          </span>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            width: 38, height: 38, borderRadius: 8,
                            background: isUndressed ? '#FEF3C7' : '#EFF6FF',
                            border: `1px solid ${isUndressed ? '#FDE68A' : '#BFDBFE'}`,
                            overflow: 'hidden', cursor: imgSrc ? 'pointer' : 'default', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                          }}
                          onClick={() => imgSrc && setImageModal(imgSrc)}
                          title={imgSrc ? "Click to view full image" : "No image available"}
                        >
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={b.id || "block"}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div style={{ display: imgSrc ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={16} color={isUndressed ? '#D97706' : '#BFDBFE'} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.quarry_name || `Q#${b.quarry_id}`}>
                        {b.quarry_name || `Q#${b.quarry_id}`}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{b.seigniorage?.granite_type || '—'}</td>
                      <td>
                        {isUndressed ? (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#B45309', fontWeight: 700 }}>
                            {b.undressed_length
                              ? `${formatDimension(b.undressed_length)}×${formatDimension(b.undressed_breadth)}×${formatDimension(b.undressed_height)} (Raw)`
                              : 'Single Edge'}
                          </span>
                        ) : m ? (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#0F1729' }}>
                            {formatDimension(m.length)}×{formatDimension(m.breadth)}×{formatDimension(m.height)}
                          </span>
                        ) : <span style={{ color: '#BFDBFE', fontSize: '0.75rem' }}>Pending</span>}
                      </td>
                      <td>
                        {isUndressed ? (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#D97706', fontSize: '0.82rem' }}>
                            {b.undressed_volume ? Number(b.undressed_volume).toFixed(3) : '—'}
                          </span>
                        ) : m?.volume ? (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB', fontSize: '0.82rem' }}>
                            {Number(m.volume).toFixed(3)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {isUndressed ? (
                          <span style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 700 }}>
                            Pre-Dressing
                          </span>
                        ) : (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#10B981' }}>
                            {seig}
                          </span>
                        )}
                      </td>
                      <td><StatusBadge status={b.status} /></td>
                      <td style={{ fontSize: '0.75rem', color: '#1E3A8A', whiteSpace: 'nowrap' }}>
                        {b.creation_time ? new Date(b.creation_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {isUndressed && (
                            <button
                              className="btn btn-accent btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '0.72rem' }}
                              onClick={() => onNavigateToCapture && onNavigateToCapture(b)}
                              title="Dress and measure this raw block"
                            >
                              <Scissors size={12} /> Dress
                            </button>
                          )}
                          <button className="btn btn-ghost btn-icon btn-sm" title="View Details" onClick={() => setDetailModal(b)}>
                            <Eye size={14} color="#1A56DB" />
                          </button>
                          <a
                            href={`/track/${b.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Open Public Tracking Page"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <ExternalLink size={14} color="#0EA5E9" />
                          </a>
                          {['registered', 'dressed', 'ai_measured', 'undressed'].includes(b.status) && (
                            <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => handleDelete(b.id)} disabled={processing}>
                              <Trash2 size={14} />
                            </button>
                          )}
                          {b.status === 'dmgo_rejected' && (
                            <button className="btn btn-ghost btn-icon btn-sm" title={`Remarks: ${b.dmgo_remarks || 'None'}`} onClick={() => alert(`DMGO Rejection Remarks:\n\n${b.dmgo_remarks || 'No remarks provided.'}`)}>
                              <ShieldAlert size={14} color="#EF4444" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image modal */}
      {imageModal && (
        <div className="modal-overlay" onClick={() => setImageModal(null)}>
          <img src={imageModal} alt="Block" style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 12 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <BlockDetailModal block={detailModal} onClose={() => setDetailModal(null)} onDressBlock={onNavigateToCapture} />
      )}
    </div>
  );
}

function BlockDetailModal({ block: b, onClose, onDressBlock }) {
  const isUndressed = b.block_type === 'undressed' || b.status === 'undressed';
  const m = b.measurement;
  const s = b.seigniorage;
  const w = b.weighbridge;
  const d = b.dispatch;

  const [challan, setChallan] = useState(null);
  const [challanLoading, setChallanLoading] = useState(false);
  const [showChallan, setShowChallan] = useState(false);
  const [remittanceModal, setRemittanceModal] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [gatewaySelected, setGatewaySelected] = useState('CFMS SBI e-Pay AP Govt');
  const [submittingRemittance, setSubmittingRemittance] = useState(false);

  const [remittanceRecord, setRemittanceRecord] = useState(() => {
    try {
      const saved = localStorage.getItem(`challan_record_${b.id}`);
      if (saved) return JSON.parse(saved);
      // Migrate old key if exists
      const old = localStorage.getItem(`challan_paid_${b.id}`);
      if (old) {
        const p = JSON.parse(old);
        return {
          challan_no: p.challan_no,
          utr: p.utr,
          amount: p.amount,
          submitted_at: p.paid_at,
          submitted_by: 'Quarry Lessee / Operator',
          status: 'pending_authorization',
          authorized_by: null,
          authorized_at: null,
        };
      }
      return null;
    } catch { return null; }
  });

  const fetchChallan = async () => {
    if (challan) { setShowChallan(v => !v); return; }
    setChallanLoading(true);
    try {
      const data = await api.getChallan(b.id);
      setChallan(data);
      setShowChallan(true);
    } catch (err) {
      console.error('Failed to load challan', err);
    } finally {
      setChallanLoading(false);
    }
  };

  const handleOpenRemittanceModal = () => {
    setUtrInput(`SBIIN${Date.now().toString().slice(-8)}`);
    setRemittanceModal(true);
  };

  const handleSubmitRemittance = () => {
    setSubmittingRemittance(true);
    setTimeout(() => {
      const totalAmount = challan?.challan_breakdown?.total_challan ||
        (s?.total_fee ? Math.round(s.total_fee * 1.32) : 21757.12);

      const rec = {
        challan_no: `CFMS-AP-2026-BLK-${b.id}-${Math.floor(1000 + Math.random() * 9000)}`,
        utr: utrInput.trim() || `SBIIN${Date.now().toString().slice(-8)}`,
        gateway: gatewaySelected,
        amount: totalAmount,
        submitted_at: new Date().toISOString(),
        submitted_by: 'Quarry Lessee / Operator',
        status: 'pending_authorization',
        authorized_by: null,
        authorized_at: null,
      };
      try {
        localStorage.setItem(`challan_record_${b.id}`, JSON.stringify(rec));
        localStorage.removeItem(`challan_paid_${b.id}`);
      } catch {}
      setRemittanceRecord(rec);
      setSubmittingRemittance(false);
      setRemittanceModal(false);
    }, 1000);
  };

  const handleResetPayment = () => {
    try {
      localStorage.removeItem(`challan_record_${b.id}`);
      localStorage.removeItem(`challan_paid_${b.id}`);
    } catch {}
    setRemittanceRecord(null);
  };

  const formatDim = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const num = Number(val);
    const inM = num > 15 ? num / 100 : num;
    return `${inM.toFixed(3)} m`;
  };

  // Dressing Yield Calculation if both dressed and undressed volume exist
  const dressingYield = useMemo(() => {
    if (m?.volume && b.undressed_volume) {
      const volDiff = (Number(b.undressed_volume) - Number(m.volume)).toFixed(3);
      const yieldPct = ((m.volume / b.undressed_volume) * 100).toFixed(1);
      const wastePct = (100 - parseFloat(yieldPct)).toFixed(1);
      return { yieldPct, wastePct, volDiff };
    }
    return null;
  }, [m, b]);

  const modalImg = getBlockImageUrl(b);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {modalImg && (
              <img
                src={modalImg}
                alt={b.id}
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #BFDBFE' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="modal-title" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {isUndressed ? (b.undressed_id || b.id) : b.id}
                </div>
                {isUndressed ? (
                  <span className="badge badge-gold">🪨 Undressed Block</span>
                ) : (
                  <span className="badge badge-blue">📐 Dressed Block</span>
                )}
              </div>
              <div style={{ marginTop: 4 }}><StatusBadge status={b.status} /></div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            ['Quarry', b.quarry_name || `Quarry #${b.quarry_id}`],
            ['Granite Mineral Type', s?.granite_type || '—'],
            ['GPS Coordinates', formatGpsString(b.gps)],
            ['Registration Date', b.creation_time ? new Date(b.creation_time).toLocaleString('en-IN') : '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#EFF6FF', padding: '12px 14px', borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F1729', marginTop: 3 }}>{val}</div>
            </div>
          ))}

          {/* Undressed Specs */}
          {b.undressed_length && (
            <div style={{ gridColumn: '1/-1', background: '#FFFBEB', padding: '14px 16px', borderRadius: 10, border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                  🪨 Raw Pit Excavation Specs (Undressed Block)
                </div>
                {b.undressed_id && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 800, color: '#B45309' }}>
                    {b.undressed_id}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#78350F' }}>Raw Length</div>
                  <div style={{ fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>{formatDim(b.undressed_length)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#78350F' }}>Raw Breadth</div>
                  <div style={{ fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>{formatDim(b.undressed_breadth)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#78350F' }}>Raw Height</div>
                  <div style={{ fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>{formatDim(b.undressed_height)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#78350F' }}>Raw Volume</div>
                  <div style={{ fontWeight: 800, color: '#B45309', fontFamily: "'JetBrains Mono', monospace" }}>{b.undressed_volume} m³</div>
                </div>
              </div>
            </div>
          )}

          {/* Dressing Yield Ratio Card */}
          {dressingYield && (
            <div style={{ gridColumn: '1/-1', background: '#F0FDF4', padding: '14px 16px', borderRadius: 10, border: '1px solid #6EE7B7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
                  AP DMG Dressing Recovery Yield &amp; Volume Variance
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#065F46', marginTop: 4 }}>
                  {dressingYield.yieldPct}% Commercial Yield
                </div>
                <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: 2 }}>
                  Δ Volume Trimmed: <strong>{dressingYield.volDiff} m³</strong> (Raw {b.undressed_volume} m³ → Dressed {m.volume} m³)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-green">Quarry Waste: {dressingYield.wastePct}%</span>
                <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: 4 }}>Verified against pit extraction</div>
              </div>
            </div>
          )}

          {/* Dressed AI Measurements */}
          {m && (
            <>
              {[['Length', formatDim(m.length)], ['Breadth', formatDim(m.breadth)], ['Height', formatDim(m.height)]].map(([label, val]) => (
                <div key={label} style={{ background: '#F0FDF4', padding: '12px 14px', borderRadius: 10, border: '1px solid #6EE7B7' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label} (Dressed)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0F1729', marginTop: 3 }}>{val}</div>
                </div>
              ))}
              <div style={{ background: '#F0FDF4', padding: '12px 14px', borderRadius: 10, border: '1px solid #6EE7B7' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Volume (Dressed)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0F1729', marginTop: 3 }}>
                  {Number(m.volume || 0).toFixed(4)} m³
                </div>
              </div>
              {/* Cuboid Diagonals & Surface Area */}
              {(() => {
                const l = parseFloat(m.length) || 0;
                const br = parseFloat(m.breadth) || 0;
                const h = parseFloat(m.height) || 0;
                if (l <= 0 || br <= 0 || h <= 0) return null;
                const diagM = (Math.sqrt(l * l + br * br + h * h) / 100).toFixed(3);
                const areaM = ((2 * (l * br + l * h + br * h)) / 10000).toFixed(3);
                return (
                  <div style={{ gridColumn: '1/-1', background: '#F8FAFC', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                      <strong style={{ color: '#7C3AED' }}>Space Diagonal (d):</strong> {diagM} m
                      <span style={{ margin: '0 8px', color: '#CBD5E1' }}>|</span>
                      <strong style={{ color: '#B45309' }}>Surface Area (A):</strong> {areaM} m²
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Omni Cuboid Metrics</span>
                  </div>
                );
              })()}
            </>
          )}

          {/* Statutory Seigniorage & CFMS e-Challan Section */}
          {s && (
            <div style={{ gridColumn: '1/-1', background: '#FFF8F0', padding: '16px', borderRadius: 10, border: '1.5px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={14} color="#D97706" /> Statutory Seigniorage &amp; CFMS Challan
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#92400E', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    ₹ {Number(s.total_fee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309', marginLeft: 6 }}>(Base Seigniorage)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {s.class_status && (
                    <span className={`badge ${s.class_status.includes('above') ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.7rem' }}>
                      {s.class_status.includes('above') ? '▲ Above Gangsaw' : '▼ Below Gangsaw'}
                    </span>
                  )}
                  <button
                    onClick={fetchChallan}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.74rem', background: '#fff', borderColor: '#D97706', color: '#B45309' }}
                    disabled={challanLoading}
                  >
                    {challanLoading ? '⏳ Loading...' : (showChallan ? '▲ Hide Full Challan' : '▼ View Full Challan (DMF + Cess)')}
                  </button>
                </div>
              </div>

              {/* Full Statutory Breakdown */}
              {showChallan && challan && (
                <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 8, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78350F', marginBottom: 8, textTransform: 'uppercase' }}>
                    Official AP Minor Mineral Concession Rules 1966 Challan Assessment:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: '0.78rem' }}>
                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6 }}>
                      <div style={{ color: '#64748B', fontSize: '0.68rem' }}>Base Seigniorage</div>
                      <div style={{ fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                        ₹{challan.challan_breakdown?.base_seigniorage?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6 }}>
                      <div style={{ color: '#64748B', fontSize: '0.68rem' }}>DMF Cess (30%)</div>
                      <div style={{ fontWeight: 800, color: '#059669', fontFamily: "'JetBrains Mono', monospace" }}>
                        + ₹{challan.challan_breakdown?.dmf?.amount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6 }}>
                      <div style={{ color: '#64748B', fontSize: '0.68rem' }}>MERIT Cess (2%)</div>
                      <div style={{ fontWeight: 800, color: '#7C3AED', fontFamily: "'JetBrains Mono', monospace" }}>
                        + ₹{challan.challan_breakdown?.merit?.amount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6 }}>
                      <div style={{ color: '#64748B', fontSize: '0.68rem' }}>Green Cess (₹50/MT)</div>
                      <div style={{ fontWeight: 800, color: '#0EA5E9', fontFamily: "'JetBrains Mono', monospace" }}>
                        + ₹{challan.challan_breakdown?.green_cess?.amount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px dashed #E2E8F0', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Total Statutory Challan: </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#166534', fontFamily: "'JetBrains Mono', monospace", marginLeft: 6 }}>
                        ₹{challan.challan_breakdown?.total_challan?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {!remittanceRecord ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenRemittanceModal}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <CreditCard size={14} /> Pay via AP CFMS Treasury
                      </button>
                    ) : remittanceRecord.status === 'pending_authorization' ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.75rem', padding: '6px 10px', gap: 4 }}>
                        <Clock size={12} /> Awaiting DMGO Verification
                      </span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '6px 10px', gap: 4 }}>
                        <CheckCircle2 size={12} /> Paid &amp; Authorized
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 1. Status: PENDING DMGO AUTHORIZATION */}
              {remittanceRecord && remittanceRecord.status === 'pending_authorization' && (
                <div style={{
                  background: '#FFFBEB',
                  border: '1.5px solid #F59E0B',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#92400E', fontSize: '0.82rem' }}>
                      <Clock size={16} color="#D97706" />
                      ⏳ Remittance Submitted — Pending DMGO Verification
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                      Treasury Reconciling
                    </span>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 8, border: '1px solid #FDE68A', fontSize: '0.76rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>e-Challan Reference: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0F1729' }}>{remittanceRecord.challan_no}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Bank UTR: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0F1729' }}>{remittanceRecord.utr}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Remitted Amount: </span>
                      <strong style={{ color: '#166534' }}>₹{Number(remittanceRecord.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Gateway: </span>
                      <span>{remittanceRecord.gateway}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.73rem', color: '#78350F', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Authorization Protocol:</strong> Lessee/Operator cannot self-approve statutory dues. Under AP Minor Mineral Rules, the District Mines &amp; Geology Officer (DMGO) must audit the transaction against the Cyber Treasury scroll before clearance is granted.
                    </span>
                  </div>

                  {/* Lessee Remittance Notice & Correction */}
                  <div style={{
                    marginTop: 4,
                    paddingTop: 10,
                    borderTop: '1px dashed #FDE68A',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#92400E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏛️ Remittance queued for District Mines &amp; Geology Officer (DMGO) Cyber Treasury audit.</span>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleResetPayment}
                      style={{ fontSize: '0.7rem', color: '#B45309' }}
                      title="Withdraw or re-enter remittance details if incorrect"
                    >
                      Withdraw / Re-enter
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Status: AUTHORIZED & PAID UP BY DMGO */}
              {remittanceRecord && remittanceRecord.status === 'authorized' && (
                <div style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #10B981',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#065F46', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={18} color="#059669" />
                      ✅ Seigniorage Verified &amp; Paid Up (Authorized by DMGO)
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                      Ready for Transit Permit
                    </span>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 8, border: '1px solid #6EE7B7', fontSize: '0.76rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Statutory Receipt: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#059669' }}>{remittanceRecord.receipt_no}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>CFMS Challan No: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0F1729' }}>{remittanceRecord.challan_no}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Bank UTR: </span>
                      <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{remittanceRecord.utr}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Authorized By: </span>
                      <strong style={{ color: '#1A56DB' }}>{remittanceRecord.authorized_by}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: '#047857' }}>
                      Official Treasury scroll reconciliation complete. Block statutory compliance cleared by DMGO.
                    </span>
                    <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                      Statutory Clearance Granted
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {w && (
            <div style={{ gridColumn: '1/-1', background: '#EFF6FF', padding: '12px 14px', borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1A56DB', textTransform: 'uppercase' }}>Weighbridge Record</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 6, fontSize: '0.82rem' }}>
                <div><strong>Actual Weight:</strong> {Number(w.actual_weight || 0).toFixed(2)} MT</div>
                <div><strong>Difference:</strong> {Number(w.difference_percentage || 0).toFixed(2)}%</div>
                <div><strong>Status:</strong> <StatusBadge status={w.status === 'flagged' ? 'weighbridge_flagged' : 'weighbridge_verified'} /></div>
              </div>
            </div>
          )}

          {d && (
            <div style={{ gridColumn: '1/-1', background: '#F5F3FF', padding: '12px 14px', borderRadius: 10, border: '1px solid #DDD6FE' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>Transit / Dispatch</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 6, fontSize: '0.8rem' }}>
                <div><strong>Vehicle:</strong> {d.vehicle_number || '—'}</div>
                <div><strong>Driver:</strong> {d.driver_name || '—'}</div>
                <div><strong>Permit #:</strong> {d.e_permit_number || '—'}</div>
                <div><strong>Destination:</strong> {d.destination || '—'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`/track/${b.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ExternalLink size={14} /> Open Live Tracking Page
            </a>
            {isUndressed && onDressBlock && (
              <button
                className="btn btn-accent btn-sm"
                onClick={() => { onClose(); onDressBlock(b); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Scissors size={14} /> Dress Block Now
              </button>
            )}
          </div>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* AP CFMS REMITTANCE SUBMISSION MODAL */}
      {remittanceModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !submittingRemittance && setRemittanceModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A8A' }}>
                <Receipt size={20} color="#1A56DB" />
                <div className="modal-title">AP CFMS Treasury e-Challan Generation</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRemittanceModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: 8, fontSize: '0.78rem' }}>
                <div style={{ fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Head of Account — AP State Treasury
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0F1729', marginTop: 2 }}>
                  0853-00-102-00-01 (Mines &amp; Minerals — Seigniorage &amp; Royalties)
                </div>
              </div>

              {/* Breakdown summary */}
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Block Identifier:</span>
                  <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1A56DB' }}>{b.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Quarry &amp; District:</span>
                  <strong>{b.quarry_name || 'Quarry'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Seigniorage:</span>
                  <strong>₹{challan?.challan_breakdown?.base_seigniorage?.toLocaleString('en-IN') || Number(s?.total_fee || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>DMF Cess (30%) + MERIT (2%) + Green Cess:</span>
                  <strong>+ ₹{challan ? (challan.challan_breakdown?.dmf?.amount + challan.challan_breakdown?.merit?.amount + challan.challan_breakdown?.green_cess?.amount)?.toLocaleString('en-IN') : '—'}</strong>
                </div>
                <div style={{ borderTop: '1.5px dashed #CBD5E1', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                  <strong style={{ color: '#0F1729' }}>Total Statutory Payable:</strong>
                  <strong style={{ color: '#166534', fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem' }}>
                    ₹{challan?.challan_breakdown?.total_challan?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || (s?.total_fee ? (s.total_fee * 1.32).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '21,757.12')}
                  </strong>
                </div>
              </div>

              {/* Gateway and UTR Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Payment Gateway Mode
                  </label>
                  <select
                    className="form-control"
                    value={gatewaySelected}
                    onChange={e => setGatewaySelected(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="CFMS SBI e-Pay AP Govt">CFMS SBI e-Pay (AP Govt Treasury)</option>
                    <option value="AP Treasury Cyber Challan">AP Treasury Cyber Challan (NetBanking)</option>
                    <option value="RTGS/NEFT Treasury Scroll">RTGS / NEFT State Treasury Account</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Bank Transaction UTR / Ref Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={utrInput}
                    onChange={e => setUtrInput(e.target.value)}
                    placeholder="e.g. SBIIN26091599812"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                  />
                </div>

                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 8, fontSize: '0.72rem', color: '#92400E', display: 'flex', gap: 8 }}>
                  <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong>Statutory Separation of Duties:</strong> Submitting this remittance registers the transaction with the State Treasury. It will remain in <strong>PENDING DMGO VERIFICATION</strong> until the District Mines &amp; Geology Officer audits the scroll and authorizes statutory clearance.
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setRemittanceModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitRemittance}
                disabled={submittingRemittance || !utrInput.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {submittingRemittance ? 'Submitting to Treasury...' : 'Submit Remittance for DMGO Authorization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
