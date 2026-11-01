import { useState } from 'react';

export function usePagination(data, pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = data?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeP = Math.min(page, totalPages);
  const currentData = (data || []).slice((safeP - 1) * pageSize, safeP * pageSize);

  return {
    page: safeP, setPage, totalPages, total, currentData, pageSize,
    hasNext: safeP < totalPages,
    hasPrev: safeP > 1,
  };
}
