"use client";

import { useState } from "react";
import { AlertTriangle, CornerDownLeft, Loader2, Send } from "lucide-react";
import { WhatsappPreview } from "@/components/template-preview/whatsapp-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import { useSendWhatsappTemplate, useWhatsappTemplates } from "@/lib/hooks/use-whatsapp-templates";
import { fillVars, templateVars } from "@/lib/whatsapp-template/format";
import type { WhatsappTemplate } from "@/types/message-template";
import { PickerList, PickerToolbar } from "./picker-shell";

/**
 * Pick a WhatsApp template and fill its values. "send": approved templates only, delivered to the
 * conversation's WhatsApp number. "insert": any template's text goes into the reply box.
 */
export function WhatsappChooser({ product, mode, phone, ticketId, customerName, onSent, onInsert }: {
  /** The conversation's product; undefined lists every template. */
  product?: string;
  mode: "send" | "insert";
  phone: string | null;
  /** Record the message on this ticket; absent for a bot-only chat. */
  ticketId?: string;
  customerName: string;
  onSent: () => void;
  onInsert: (text: string) => void;
}) {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const list = useWhatsappTemplates({ q, page, perPage: 12, product, status: mode === "send" ? "approved" : undefined });
  const rows = list.data?.data ?? [];
  useClampPage(page, !!list.data && rows.length === 0, setPage);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {mode === "send" && !phone && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
          <AlertTriangle className="size-4" /> This conversation has no WhatsApp number, so a template can&apos;t be sent.
        </p>
      )}
      <PickerToolbar product={product} search={search} onSearch={setSearch} />
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[280px_1fr]">
        <PickerList
          items={rows.map((t) => ({ id: t.id, title: t.name, subtitle: t.body, product: t.product }))}
          selectedId={selectedId} onSelect={setSelectedId}
          loading={list.isLoading} error={list.error} meta={list.data?.meta} onPage={setPage}
          emptyText={q ? `No templates match "${q}".` : mode === "send" ? "No approved WhatsApp templates for this product." : "No WhatsApp templates for this product."} />
        {selected ? (
          // Remount per template so filled values never carry over.
          <FillAndSend key={selected.id} t={selected} mode={mode} phone={phone} ticketId={ticketId} customerName={customerName} onSent={onSent} onInsert={onInsert} />
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Choose a template to fill and send it</div>
        )}
      </div>
    </div>
  );
}

function FillAndSend({ t, mode, phone, ticketId, customerName, onSent, onInsert }: {
  t: WhatsappTemplate;
  mode: "send" | "insert";
  phone: string | null;
  ticketId?: string;
  customerName: string;
  onSent: () => void;
  onInsert: (text: string) => void;
}) {
  const vars = templateVars(t.body);
  const headerVar = t.headerType === "text" && templateVars(t.headerText ?? "").length > 0;
  // {{1}} is almost always the customer's name — start with it, the agent can change it.
  const [values, setValues] = useState<string[]>(() => vars.map((_, i) => (i === 0 ? customerName : "")));
  const [header, setHeader] = useState("");
  const send = useSendWhatsappTemplate();
  const filled = values.every((v) => v.trim()) && (!headerVar || header.trim());
  const text = [t.headerType === "text" && t.headerText ? fillVars(t.headerText, [header]) : null, fillVars(t.body, values), t.footer]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="grid min-h-0 gap-3 overflow-y-auto lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        {headerVar && (
          <label className="block text-xs font-semibold">
            Header value
            <Input className="mt-1" value={header} onChange={(e) => setHeader(e.target.value)} placeholder={t.headerExample ?? ""} />
          </label>
        )}
        {vars.length === 0 && !headerVar && <p className="text-sm text-muted-foreground">This template has no values to fill.</p>}
        {vars.map((n, i) => (
          <label key={n} className="block text-xs font-semibold">
            <span className="font-mono">{`{{${n}}}`}</span>
            <Input className="mt-1" value={values[i] ?? ""} placeholder={t.bodyExamples[i] ?? ""}
              onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))} />
          </label>
        ))}
        {mode === "send" ? (
          <Button disabled={!phone || !filled || send.isPending} onClick={() => phone && send.mutate(
            { id: t.id, phone, params: values, headerParam: headerVar ? header : undefined, ticketId },
            { onSuccess: onSent },
          )}>
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send on WhatsApp
          </Button>
        ) : (
          <Button onClick={() => onInsert(text)}><CornerDownLeft /> Insert into reply</Button>
        )}
      </div>
      <WhatsappPreview t={{ ...t, bodyExamples: values, headerExample: header || null }} />
    </div>
  );
}
