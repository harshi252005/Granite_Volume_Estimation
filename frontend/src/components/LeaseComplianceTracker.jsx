import React, { useState, useMemo, useRef } from 'react';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock, Upload,
  Calendar, Shield, RefreshCw, ChevronRight, Download, ExternalLink,
  Bell, Info, Award, Layers, MapPin, User, FileSpreadsheet, X, Check,
  FileUp
} from 'lucide-react';

// ── Compliance Document Types ─────────────────────────────────────────────────
const DOCUMENT_TYPES = [
  {
    id: 'lease_deed',
    label: 'Quarry Lease Deed (Form A)',
    category: 'Statutory',
    mandatory: true,
    desc: 'Original lease agreement issued by the Collector under Rule 8 of AP Minor Minerals Rules',
    renewalPeriod: 'Once (non-renewable — new application required)',
  },
  {
    id: 'form_c',
    label: 'Form-C (Removal Permit Book)',
    category: 'Statutory',
    mandatory: true,
    desc: 'Transport permit book for each dispatch — must be obtained from DMGO before any removal',
    renewalPeriod: 'Per Quarter',
  },
  {
    id: 'form_d',
    label: 'Form-D (Monthly Production Report)',
    category: 'Statutory',
    mandatory: true,
    desc: 'Monthly production statement to be submitted to DMGO by the 5th of each month',
    renewalPeriod: 'Monthly',
  },
  {
    id: 'envt_clearance',
    label: 'Environmental Clearance (EC)',
    category: 'Environmental',
    mandatory: true,
    desc: 'Ministry of Environment clearance for operations — required for leases > 5 hectares',
    renewalPeriod: 'Every 5 Years',
  },
  {
    id: 'consent_operate',
    label: 'Consent to Operate (CTO) — AP Pollution Board',
    category: 'Environmental',
    mandatory: true,
    desc: 'AP PCB consent under Air & Water Acts — required for crushers and processing units',
    renewalPeriod: 'Annually',
  },
  {
    id: 'forest_clearance',
    label: 'Forest Clearance (if applicable)',
    category: 'Environmental',
    mandatory: false,
    desc: 'Required only if quarry area falls within Reserved / Protected Forest boundary',
    renewalPeriod: 'Once',
  },
  {
    id: 'stability_cert',
    label: 'Slope Stability Certificate',
    category: 'Safety',
    mandatory: true,
    desc: 'Certified by a DGMS-approved geotechnical engineer — mandatory under Mines Act 1952',
    renewalPeriod: 'Every 3 Years',
  },
  {
    id: 'first_aid',
    label: 'First Aid & Safety Register',
    category: 'Safety',
    mandatory: true,
    desc: 'Maintained on-site as per Metalliferous Mines Regulations 1961',
    renewalPeriod: 'Ongoing',
  },
  {
    id: 'seigniorage_paid',
    label: 'Seigniorage Payment Challan',
    category: 'Financial',
    mandatory: true,
    desc: 'Proof of royalty payment to AP Treasury — required before each transport permit',
    renewalPeriod: 'Per Dispatch',
  },
  {
    id: 'labour_license',
    label: 'Labour Licence (Contract Labour Act)',
    category: 'Labour',
    mandatory: true,
    desc: 'If employing 20+ workers through contractors — from Labour Commissioner',
    renewalPeriod: 'Annually',
  },
  {
    id: 'pf_esi',
    label: 'PF / ESI Registration',
    category: 'Labour',
    mandatory: false,
    desc: 'Required for quarries employing 20 or more workers on payroll',
    renewalPeriod: 'Once',
  },
  {
    id: 'blasting_license',
    label: 'Blasting Licence (Explosives Act)',
    category: 'Safety',
    mandatory: false,
    desc: 'Required only if quarry uses controlled blasting — from Chief Inspector of Explosives',
    renewalPeriod: 'Annually',
  },
];

