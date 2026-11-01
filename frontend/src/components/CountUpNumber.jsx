import React, { useState, useEffect, useRef } from 'react';

/**
 * CountUpNumber — animates a number from 0 to `target` (or `end`/`value`)
 * Props: target, end, value (number), duration (ms), prefix, suffix, decimals, className
 */
export default function CountUpNumber({
  target,
  end,
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) {
  const [current, setCurrent] = useState(0);
  const raf = useRef(null);

  // Accept target, end, or value prop for full compatibility
  const rawTarget = target !== undefined ? target : (end !== undefined ? end : (value !== undefined ? value : 0));
  const numTarget = typeof rawTarget === 'number' ? rawTarget : (parseFloat(rawTarget) || 0);

  useEffect(() => {
    if (numTarget === 0) {
      setCurrent(0);
      return;
    }
    const start = performance.now();
    const startVal = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(startVal + eased * (numTarget - startVal));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setCurrent(numTarget);
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [numTarget, duration]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.floor(current).toLocaleString('en-IN');

  return (
    <span className={`animate-count-up ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

