import React, { useState } from 'react';
import { api } from '../api';
import StatusBadge from './StatusBadge';
import PermitCard from './PermitCard';
import StepTracker from './StepTracker';
import LiveBadge from './LiveBadge';
import {
  Truck, CheckCircle, Clock, AlertCircle, Eye, Copy,
  ShieldCheck, FileCheck, Lock, Download, ArrowRight, Info, Navigation
} from 'lucide-react';
import TransitTracker from './TransitTracker';

// Blocks the operator must assign transport for (DMGO approved but no permit yet)
const NEEDS_ASSIGNMENT = ['dmgo_approved'];
// Blocks that already have a sealed e-Permit from DMGO
const PERMIT_SEALED = ['permit_ready', 'weighbridge_approved'];

export default function OperatorDispatch({ blocks = [], onActionCompleted }) {
  const [form, setForm] = useState({ blockId: '', vehicleNumber: '', driverName: '', destination: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [previewBlockId, setPreviewBlockId] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [trackingBlockId, setTrackingBlockId] = useState(null);

  // Split blocks by workflow stage
  const assignmentBlocks = blocks.filter(b => NEEDS_ASSIGNMENT.includes(b.status));
  const sealedBlocks     = blocks.filter(b => PERMIT_SEALED.includes(b.status));
  const approvedBlocks   = blocks.filter(b => [...NEEDS_ASSIGNMENT, ...PERMIT_SEALED].includes(b.status));
  const dispatchedBlocks = blocks.filter(b => ['dispatched', 'weighbridge_verified', 'delivered'].includes(b.status));

  // Active block for the right-panel permit preview
  const activeBlock = blocks.find(b => b.id === (previewBlockId || form.blockId)) || approvedBlocks[0] || null;

  // Whether the active block already has a sealed permit
  const activeIsSealed = activeBlock ? PERMIT_SEALED.includes(activeBlock.status) : false;

  const handleSelectBlock = (bId) => {
    setForm(p => ({ ...p, blockId: bId, vehicleNumber: '', driverName: '', destination: '' }));
    setPreviewBlockId(bId);
    setMsg('');
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Submit transport assignment for DMGO-approved (not yet permit-ready) blocks
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await api.requestDispatch(form);
      setMsg('✅ Dispatch request submitted! Transit Pass is now being issued.');
      setForm({ blockId: '', vehicleNumber: '', driverName: '', destination: '' });
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Dispatch request failed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm dispatch of an already-sealed permit block
  const handleConfirmDispatch = async () => {
    if (!activeBlock) return;
    setConfirming(true);
    setMsg('');
    try {
      await api.requestDispatch({
        blockId: activeBlock.id,
        vehicleNumber: activeBlock.dispatch?.vehicle_number || '',
        driverName:    activeBlock.dispatch?.driver_name    || '',
        destination:   activeBlock.dispatch?.destination    || '',
      });
      setMsg('✅ Block dispatched! Vehicle is now in transit.');
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Dispatch confirmation failed'));
    } finally {
      setConfirming(false);
    }
  };

  // Step tracker current step
  const stepCurrent = activeIsSealed ? 3 : (form.blockId ? 2 : 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'slideInUp 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Dispatch &amp; e-Transit Passes</h1>
            <LiveBadge label="DISPATCH ACTIVE" />
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Generate statutory transit passes under AP Minor Mineral Rules and assign transport vehicles
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '6px 14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Ready to Dispatch</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#065F46' }}>{approvedBlocks.length}</div>
          </div>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#1D4ED8', fontWeight: 700, textTransform: 'uppercase' }}>In Transit</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1E40AF' }}>{dispatchedBlocks.length}</div>
          </div>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} color="#1A56DB" />
          Statutory Dispatch Workflow
        </div>
        <StepTracker
          steps={['1. DMGO Approval', '2. Vehicle Assignment', '3. Transit Pass Issued', '4. Road Checkpoint', '5. Weighbridge Cross-Check']}
          current={stepCurrent}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Global message banner */}
          {msg && (
            <div className={`alert ${msg.startsWith('✅') ? 'alert-green' : 'alert-rose'}`}>
              {msg.startsWith('✅') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {msg}
            </div>
          )}

          {/* ── CASE A: Active block is PERMIT READY — show read-only confirm panel ── */}
          {activeIsSealed && activeBlock ? (
            <div className="card" style={{ border: '2px solid #059669', boxShadow: '0 4px 16px rgba(5,150,105,0.10)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Lock size={18} color="#059669" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                  e-Permit Sealed by DMGO
                </h3>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 800,
                  background: '#ECFDF5', color: '#059669', padding: '3px 10px', borderRadius: 20,
                  border: '1px solid #A7F3D0',
                }}>✓ PERMIT READY</span>
              </div>

              {/* Info callout */}
              <div style={{
                background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <Info size={15} color="#059669" style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: '0.77rem', color: '#065F46', lineHeight: 1.5 }}>
                  The DMGO has already sealed this e-Permit with all transport details. No re-entry required.
                  Click <strong>Confirm Dispatch</strong> to mark the vehicle as departed.
                </div>
              </div>

              {/* Read-only transport details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 20 }}>
                {[
                  { label: 'Block ID', value: activeBlock.id, mono: true },
                  { label: 'Permit No.', value: activeBlock.dispatch?.e_permit_number || activeBlock.dispatch?.transit_form_no || `APMG-${activeBlock.id?.replace('BLK-', '')}`, mono: true },
                  { label: 'Vehicle Number', value: activeBlock.dispatch?.vehicle_number || '—', mono: true },
                  { label: 'Driver Name', value: activeBlock.dispatch?.driver_name || '—' },
                  { label: 'Destination', value: activeBlock.dispatch?.destination || '—' },
                  { label: 'Valid Until', value: activeBlock.dispatch?.valid_until
                    ? new Date(activeBlock.dispatch.valid_until).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—' },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 700, color: '#0F172A',
                      fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
                      background: '#F8FAFC', border: '1px solid #E2E8F0',
                      borderRadius: 7, padding: '6px 10px',
                    }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleConfirmDispatch}
                  disabled={confirming}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px 18px', fontWeight: 800 }}
                >
                  {confirming
                    ? 'Confirming…'
                    : <><Truck size={17} /> Confirm Dispatch &amp; Send to Transit</>}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn"
                  style={{
                    padding: '12px 14px', fontWeight: 700, border: '1.5px solid #1A56DB',
                    color: '#1A56DB', background: '#EFF6FF', borderRadius: 10,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  title="Print / Download e-Permit"
                >
                  <Download size={17} /> Print
                </button>
              </div>
            </div>
          ) : (
            /* ── CASE B: Block needs transport assignment (dmgo_approved status) ── */
            <div className="card card-blue" style={{ boxShadow: '0 4px 16px rgba(26,86,219,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={20} color="#1A56DB" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                    Assign Transport Details
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Sec. 21 MMDR Compliant</span>
              </div>

              {/* Info note for operator */}
              <div style={{
                background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <Info size={15} color="#1A56DB" style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: '0.77rem', color: '#1E3A8A', lineHeight: 1.5 }}>
                  These blocks are <strong>DMGO Approved</strong> but not yet permit-sealed.
                  Enter the vehicle and driver details — DMGO will review and seal the e-Permit.
                </div>
              </div>

              {assignmentBlocks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#64748B' }}>
                  <CheckCircle size={32} color="#A7F3D0" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>All approved blocks already have permits sealed.</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>Select a PERMIT READY block above to confirm dispatch.</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Select Block (DMGO Approved)</label>
                    <select
                      className="form-control"
                      value={form.blockId}
                      onChange={e => handleSelectBlock(e.target.value)}
                      required
                      style={{ fontWeight: 600 }}
                    >
                      <option value="">— Choose an approved block —</option>
                      {assignmentBlocks.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.id} — {b.seigniorage?.granite_type || 'Granite'} ({b.measurement?.volume?.toFixed(2) || '?'} m³)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Transport Vehicle Number</label>
                    <input
                      className="form-control"
                      placeholder="e.g. AP 39 AX 1234"
                      value={form.vehicleNumber}
                      onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                      required
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>Driver Name</label>
                      <input
                        className="form-control"
                        placeholder="Full name"
                        value={form.driverName}
                        onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>Destination / Consignee</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Chennai Port / Cutting Unit"
                        value={form.destination}
                        onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ justifyContent: 'center', marginTop: 6, padding: '12px 18px', fontWeight: 800 }}
                  >
                    {submitting ? 'Submitting to DMGO…' : <><ArrowRight size={18} /> Submit Transport Details to DMGO</>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Approved Blocks List ── */}
          <div className="card card-green">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCheck size={18} color="#059669" />
                Approved Blocks ({approvedBlocks.length})
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 600 }}>Click to preview e-Permit</span>
            </div>

            {approvedBlocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#1E3A8A' }}>
                <Clock size={32} color="#93C5FD" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No blocks awaiting dispatch.</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Submit blocks for DMGO check measurement first.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {approvedBlocks.map(b => {
                  const isSel = (previewBlockId || form.blockId) === b.id;
                  const isSealed = PERMIT_SEALED.includes(b.status);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBlock(b.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 10,
                        background: isSel ? (isSealed ? '#F0FDF4' : '#E0F2FE') : '#F8FAFC',
                        border: `1.5px solid ${isSel ? (isSealed ? '#059669' : '#1A56DB') : '#E2E8F0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace" }}>
                            {b.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCopy(b.id); }}
                            title="Copy Block ID"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B' }}
                          >
                            <Copy size={13} color={copiedId === b.id ? '#059669' : '#64748B'} />
                          </button>
                          {/* Badge indicating sealed vs needs assignment */}
                          {isSealed && (
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 800, color: '#059669',
                              background: '#ECFDF5', border: '1px solid #A7F3D0',
                              padding: '1px 6px', borderRadius: 10,
                            }}>✓ PERMIT SEALED</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: 2 }}>
                          {b.seigniorage?.granite_type || 'Granite'} · {b.measurement?.volume?.toFixed(3) || '?'} m³ · ₹{Number(b.seigniorage?.total_fee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={b.status} />
                        <Eye size={16} color={isSel ? '#1A56DB' : '#94A3B8'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Transit Pass Preview ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={18} color="#1A56DB" />
              Transit Pass (e-Permit) Preview
            </h3>
            {activeBlock && (
              <span style={{ fontSize: '0.75rem', color: '#1A56DB', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                {activeBlock.id}
              </span>
            )}
          </div>

          {activeBlock ? (
            <div>
              <PermitCard
                block={{
                  ...activeBlock,
                  dispatch: {
                    ...(activeBlock.dispatch || {}),
                    // For permit-sealed blocks use the DMGO-sealed values only
                    // For assignment-stage blocks, show form preview values
                    vehicle_number: activeIsSealed
                      ? activeBlock.dispatch?.vehicle_number
                      : (form.vehicleNumber || activeBlock.dispatch?.vehicle_number || 'AP 39 AX 1234'),
                    destination: activeIsSealed
                      ? activeBlock.dispatch?.destination
                      : (form.destination || activeBlock.dispatch?.destination || 'Designated Processing Unit'),
                    driver_name: activeIsSealed
                      ? activeBlock.dispatch?.driver_name
                      : (form.driverName || activeBlock.dispatch?.driver_name || 'Authorized Driver'),
                    dispatch_time: activeBlock.dispatch?.dispatch_time || new Date().toISOString(),
                  }
                }}
              />

              <div style={{
                marginTop: 14, padding: '12px 16px', borderRadius: 10,
                background: '#FEF3C7', border: '1px solid #FDE68A',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <AlertCircle size={16} color="#D97706" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: '0.75rem', color: '#92400E', lineHeight: 1.4 }}>
                  <strong>Mandatory Checkpoint Requirement:</strong> Transport vehicles must stop at all designated AP Mines checkposts and weighbridges along NH-16 / State Highways. QR code on pass is scanned for instant verification.
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <Clock size={36} color="#CBD5E1" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Select an approved block on the left to preview its statutory transit pass.</p>
            </div>
          )}

          {/* Dispatched blocks widget */}
          {dispatchedBlocks.length > 0 && (
            <div className="card" style={{ border: '1px solid #E2E8F0', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F1729', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Recently Dispatched ({dispatchedBlocks.length})</span>
                <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>● IN TRANSIT</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {dispatchedBlocks.slice(0, 5).map(db => (
                  <div key={db.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#F8FAFC', borderRadius: 6, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#1E293B' }}>{db.id}</span>
                      <span style={{ color: '#64748B' }}>{db.dispatch?.vehicle_number || 'En Route'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={db.status} />
                      <button 
                        onClick={() => setTrackingBlockId(db.id)}
                        title="Track Transit"
                        style={{ 
                          background: 'none', border: 'none', color: '#3B82F6', 
                          cursor: 'pointer', padding: 4, display: 'flex' 
                        }}
                      >
                        <Navigation size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
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
