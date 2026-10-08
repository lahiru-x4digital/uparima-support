"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PageMeta } from "@/types/ticket";

const PRODUCT_LABELS: Record<string, string> = { riders: "Riders", drivers: "Drivers", ads: "Ads", hire: "Hire" };

export interface PickerItem {
  id: number;
  title: string;
  subtitle: string;
  product: string | null;
}

/**
 * Search box, plus which product the list is limited to (the conversation's own product; templates
 * set to "Any product" are included too). No label when the list isn't limited.
 */
export function PickerToolbar({ product, search, onSearch }: {
  product?: string;
  search: string;
  onSearch: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {product && (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {PRODUCT_LABELS[product] ?? product} templates
        </span>
      )}
      <div className="relative ml-auto w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search templates" aria-label="Search templates" className="h-8 pl-8 text-sm" />
      </div>
    </div>
  );
}

/** The selectable template list with compact paging. */
export function PickerList({ items, selectedId, onSelect, loading, error, meta, onPage, emptyText }: {
  items: PickerItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  error: unknown;
  meta: PageMeta | undefined;
  onPage: (p: number) => void;
  emptyText: string;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => onSelect(it.id)} aria-pressed={selectedId === it.id}
                  className={cn("block w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60", selectedId === it.id && "bg-primary/10")}>
                  <p className="truncate text-sm font-medium">{it.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p>
                  {it.product && <span className="mt-1 inline-block rounded bg-muted px-1.5 text-[10px] font-medium capitalize text-muted-foreground">{it.product}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
          <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft /></Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}><ChevronRight /></Button>
        </div>
      )}
    </div>
  );
}
