import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n';

/**
 * Animated KPI stat card with count-up effect.
 * color: CSS color string (border + icon bg tint)
 * icon: lucide icon component
 */
export default function StatCard({ label, value, sub, icon: Icon, color = '#1A56DB', onClick }) {
  const { t } = useLanguage();
  const [display, setDisplay] = useState(0);
  const isNum = typeof value === 'number';

  useEffect(() => {
    if (!isNum) return;
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.ceil(end / 30);
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="stat-icon"
        style={{ background: `${color}12` }}
      >
        {Icon && <Icon size={26} color={color} />}
      </div>
      <div>
        <div className="stat-label" style={{ color }}>{t(label)}</div>
        <div className="stat-value" style={{ color: '#0F1729' }}>
          {isNum ? display.toLocaleString('en-IN') : value}
        </div>
        {sub && (
          <div className="stat-sub" style={{ color }}>
            {t(sub)}
          </div>
        )}
      </div>
    </div>
  );
}
