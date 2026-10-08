"use client";

import { useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCareTemplates } from "@/lib/hooks/use-care-templates";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import type { CareTemplate } from "@/types/care-template";
import { PickerList, PickerToolbar } from "./picker-shell";

/** The message text a care template contributes to a reply. */
const careText = (t: CareTemplate) => (t.ticketDescription || t.ticketTitle || t.description || "").trim();

/** Pick a care template and insert its default text into the reply box. Care templates have no product. */
export function CareChooser({ onInsert }: { onInsert: (text: string) => void }) {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const list = useCareTemplates({ q, page, perPage: 12 });
  const rows = list.data?.data ?? [];
  useClampPage(page, !!list.data && rows.length === 0, setPage);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.find((t) => t.id === selectedId) ?? null;
  const text = selected ? careText(selected) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerToolbar search={search} onSearch={setSearch} />
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[280px_1fr]">
        <PickerList
          items={rows.map((t) => ({ id: t.id, title: t.name, subtitle: t.ticketTitle ?? t.description ?? "", product: null }))}
          selectedId={selectedId} onSelect={setSelectedId}
          loading={list.isLoading} error={list.error} meta={list.data?.meta} onPage={setPage}
          emptyText={q ? `No care templates match "${q}".` : "No care templates yet."} />
        {selected ? (
          <div className="flex min-h-[360px] flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <p className="flex-1 font-semibold">{selected.ticketTitle || selected.name}</p>
              {selected.status !== "active" && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {text ? (
              <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{text}</p>
            ) : (
              <p className="flex-1 text-sm text-muted-foreground">This care template has no message text to insert.</p>
            )}
            <Button className="self-end" disabled={!text} onClick={() => onInsert(text)}><CornerDownLeft /> Insert into reply</Button>
          </div>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Choose a template to preview it</div>
        )}
      </div>
    </div>
  );
}
