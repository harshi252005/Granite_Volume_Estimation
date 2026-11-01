import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({ pagination }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, setPage, totalPages, total, pageSize } = pagination;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', flexWrap: 'wrap', gap: 8,
      borderBottom: '1px solid var(--border-light)',
    }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        Showing{' '}
        <strong style={{ color: 'var(--primary)' }}>
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
        </strong>{' '}
        of <strong style={{ color: 'var(--primary)' }}>{total}</strong> records
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="btn btn-ghost btn-sm btn-icon"
          style={{ width: 32, height: 32 }}
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: 32, height: 32, padding: '0 8px' }}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="btn btn-ghost btn-sm btn-icon"
          style={{ width: 32, height: 32 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
