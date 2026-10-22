"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioTemplates, useSendAudioTemplate } from "@/lib/hooks/use-audio-templates";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import { formatSeconds } from "@/lib/hooks/use-voice-recorder";
import { PickerList, PickerToolbar } from "./picker-shell";

/**
 * Pick an audio template, listen to it and send it: a voice note on WhatsApp (ticket or bot-only
 * chat), an audio attachment on app / email tickets.
 */
export function AudioChooser({ product, ticketId, phone, whatsapp, onSent }: {
  /** The conversation's product; undefined lists every template. */
  product?: string;
  /** The conversation's ticket; absent for a bot-only chat (sent by phone, which opens a ticket). */
  ticketId?: string;
  phone: string | null;
  whatsapp: boolean;
  onSent: () => void;
}) {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const list = useAudioTemplates({ q, page, perPage: 12, product });
  const rows = list.data?.data ?? [];
  useClampPage(page, !!list.data && rows.length === 0, setPage);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.find((t) => t.id === selectedId) ?? null;
  const send = useSendAudioTemplate();
  const to = ticketId ? { ticketId } : phone ? { phone } : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!to && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
          <AlertTriangle className="size-4" /> This conversation has no ticket or WhatsApp number, so audio can&apos;t be sent.
        </p>
      )}
      <PickerToolbar product={product} search={search} onSearch={setSearch} />
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[280px_1fr]">
        <PickerList
          items={rows.map((t) => ({ id: t.id, title: t.name, subtitle: `${formatSeconds(t.durationSeconds)}${t.description ? ` · ${t.description}` : ""}`, product: t.product }))}
          selectedId={selectedId} onSelect={setSelectedId}
          loading={list.isLoading} error={list.error} meta={list.data?.meta} onPage={setPage}
          emptyText={q ? `No audio templates match "${q}".` : "No audio templates for this product."} />
        {selected ? (
          <div className="flex min-h-[360px] flex-col gap-3 rounded-xl border p-4">
            <p className="font-semibold">{selected.name}</p>
            {selected.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.description}</p>}
            <audio key={selected.id} controls src={selected.url} className="w-full" aria-label={`Play ${selected.name}`} />
            <p className="flex-1 text-xs text-muted-foreground">
              {whatsapp ? "Sent as a WhatsApp voice note." : "Sent as a reply with the audio attached."} {formatSeconds(selected.durationSeconds)} long.
            </p>
            <Button className="self-end" disabled={!to || send.isPending}
              onClick={() => to && send.mutate({ id: selected.id, to }, { onSuccess: onSent })}>
              {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} {whatsapp ? "Send voice note" : "Send audio"}
            </Button>
          </div>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Choose a template to listen and send</div>
        )}
      </div>
    </div>
  );
}
