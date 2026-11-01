import React, { useState, useMemo } from 'react';
import {
  Camera, History, Mountain, Layers, Eye, Download, Search, RefreshCw,
  Plus, MapPin, Calendar, CheckCircle, AlertTriangle, Clock, ChevronRight,
  X, ExternalLink, Copy, Check, Filter, LayoutGrid, List, FileImage
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatGpsString } from '../utils/gps';
import { useLanguage } from '../i18n';

// Helper to resolve image paths from backend /uploads or /datasets
export function getBlockImageUrl(b) {
  if (!b) return null;
  const raw = b.image_url || b.images?.[0]?.file_path;
  if (raw) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/uploads/') || raw.startsWith('/datasets/')) return raw;
    if (raw.startsWith('uploads/')) return `/${raw}`;
    if (raw.startsWith('datasets/')) return `/${raw}`;
    if (raw.startsWith('/')) return raw;
    return `/uploads/${raw}`;
  }
  // Fallback convention based on block ID
  if (b.id) {
    if (b.block_type === 'undressed') return `/uploads/${b.id}_raw.jpg`;
    return `/uploads/${b.id}.jpg`;
  }
  return null;
}

export default function UploadHistory({
  blocks = [],
  loading = false,
  onRefresh,
  onNavigateToCapture,
  user
}) {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState('all'); // 'all' | 'undressed' | 'dressed'
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [activeModalBlock, setActiveModalBlock] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter blocks based on search and category
  const filteredBlocks = useMemo(() => {
    return (blocks || []).filter(b => {
      // Category filter
      if (filterType === 'undressed' && b.block_type !== 'undressed') return false;
      if (filterType === 'dressed' && b.block_type !== 'dressed') return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const idMatch = b.id?.toLowerCase().includes(q);
        const udMatch = b.undressed_id?.toLowerCase().includes(q);
        const typeMatch = (b.seigniorage?.granite_type || b.granite_type || '').toLowerCase().includes(q);
        const quarryMatch = (b.quarry_name || '').toLowerCase().includes(q);
        const gpsMatch = (b.gps || '').toLowerCase().includes(q);
        if (!idMatch && !udMatch && !typeMatch && !quarryMatch && !gpsMatch) return false;
      }
      return true;
    });
  }, [blocks, filterType, search]);

  // Statistics
  const stats = useMemo(() => {
    const all = blocks || [];
    const undressed = all.filter(b => b.block_type === 'undressed');
    const dressed = all.filter(b => b.block_type === 'dressed');
    const withImages = all.filter(b => (b.images && b.images.length > 0) || b.image_url);
    return {
      total: all.length,
      undressed: undressed.length,
      dressed: dressed.length,
      withImages: withImages.length,
    };
  }, [blocks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.25s ease' }}>

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{t('Upload History & Assessments')}</h1>
            <span className="badge badge-blue">Quarry #{user?.quarry_id || '301'}</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            {t('All raw pit face photos, excavation logs, and dressing yard scans captured at your quarry')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-outline"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {t('Refresh Uploads')}
            </button>
          )}
          {onNavigateToCapture && (
            <button
              type="button"
              onClick={() => onNavigateToCapture()}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 16px' }}
            >
              <Plus size={15} />
              {t('Capture New Block')}
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #1A56DB' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Total Assessments
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F1729', marginTop: 4, fontFamily: 'monospace' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#1A56DB', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileImage size={12} /> {stats.withImages} with stored photos
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #7C3AED' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Pit Excavation (Undressed)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#7C3AED', marginTop: 4, fontFamily: 'monospace' }}>
            {stats.undressed}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
            Raw blasted boulders
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #0EA5E9' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Dressing Yard (Dressed)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0EA5E9', marginTop: 4, fontFamily: 'monospace' }}>
            {stats.dressed}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
            AI Photogrammetric scans
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Storage Status
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10B981', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={16} /> Online &amp; Stored
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
            Local &amp; AP Mines Directory
          </div>
        </div>
      </div>

      {/* Filter and View Mode Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        background: '#fff',
        padding: '12px 16px',
        borderRadius: 10,
        border: '1px solid #E2E8F0',
      }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Photos', count: stats.total },
            { id: 'undressed', label: 'Pit Excavation (Undressed)', count: stats.undressed },
            { id: 'dressed', label: 'Dressing Yard (Dressed)', count: stats.dressed },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === tab.id ? '1.5px solid #1A56DB' : '1px solid #E2E8F0',
                background: filterType === tab.id ? '#EFF6FF' : '#fff',
                color: filterType === tab.id ? '#1A56DB' : '#475569',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: filterType === tab.id ? '#1A56DB' : '#F1F5F9',
                color: filterType === tab.id ? '#fff' : '#64748B',
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: 10,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Block ID, UD-ID, type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: '0.78rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 2 }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Gallery Grid View"
              style={{
                background: viewMode === 'grid' ? '#fff' : 'transparent',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                color: viewMode === 'grid' ? '#1A56DB' : '#64748B',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table List View"
              style={{
                background: viewMode === 'table' ? '#fff' : 'transparent',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                color: viewMode === 'table' ? '#1A56DB' : '#64748B',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredBlocks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <History size={42} color="#BFDBFE" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#0F1729', margin: '0 0 6px', fontSize: '1.1rem' }}>
            {search ? 'No Matching Uploads' : 'No Uploads Found'}
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', maxWidth: 460, margin: '0 auto 18px' }}>
            {search
              ? `No assessments match "${search}". Try searching with a different ID or keyword.`
              : 'Block photos uploaded during pit excavation or dressing yard scans will appear here automatically.'}
          </p>
          {onNavigateToCapture && (
            <button
              type="button"
              onClick={() => onNavigateToCapture()}
              className="btn btn-primary"
              style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              {t('Capture First Block Photo')}
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID / GALLERY VIEW ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filteredBlocks.map(block => {
            const imgUrl = getBlockImageUrl(block);
            const isUndressed = block.block_type === 'undressed';
            const dims = isUndressed
              ? {
                  l: block.undressed_length,
                  b: block.undressed_breadth,
                  h: block.undressed_height,
                  vol: block.undressed_volume,
                }
              : {
                  l: block.measurement?.length,
                  b: block.measurement?.breadth,
                  h: block.measurement?.height,
                  vol: block.measurement?.volume,
                };

            const createdDate = block.creation_time
              ? new Date(block.creation_time).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <div
                key={block.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isUndressed ? '1.5px solid #DDD6FE' : '1px solid #E2E8F0',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Photo Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    height: 180,
                    background: '#0F172A',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveModalBlock(block)}
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={`Block ${block.id}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      onError={e => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94A3B8; font-size: 0.75rem; background: #1E293B;">
                            <span style="font-size: 28px; margin-bottom: 4px;">🪨</span>
                            <span>Photo Archive Stored</span>
                            <span style="font-size: 0.65rem; color: #64748B;">${block.id}</span>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                      <span style={{ fontSize: 32, marginBottom: 4 }}>🪨</span>
                      <span>No Photo Attached</span>
                    </div>
                  )}

                  {/* Overlay Badges */}
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: isUndressed ? '#7C3AED' : '#0284C7',
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      {isUndressed ? <Mountain size={10} /> : <Layers size={10} />}
                      {isUndressed ? 'Pit Face Raw' : 'Yard Dressed'}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <StatusBadge status={block.status} />
                  </div>

                  {/* Click to inspect hint */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '6px 10px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#fff',
                    fontSize: '0.68rem',
                  }}>
                    <span>{createdDate}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0.9 }}>
                      <Eye size={12} /> Click to expand
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Block ID & Undressed ID */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0F1729', fontFamily: 'monospace' }}>
                          {block.id}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(block.id)}
                          title="Copy Block ID"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                        >
                          {copiedId === block.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        </button>
                      </div>
                      {block.undressed_id && (
                        <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 700, marginTop: 1 }}>
                          UD: {block.undressed_id}
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                      {block.seigniorage?.granite_type || block.granite_type || 'Black Galaxy'}
                    </span>
                  </div>

                  {/* Physical Dimensions */}
                  <div style={{
                    background: isUndressed ? '#F5F3FF' : '#F8FAFC',
                    border: `1px solid ${isUndressed ? '#EDE9FE' : '#E2E8F0'}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>Dimensions (L×B×H):</span>
                      <span style={{ fontWeight: 800, color: '#0F1729' }}>
                        {dims.l && dims.b && dims.h ? `${dims.l} × ${dims.b} × ${dims.h} cm` : 'Pending'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span style={{ fontWeight: 600 }}>Volume / Weight:</span>
                      <span style={{ fontWeight: 800, color: isUndressed ? '#7C3AED' : '#1A56DB' }}>
                        {dims.vol ? `${Number(dims.vol).toFixed(3)} m³ (${(Number(dims.vol) * 2.7).toFixed(2)} MT)` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* GPS Coordinates */}
                  {block.gps && (
                    <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color="#EF4444" />
                      <span>GPS: {formatGpsString(block.gps)}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9' }}>
                    <button
                      type="button"
                      onClick={() => setActiveModalBlock(block)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Eye size={13} /> View Photo
                    </button>

                    {isUndressed && onNavigateToCapture && (
                      <button
                        type="button"
                        onClick={() => onNavigateToCapture(block)}
                        style={{
                          background: '#7C3AED',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
                        title="Link & proceed to dressing yard"
                      >
                        Dress <ChevronRight size={13} />
                      </button>
                    )}

                    {imgUrl && (
                      <a
                        href={imgUrl}
                        download={`${block.id}_photo.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        style={{ padding: '6px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                        title="Download Original Photo"
                      >
                        <Download size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Photo</th>
                  <th style={{ padding: '10px 14px' }}>Block ID</th>
                  <th style={{ padding: '10px 14px' }}>Category</th>
                  <th style={{ padding: '10px 14px' }}>Granite Type</th>
                  <th style={{ padding: '10px 14px' }}>Dimensions (cm)</th>
                  <th style={{ padding: '10px 14px' }}>Volume (m³)</th>
                  <th style={{ padding: '10px 14px' }}>Uploaded Time</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlocks.map(block => {
                  const imgUrl = getBlockImageUrl(block);
                  const isUndressed = block.block_type === 'undressed';
                  const dims = isUndressed
                    ? { l: block.undressed_length, b: block.undressed_breadth, h: block.undressed_height, vol: block.undressed_volume }
                    : { l: block.measurement?.length, b: block.measurement?.breadth, h: block.measurement?.height, vol: block.measurement?.volume };

                  return (
                    <tr
                      key={block.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.12s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '8px 14px' }}>
                        <div
                          onClick={() => setActiveModalBlock(block)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 6,
                            overflow: 'hidden',
                            background: '#0F172A',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {imgUrl ? (
                            <img src={imgUrl} alt={block.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FileImage size={18} color="#64748B" />
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '8px 14px' }}>
                        <strong style={{ fontFamily: 'monospace', color: '#0F1729' }}>{block.id}</strong>
                        {block.undressed_id && (
                          <div style={{ fontSize: '0.68rem', color: '#7C3AED' }}>{block.undressed_id}</div>
                        )}
                      </td>

                      <td style={{ padding: '8px 14px' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 12,
                          background: isUndressed ? '#EDE9FE' : '#E0F2FE',
                          color: isUndressed ? '#6D28D9' : '#0369A1',
                        }}>
                          {isUndressed ? 'Pit Face' : 'Yard Dressed'}
                        </span>
                      </td>

                      <td style={{ padding: '8px 14px', color: '#334155' }}>
                        {block.seigniorage?.granite_type || block.granite_type || 'Black Galaxy'}
                      </td>

                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#0F1729' }}>
                        {dims.l && dims.b && dims.h ? `${dims.l} × ${dims.b} × ${dims.h}` : '—'}
                      </td>

                      <td style={{ padding: '8px 14px', fontWeight: 700, color: isUndressed ? '#7C3AED' : '#1A56DB', fontFamily: 'monospace' }}>
                        {dims.vol ? Number(dims.vol).toFixed(3) : '—'}
                      </td>

                      <td style={{ padding: '8px 14px', fontSize: '0.72rem', color: '#64748B' }}>
                        {block.creation_time ? new Date(block.creation_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      <td style={{ padding: '8px 14px' }}>
                        <StatusBadge status={block.status} />
                      </td>

                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setActiveModalBlock(block)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            title="Inspect Details"
                          >
                            <Eye size={13} />
                          </button>
                          {imgUrl && (
                            <a
                              href={imgUrl}
                              download={`${block.id}.jpg`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#475569' }}
                              title="Download Photo"
                            >
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PHOTO INSPECTION MODAL / LIGHTBOX ── */}
      {activeModalBlock && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setActiveModalBlock(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 780,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F1729' }}>
                  {activeModalBlock.block_type === 'undressed' ? 'Pit Face Raw Block Assessment' : 'Dressed Yard Inspection'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                  ID: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{activeModalBlock.id}</span>
                  {activeModalBlock.undressed_id && ` · Undressed ID: ${activeModalBlock.undressed_id}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalBlock(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflowY: 'auto', flex: 1 }}>
              {/* Photo Area */}
              <div style={{ background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, position: 'relative' }}>
                {getBlockImageUrl(activeModalBlock) ? (
                  <img
                    src={getBlockImageUrl(activeModalBlock)}
                    alt={activeModalBlock.id}
                    style={{ width: '100%', height: '100%', maxHeight: 420, objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>
                    <Camera size={48} style={{ margin: '0 auto 10px' }} />
                    <p style={{ margin: 0 }}>No photo attached</p>
                  </div>
                )}
              </div>

              {/* Details Sidebar */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, background: '#FAFBFD' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                    Current Status
                  </label>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge status={activeModalBlock.status} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                    Granite Variety &amp; Quarry
                  </label>
                  <div style={{ fontWeight: 800, color: '#0F1729', fontSize: '0.9rem', marginTop: 2 }}>
                    {activeModalBlock.seigniorage?.granite_type || activeModalBlock.granite_type || 'Black Galaxy Granite'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {activeModalBlock.quarry_name || `Quarry #${activeModalBlock.quarry_id || '301'}`}
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                    Assessment Measurements
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6, fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: '#64748B', fontSize: '0.72rem' }}>Length: </span>
                      <strong>{activeModalBlock.undressed_length || activeModalBlock.measurement?.length || '—'} cm</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: '0.72rem' }}>Breadth: </span>
                      <strong>{activeModalBlock.undressed_breadth || activeModalBlock.measurement?.breadth || '—'} cm</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: '0.72rem' }}>Height: </span>
                      <strong>{activeModalBlock.undressed_height || activeModalBlock.measurement?.height || '—'} cm</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: '0.72rem' }}>Volume: </span>
                      <strong style={{ color: '#1A56DB' }}>
                        {activeModalBlock.undressed_volume || activeModalBlock.measurement?.volume
                          ? `${Number(activeModalBlock.undressed_volume || activeModalBlock.measurement?.volume).toFixed(3)} m³`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {activeModalBlock.gps && (
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      GPS Geo-tag
                    </label>
                    <div style={{ fontSize: '0.78rem', color: '#0F1729', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <MapPin size={13} color="#EF4444" />
                      {activeModalBlock.gps}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                    Uploaded On
                  </label>
                  <div style={{ fontSize: '0.78rem', color: '#0F1729', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#1A56DB" />
                    {activeModalBlock.creation_time ? new Date(activeModalBlock.creation_time).toLocaleString('en-IN') : 'Recent'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 10 }}>
                  {getBlockImageUrl(activeModalBlock) && (
                    <a
                      href={getBlockImageUrl(activeModalBlock)}
                      download={`${activeModalBlock.id}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
                    >
                      <Download size={14} /> Download Original
                    </a>
                  )}
                  {activeModalBlock.block_type === 'undressed' && onNavigateToCapture && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = activeModalBlock;
                        setActiveModalBlock(null);
                        onNavigateToCapture(target);
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
                    >
                      Proceed to Dress <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
