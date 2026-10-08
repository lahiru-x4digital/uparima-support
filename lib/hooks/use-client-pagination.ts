import { useState } from "react";

// Client-side counterpart to usePaginatedResource — for lists the backend
// already returns in full (no server-side paging), this slices them into
// pages so large tables don't render every row at once.
//
// `resetKey` should change whenever the filters producing `items` change
// (e.g. a status tab or applied search term), so the view lands back on
// page 1 instead of showing a stale, possibly out-of-range page. The reset
// is applied during render (React's documented pattern for adjusting state
// when a prop changes) rather than in an effect, avoiding an extra render.
export function useClientPagination<T>(
  items: T[],
  pageSize: number,
  resetKey?: unknown,
) {
  const [page, setPage] = useState(1);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
  );

  return { page: clampedPage, setPage, totalPages, total, pageItems };
}
