"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * Search + page state for a paginated list. A new search goes back to page 1, and if the current
 * page empties out (e.g. its last item was deleted) it steps back a page.
 */
export function usePagedListState() {
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setPage(1);
  }
  return { search, setSearch, q, page, setPage };
}

/** Steps back a page when the current one comes back empty but earlier pages exist. */
export function useClampPage(page: number, empty: boolean, setPage: (p: number) => void) {
  useEffect(() => {
    if (empty && page > 1) setPage(page - 1);
  }, [empty, page, setPage]);
}