const CATEGORY_COLORS = {
  Statutory:    { bg: '#EFF6FF', text: '#1A56DB', border: '#BFDBFE' },
  Environmental:{ bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  Safety:       { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  Financial:    { bg: '#FAF5FF', text: '#7C3AED', border: '#DDD6FE' },
  Labour:       { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
};

// Mock lease info — in production this would come from API
const MOCK_LEASE = {
  leaseNo: 'QL/PKM/2019/047',
  quarryName: 'Markapur Black Galaxy Quarry',
  district: 'Prakasam',
  mandal: 'Markapur',
  area: '4.82 Hectares',
  mineral: 'Granite (Black Galaxy)',
  lesseeId: 'LESSEE-PKM-2019-047',
  leaseStart: '2019-04-01',
  leaseEnd: '2024-03-31',
  status: 'renewal_pending',
  royaltyPaid: 2847000,
  productionMT: 1842,
  productionLimit: 5000,
};

const STATUS_CONFIG = {
  compliant:    { icon: CheckCircle,    color: '#10B981', bg: '#F0FDF4', label: 'Compliant',       border: '#6EE7B7' },
  expiring_soon:{ icon: AlertTriangle,  color: '#F59E0B', bg: '#FFFBEB', label: 'Expiring Soon',   border: '#FDE68A' },
  expired:      { icon: XCircle,        color: '#EF4444', bg: '#FEF2F2', label: 'Expired / Overdue',border: '#FECACA' },
  pending:      { icon: Clock,          color: '#6366F1', bg: '#EEF2FF', label: 'Pending Upload',   border: '#C7D2FE' },
  not_required: { icon: Info,           color: '#94A3B8', bg: '#F8FAFC', label: 'Not Required',     border: '#E2E8F0' },
};

// Default initial document statuses
const DEFAULT_DOC_STATUS = {
  lease_deed:      { status: 'expired',       expiryDate: '2024-03-31', lastUpdated: '2019-04-01', uploadedFile: 'lease_deed_2019.pdf' },
  form_c:          { status: 'compliant',     expiryDate: '2026-12-31', lastUpdated: '2026-09-01', uploadedFile: 'form_c_q3_2026.pdf' },
  form_d:          { status: 'pending',       expiryDate: null,         lastUpdated: '2026-07-31', uploadedFile: null },
  envt_clearance:  { status: 'expiring_soon', expiryDate: '2026-10-15', lastUpdated: '2021-10-15', uploadedFile: 'ec_mef_2021.pdf' },
  consent_operate: { status: 'compliant',     expiryDate: '2027-03-31', lastUpdated: '2026-04-01', uploadedFile: 'cto_appcb_2026.pdf' },
  forest_clearance:{ status: 'not_required',  expiryDate: null,         lastUpdated: null,          uploadedFile: null },
  stability_cert:  { status: 'compliant',     expiryDate: '2027-06-30', lastUpdated: '2024-07-01', uploadedFile: 'slope_stability_2024.pdf' },
  first_aid:       { status: 'compliant',     expiryDate: null,         lastUpdated: '2026-01-01', uploadedFile: 'first_aid_register.pdf' },
  seigniorage_paid:{ status: 'compliant',     expiryDate: null,         lastUpdated: '2026-09-01', uploadedFile: 'challan_sep_2026.pdf' },
  labour_license:  { status: 'expiring_soon', expiryDate: '2026-10-01', lastUpdated: '2025-10-01', uploadedFile: 'labour_lic_2025.pdf' },
  pf_esi:          { status: 'not_required',  expiryDate: null,         lastUpdated: null,          uploadedFile: null },
  blasting_license:{ status: 'not_required',  expiryDate: null,         lastUpdated: null,          uploadedFile: null },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DocRow({ doc, docStatus, onUpload, onDownload }) {
  const cfg   = STATUS_CONFIG[docStatus.status] || STATUS_CONFIG.pending;
  const Icon  = cfg.icon;
  const catCfg = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Statutory;
  const days  = daysUntil(docStatus.expiryDate);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: `1.5px solid ${expanded ? cfg.border : '#E2E8F0'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'all 0.18s ease',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: expanded ? cfg.bg : '#fff',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        <Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F1729' }}>{doc.label}</span>
            {doc.mandatory && (
              <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '1px 6px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mandatory</span>
            )}
            <span style={{ fontSize: '0.65rem', fontWeight: 700, background: catCfg.bg, color: catCfg.text, border: `1px solid ${catCfg.border}`, padding: '1px 7px', borderRadius: 20 }}>
              {doc.category}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
            {docStatus.expiryDate && days !== null && (
              <span style={{ fontWeight: 700, color: days < 30 ? (days < 0 ? '#EF4444' : '#F59E0B') : '#10B981' }}>
                {days < 0 ? `Expired ${Math.abs(days)} days ago` : days === 0 ? 'Expires today!' : `Expires in ${days} days`}
                {' · '}
              </span>
            )}
            {docStatus.expiryDate ? `Due: ${new Date(docStatus.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : doc.renewalPeriod}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            whiteSpace: 'nowrap',
          }}>
            {cfg.label}
          </span>
          <ChevronRight size={15} color="#94A3B8" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0', background: '#FAFBFD' }}>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, margin: '0 0 12px' }}>{doc.desc}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {docStatus.uploadedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                <FileText size={13} />
                <span>{docStatus.uploadedFile}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(doc, docStatus);
                  }}
                  title="Download / View document"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', padding: '2px 4px', marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}
                >
                  <Download size={14} />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>No document uploaded</span>
            )}
            {docStatus.status !== 'not_required' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpload(doc);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: '1.5px solid #1A56DB',
                  background: '#EFF6FF', color: '#1A56DB', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1A56DB'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1A56DB'; }}
              >
                <Upload size={13} />
                {docStatus.uploadedFile ? 'Re-upload / Update' : 'Upload Document'}
              </button>
            )}
          </div>
          {docStatus.lastUpdated && (
            <div style={{ marginTop: 10, fontSize: '0.7rem', color: '#94A3B8' }}>
              Last updated: {new Date(docStatus.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Upload & Update Modal Dialog ──────────────────────────────────────────────
function UploadDocModal({ doc, docStatus, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState(() => {
    if (docStatus.expiryDate) {
      const current = new Date(docStatus.expiryDate);
      if (current < new Date()) {
        const next = new Date();
        if (doc.renewalPeriod?.includes('Quarter')) next.setMonth(next.getMonth() + 3);
        else if (doc.renewalPeriod?.includes('Monthly')) next.setMonth(next.getMonth() + 1);
        else if (doc.renewalPeriod?.includes('5 Years')) next.setFullYear(next.getFullYear() + 5);
        else if (doc.renewalPeriod?.includes('3 Years')) next.setFullYear(next.getFullYear() + 3);
        else next.setFullYear(next.getFullYear() + 1);
        return next.toISOString().split('T')[0];
      }
      return docStatus.expiryDate;
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [referenceNo, setReferenceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file && !docStatus.uploadedFile) {
      alert('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSave({
        file: file || null,
        fileName: file ? file.name : docStatus.uploadedFile,
        expiryDate: expiryDate || null,
        referenceNo,
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 14,
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1A56DB',
            }}>
              <FileUp size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F1729' }}>
                {docStatus.uploadedFile ? 'Re-upload / Update Document' : 'Upload Compliance Document'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>
                {doc.label} · <span style={{ fontWeight: 700 }}>{doc.category}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center',
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Statutory note */}
          <div style={{
            background: '#F1F5F9',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: '0.75rem',
            color: '#475569',
            marginBottom: 16,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: '#0F1729' }}>Statutory Rule:</strong> {doc.desc}
          </div>

          {/* Current file info */}
          {docStatus.uploadedFile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.75rem',
            }}>
              <span style={{ color: '#64748B' }}>Current active file:</span>
              <span style={{ fontWeight: 700, color: '#0F1729' }}>{docStatus.uploadedFile}</span>
            </div>
          )}

          {/* File selector box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #CBD5E1',
              borderRadius: 10,
              padding: '20px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? '#F0FDF4' : '#FAFBFD',
              borderColor: file ? '#86EFAC' : '#CBD5E1',
              transition: 'all 0.15s ease',
              marginBottom: 16,
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
            />
            <Upload size={28} color={file ? '#10B981' : '#64748B'} style={{ margin: '0 auto 8px', display: 'block' }} />
            {file ? (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
                  ✓ {file.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change file
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                  Click to select scanned document
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>
                  Supported formats: PDF, DOCX, JPG, PNG (Max 15MB)
                </div>
              </div>
            )}
          </div>

          {/* Renewal / Expiry Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              Validity / Expiry Date (Renewal Due Date)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: '0.82rem',
                color: '#0F1729',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 3, display: 'block' }}>
              Renewal cycle: {doc.renewalPeriod}
            </span>
          </div>

          {/* Reference Number */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              Filing / Permit Reference Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. DMGO/PKM/2026/R-412"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: '0.82rem',
                color: '#0F1729',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                background: '#fff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#1A56DB',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(26, 86, 219, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Check size={14} /> Submit &amp; Verify
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Lease Compliance Tracker Component ───────────────────────────────────
export default function LeaseComplianceTracker({ user }) {
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [uploadModalDoc, setUploadModalDoc] = useState(null);
  const [toast, setToast] = useState(null);

  // Persistent document statuses across sessions
  const [docStatuses, setDocStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_granite_lease_compliance_docs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read compliance docs from localStorage', e);
    }
    return DEFAULT_DOC_STATUS;
  });

  const lease = MOCK_LEASE;

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Summary stats based on active state
  const stats = useMemo(() => {
    const statuses = Object.values(docStatuses);
    return {
      compliant:    statuses.filter(s => s.status === 'compliant').length,
      expiring:     statuses.filter(s => s.status === 'expiring_soon').length,
      expired:      statuses.filter(s => s.status === 'expired').length,
      pending:      statuses.filter(s => s.status === 'pending').length,
      not_required: statuses.filter(s => s.status === 'not_required').length,
    };
  }, [docStatuses]);

  const complianceScore = Math.round(
    ((stats.compliant) / (DOCUMENT_TYPES.filter(d => d.mandatory).length)) * 100
  );

  const leaseExpiry = daysUntil(lease.leaseEnd);
  const productionPct = Math.min((lease.productionMT / lease.productionLimit) * 100, 100);

  const filteredDocs = DOCUMENT_TYPES.filter(doc => {
    const ds = docStatuses[doc.id] || { status: 'pending' };
    if (filterCategory !== 'ALL' && doc.category !== filterCategory) return false;
    if (filterStatus !== 'ALL' && ds.status !== filterStatus) return false;
    return true;
  });

  // Handle document upload / re-upload modal submit
  const handleSaveDoc = (data) => {
    if (!uploadModalDoc) return;
    const docId = uploadModalDoc.id;
    const days = daysUntil(data.expiryDate);

    let newStatus = 'compliant';
    if (data.expiryDate) {
      if (days < 0) newStatus = 'expired';
      else if (days <= 30) newStatus = 'expiring_soon';
      else newStatus = 'compliant';
    }

    setDocStatuses(prev => {
      const next = {
        ...prev,
        [docId]: {
          status: newStatus,
          expiryDate: data.expiryDate,
          lastUpdated: new Date().toISOString().split('T')[0],
          uploadedFile: data.fileName,
          referenceNo: data.referenceNo || prev[docId]?.referenceNo || null,
        }
      };
      try {
        localStorage.setItem('smart_granite_lease_compliance_docs', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save to localStorage', err);
      }
      return next;
    });

    showToast('success', `Successfully updated and verified ${uploadModalDoc.label}!`);
  };

  // Export all compliance records to Excel (.csv with UTF-8 BOM)
  const handleExportExcel = () => {
    const headers = [
      'Sl No',
      'Document ID',
      'Document Name',
      'Category',
      'Mandatory (AP MMR 1966)',
      'Compliance Status',
      'Expiry / Renewal Due Date',
      'Days Status',
      'Renewal Frequency',
      'Uploaded File Name',
      'Last Updated',
      'Statutory Description'
    ];

    const rows = DOCUMENT_TYPES.map((doc, idx) => {
      const ds = docStatuses[doc.id] || { status: 'pending', expiryDate: null, lastUpdated: null, uploadedFile: null };
      const days = daysUntil(ds.expiryDate);
      let daysText = 'N/A';
      if (ds.expiryDate && days !== null) {
        if (days < 0) daysText = `Expired ${Math.abs(days)} days ago`;
        else if (days === 0) daysText = 'Expires Today';
        else daysText = `${days} days remaining`;
      }
      const statusLabel = STATUS_CONFIG[ds.status]?.label || ds.status;

      return [
        idx + 1,
        doc.id,
        doc.label,
        doc.category,
        doc.mandatory ? 'MANDATORY' : 'OPTIONAL',
        statusLabel,
        ds.expiryDate || 'N/A',
        daysText,
        doc.renewalPeriod,
        ds.uploadedFile || 'None',
        ds.lastUpdated || 'Not Updated',
        doc.desc
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // UTF-8 BOM so Excel opens it with proper columns & accents on Windows
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `AP_Mines_Lease_Compliance_Report_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', 'Lease compliance records exported to Excel successfully!');
  };

  // Download official certificate / record receipt
  const handleDownloadDoc = (doc, ds) => {
    const fileName = ds.uploadedFile || `${doc.id}_certificate.pdf`;
    const content = `========================================================================\n` +
      `GOVERNMENT OF ANDHRA PRADESH - DEPARTMENT OF MINES & GEOLOGY\n` +
      `OFFICIAL COMPLIANCE CERTIFICATE / FILING RECORD\n` +
      `========================================================================\n\n` +
      `Document Name:      ${doc.label}\n` +
      `Document ID:        ${doc.id.toUpperCase()}\n` +
      `Category:           ${doc.category}\n` +
      `Mandatory:          ${doc.mandatory ? 'YES (Rule 8 / 37 APMMR 1966)' : 'NO'}\n` +
      `Compliance Status:  ${STATUS_CONFIG[ds.status]?.label || ds.status}\n` +
      `Expiry Date:        ${ds.expiryDate || 'N/A'}\n` +
      `Last Updated:       ${ds.lastUpdated || new Date().toISOString().split('T')[0]}\n` +
      `File Name:          ${fileName}\n\n` +
      `Quarry Name:        ${lease.quarryName}\n` +
      `Lease No:           ${lease.leaseNo}\n` +
      `Location:           ${lease.mandal}, ${lease.district} District\n` +
      `Lessee:             Ravi Kumar (Leaseholder)\n\n` +
      `Statutory Rule:\n${doc.desc}\n\n` +
      `========================================================================\n` +
      `This is a verified digital copy stored in Smart Granite DMGO Portal.\n` +
      `Generated on: ${new Date().toLocaleString('en-IN')}\n` +
      `========================================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('success', `Downloading document: ${fileName}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Lease & Compliance Tracker</h1>
            <span className="badge badge-blue">AP Mines Rules 1966</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Track lease validity, statutory filings, environmental clearances & document compliance
          </p>
        </div>

        {/* Action Buttons: Export Excel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            id="export-excel-btn"
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              background: '#10B981',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.28)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <FileSpreadsheet size={17} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Lease Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: 14,
        padding: '18px 22px',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(15,23,42,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ background: '#2563EB', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                Active Lease
              </span>
              <span style={{
                background: leaseExpiry < 0 ? 'rgba(239,68,68,0.2)' : leaseExpiry < 180 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                border: `1px solid ${leaseExpiry < 0 ? '#EF4444' : leaseExpiry < 180 ? '#F59E0B' : '#10B981'}`,
                color: leaseExpiry < 0 ? '#FCA5A5' : leaseExpiry < 180 ? '#FCD34D' : '#34D399',
                fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20,
              }}>
                {leaseExpiry < 0 ? `Expired ${Math.abs(leaseExpiry)} days ago — Renewal Required` : `Valid · ${leaseExpiry} days remaining`}
              </span>
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 900, color: '#F8FAFC' }}>{lease.quarryName}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: '#94A3B8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {lease.mandal}, {lease.district}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Layers size={12} /> {lease.area}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Award size={12} /> {lease.mineral}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> {lease.leaseNo}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minWidth: 280 }}>
            {[
              { label: 'Lease Period',     value: `${new Date(lease.leaseStart).getFullYear()}–${new Date(lease.leaseEnd).getFullYear()}`, icon: Calendar },
              { label: 'Royalty Paid',     value: `₹${(lease.royaltyPaid / 100000).toFixed(1)}L`, icon: Shield },
              { label: 'Production (MT)',  value: `${lease.productionMT.toLocaleString()} / ${lease.productionLimit.toLocaleString()}`, icon: Layers },
              { label: 'Compliance Score', value: `${complianceScore}%`, icon: Award },
            ].map(({ label, value, icon: I }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <I size={10} /> {label}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#F8FAFC', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Production progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8', marginBottom: 5 }}>
            <span>Annual Production Quota</span>
            <span style={{ fontWeight: 700, color: productionPct > 80 ? '#FCD34D' : '#34D399' }}>
              {productionPct.toFixed(1)}% used
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${productionPct}%`,
              height: '100%',
              background: productionPct > 90 ? '#EF4444' : productionPct > 75 ? '#F59E0B' : 'linear-gradient(90deg, #10B981, #34D399)',
              borderRadius: 3,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Status Summary Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          { key: 'ALL',          label: 'All Documents',     count: DOCUMENT_TYPES.length, color: '#1A56DB',  bg: '#EFF6FF' },
          { key: 'compliant',    label: 'Compliant',         count: stats.compliant,       color: '#10B981',  bg: '#F0FDF4' },
          { key: 'expiring_soon',label: 'Expiring Soon',     count: stats.expiring,        color: '#F59E0B',  bg: '#FFFBEB' },
          { key: 'expired',      label: 'Expired / Overdue', count: stats.expired,         color: '#EF4444',  bg: '#FEF2F2' },
          { key: 'pending',      label: 'Pending Upload',    count: stats.pending,         color: '#6366F1',  bg: '#EEF2FF' },
        ].map(({ key, label, count, color, bg }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterStatus(key)}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: `2px solid ${filterStatus === key ? color : '#E2E8F0'}`,
              background: filterStatus === key ? bg : '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color, fontFamily: 'monospace' }}>{count}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginTop: 2 }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(stats.expired > 0 || stats.expiring > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.expired > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <XCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#DC2626', fontSize: '0.85rem' }}>Action Required:</strong>
                <span style={{ color: '#7F1D1D', fontSize: '0.82rem', marginLeft: 6 }}>
                  {stats.expired} document(s) are expired. Operations may be suspended if not renewed immediately.
                </span>
              </div>
            </div>
          )}
          {stats.expiring > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#B45309', fontSize: '0.85rem' }}>Renewal Due Soon:</strong>
                <span style={{ color: '#78350F', fontSize: '0.82rem', marginLeft: 6 }}>
                  {stats.expiring} document(s) expire within 30 days. Initiate renewal process now.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Category:</span>
        {['ALL', ...Object.keys(CATEGORY_COLORS)].map(cat => {
          const cfg = CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: `1.5px solid ${filterCategory === cat ? (cfg?.border || '#1A56DB') : '#E2E8F0'}`,
                background: filterCategory === cat ? (cfg?.bg || '#EFF6FF') : '#fff',
                color: filterCategory === cat ? (cfg?.text || '#1A56DB') : '#475569',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Document List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: '0.88rem' }}>
            No documents match the selected filter.
          </div>
        ) : (
          filteredDocs.map(doc => (
            <DocRow
              key={doc.id}
              doc={doc}
              docStatus={docStatuses[doc.id] || { status: 'pending' }}
              onUpload={(d) => setUploadModalDoc(d)}
              onDownload={handleDownloadDoc}
            />
          ))
        )}
      </div>

      {/* Footer note */}
      <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.72rem', color: '#64748B', lineHeight: 1.6 }}>
        <strong style={{ color: '#0F1729' }}>Note:</strong> This tracker shows compliance status for your active lease. Upload scanned copies of all documents for DMGO verification. Expired or missing mandatory documents may result in suspension of quarry operations under Rule 37 of AP Minor Minerals Rules 1966. Contact your DMGO officer for renewal assistance.
      </div>

      {/* Document Upload / Re-upload Modal */}
      {uploadModalDoc && (
        <UploadDocModal
          doc={uploadModalDoc}
          docStatus={docStatuses[uploadModalDoc.id] || { status: 'pending' }}
          onClose={() => setUploadModalDoc(null)}
          onSave={handleSaveDoc}
        />
      )}

      {/* Feedback Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99999,
          background: toast.type === 'success' ? '#059669' : '#DC2626',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.84rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 8,
              opacity: 0.8,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

