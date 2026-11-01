import React from 'react';

/**
 * LiveBadge — animated "LIVE" badge with pulsing dot
 * Props: label (default "Live"), color (default green)
 */
export default function LiveBadge({ label = 'Live', variant = 'green' }) {
  const variants = {
    green:  { bg: '#ECFDF5', color: '#10B981', dot: '#10B981' },
    blue:   { bg: '#EFF6FF', color: '#1A56DB', dot: '#1A56DB' },
    orange: { bg: '#FFF7ED', color: '#E67E22', dot: '#E67E22' },
    red:    { bg: '#FEF2F2', color: '#EF4444', dot: '#EF4444' },
  };
  const v = variants[variant] || variants.green;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: v.bg, color: v.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: v.dot, display: 'inline-block',
        animation: 'pulseDot 1.5s infinite',
      }} />
      {label}
    </span>
  );
}
