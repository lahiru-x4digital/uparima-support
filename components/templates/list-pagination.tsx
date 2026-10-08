"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/types/ticket";

/** "1–20 of 57" with previous / next; hidden when everything fits on one page. */
export function ListPagination({ meta, fetching, onPage }: { meta: PageMeta | undefined; fetching: boolean; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  const from = (meta.page - 1) * meta.perPage + 1;
  const to = Math.min(meta.total, meta.page * meta.perPage);
  return (
    <nav className="mt-3 flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <span className="flex items-center gap-2 text-muted-foreground">
        {from}–{to} of {meta.total}
        {fetching && <Loader2 className="size-3.5 animate-spin" />}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <span className="tabular-nums text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
