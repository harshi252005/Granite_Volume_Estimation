import React, { useState, useRef, useEffect } from 'react';

/**
 * Enhanced 3D Granite Block with real dimensions & labels on each face.
 * Props:
 *   size: 'sm' | 'md' | 'lg'
 *   length, breadth, height: actual cm dimensions (optional)
 *   classStatus: 'super_gangsaw' | 'above_gangsaw' | 'below_gangsaw' (optional)
 *   interactive: bool — enable click-to-pause spin
 */
export default function GraniteBlock3D({
  size = 'md',
  length = null,
  breadth = null,
  height = null,
  classStatus = null,
  interactive = false,
  className = '',
}) {
  const [paused, setPaused] = useState(false);
  const [hoveredFace, setHoveredFace] = useState(null);

  const sizes = {
    sm: { w: 80,  h: 55,  d: 55  },
    md: { w: 130, h: 88,  d: 88  },
    lg: { w: 190, h: 128, d: 128 },
  };
  const { w, h, d } = sizes[size] || sizes.md;

  // Color scheme by gangsaw classification
  const palette = {
    super_gangsaw: {
      front: 'linear-gradient(135deg, #047857 0%, #065F46 40%, #047857 100%)',
      side:  'linear-gradient(135deg, #065F46 0%, #047857 100%)',
      top:   'linear-gradient(135deg, #6EE7B7 0%, #10B981 60%, #065F46 100%)',
      back:  'linear-gradient(135deg, #034D36 0%, #065F46 100%)',
      bottom:'linear-gradient(135deg, #023828 0%, #047857 100%)',
    },
    above_gangsaw: {
      front: 'linear-gradient(135deg, #1A56DB 0%, #1E40AF 40%, #2563EB 100%)',
      side:  'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      top:   'linear-gradient(135deg, #93C5FD 0%, #3B82F6 60%, #1D4ED8 100%)',
      back:  'linear-gradient(135deg, #1E3A8A 0%, #1A56DB 100%)',
      bottom:'linear-gradient(135deg, #172554 0%, #1E40AF 100%)',
    },
    below_gangsaw: {
      front: 'linear-gradient(135deg, #92400E 0%, #B45309 40%, #D97706 100%)',
      side:  'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
      top:   'linear-gradient(135deg, #FCD34D 0%, #F59E0B 60%, #B45309 100%)',
      back:  'linear-gradient(135deg, #78350F 0%, #92400E 100%)',
      bottom:'linear-gradient(135deg, #451A03 0%, #92400E 100%)',
    },
  };
  const pal = palette[classStatus] || palette.above_gangsaw;

  const faces = [
    { id: 'front',  label: length  ? `L: ${length}cm`  : 'Front',  style: { width: w, height: h, transform: `translateZ(${d / 2}px)`, background: pal.front } },
    { id: 'back',   label: length  ? `L: ${length}cm`  : 'Back',   style: { width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)`, background: pal.back } },
    { id: 'left',   label: breadth ? `B: ${breadth}cm` : 'Left',   style: { width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, background: pal.side } },
    { id: 'right',  label: breadth ? `B: ${breadth}cm` : 'Right',  style: { width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`, background: pal.side } },
    { id: 'top',    label: height  ? `H: ${height}cm`  : 'Top',    style: { width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`, background: pal.top } },
    { id: 'bottom', label: 'Base',  style: { width: w, height: d, transform: `rotateX(-90deg) translateZ(${h / 2}px)`, background: pal.bottom } },
  ];

  const gangLabel = {
    super_gangsaw: 'Super Gangsaw',
    above_gangsaw: 'Above Gangsaw',
    below_gangsaw: 'Below Gangsaw',
  }[classStatus];

  const gangColor = {
    super_gangsaw: '#10B981',
    above_gangsaw: '#1A56DB',
    below_gangsaw: '#F59E0B',
  }[classStatus] || '#64748B';

  const animStyle = paused
    ? {}
    : { animation: 'spinGranite 8s linear infinite' };

  return (
    <div className={`granite-3d-scene ${className}`} style={{ width: w + 80, height: h + 90, position: 'relative', display: 'inline-block' }}>
      {/* Classification badge */}
      {gangLabel && (
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          background: gangColor + '22', border: `1px solid ${gangColor}44`,
          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
          color: gangColor, whiteSpace: 'nowrap', zIndex: 10,
        }}>
          {gangLabel}
        </div>
      )}

      <div
        style={{
          width: w, height: h,
          position: 'relative',
          transformStyle: 'preserve-3d',
          margin: '30px auto 0',
          cursor: interactive ? 'pointer' : 'default',
          ...animStyle,
        }}
        onClick={() => interactive && setPaused(p => !p)}
      >
        {faces.map((face, i) => (
          <div
            key={i}
            onMouseEnter={() => interactive && setHoveredFace(face.id)}
            onMouseLeave={() => interactive && setHoveredFace(null)}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              borderRadius: 4,
              border: hoveredFace === face.id ? '1.5px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.25)',
              boxShadow: hoveredFace === face.id
                ? 'inset 0 0 30px rgba(255,255,255,0.25), 0 0 0 2px rgba(255,255,255,0.3)'
                : 'inset 0 0 20px rgba(255,255,255,0.08)',
              backgroundImage: face.style.background + ', radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: 'auto, 12px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border 0.2s, box-shadow 0.2s',
              ...face.style,
            }}
          >
            {/* Face label (show only when paused or on the front face) */}
            {(paused || i < 2) && face.label && (
              <span style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: Math.max(9, (size === 'lg' ? 13 : 10)),
                fontWeight: 700,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                letterSpacing: '0.03em',
              }}>
                {face.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Pause hint */}
      {interactive && (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#94A3B8' }}>
          {paused ? '▶ Click to resume' : '⏸ Click to pause'}
        </div>
      )}
    </div>
  );
}
