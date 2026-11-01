import React from 'react';
import { useLanguage } from '../i18n';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  registered:                  { label: 'Registered',       cls: 'badge-blue' },
  undressed:                   { label: 'Undressed',        cls: 'badge-blue' },
  dressed:                     { label: 'Dressed',          cls: 'badge-violet' },
  ai_measured:                 { label: 'AI Measured',      cls: 'badge-sky' },
  check_measurement_requested: { label: 'Pending DMGO',     cls: 'badge-gold' },
  check_requested:             { label: 'Pending DMGO',     cls: 'badge-gold' },
  dmgo_approved:               { label: 'Approved',         cls: 'badge-green' },
  dmgo_rejected:               { label: 'Rejected',         cls: 'badge-rose' },
  permit_ready:                { label: 'Permit Ready',     cls: 'badge-green' },
  dispatch_requested:          { label: 'Dispatch Req.',    cls: 'badge-violet' },
  dispatched:                  { label: 'Dispatched',       cls: 'badge-sky' },
  weighbridge_verified:        { label: 'WB Verified',      cls: 'badge-green' },
  weighbridge_flagged:         { label: 'WB Flagged',       cls: 'badge-rose' },
  weighbridge_approved:        { label: 'WB Approved',      cls: 'badge-green' },
  delivered:                   { label: 'Delivered',        cls: 'badge-green' },
};

const DOT_COLORS = {
  'badge-blue':   '#1A56DB',
  'badge-sky':    '#0EA5E9',
  'badge-violet': '#7C3AED',
  'badge-gold':   '#E67E22',
  'badge-green':  '#10B981',
  'badge-rose':   '#EF4444',
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const cfg = STATUS[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', cls: 'badge-blue' };
  return (
    <span className={`badge ${cfg.cls}`}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: DOT_COLORS[cfg.cls] || '#1A56DB',
        display: 'inline-block', flexShrink: 0,
      }} />
      {t(cfg.label)}
    </span>
  );
}
