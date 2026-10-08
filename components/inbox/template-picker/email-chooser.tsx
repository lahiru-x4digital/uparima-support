"use client";

import { useState } from "react";
import { CornerDownLeft, Loader2, Send } from "lucide-react";
import { EmailPreview } from "@/components/template-preview/email-preview";
import { Button } from "@/components/ui/button";
import { designToText, fillEmailVars, type EmailVars } from "@/lib/email-template/fill";
import { useEmailTemplates } from "@/lib/hooks/use-email-templates";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import { PickerList, PickerToolbar } from "./picker-shell";

/**
 * Pick an email template. "send": deliver it as the designed email reply (email tickets).
 * "insert": put its text, placeholders filled, into the reply box (any other channel).
 */
export function EmailChooser({ product, vars, mode, onSend, onInsert }: {
  /** The conversation's product; undefined lists every template. */
  product?: string;
  /** Preview values; when sending, the server fills the real ones. */
  vars: EmailVars;
  mode: "send" | "insert";
  onSend: (templateId: number, text: string) => Promise<unknown>;
  onInsert: (text: string) => void;
}) {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const list = useEmailTemplates({ q, page, perPage: 12, product });
  const rows = list.data?.data ?? [];
  useClampPage(page, !!list.data && rows.length === 0, setPage);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const selected = rows.find((t) => t.id === selectedId) ?? null;

  async function send() {
    if (!selected) return;
    setSending(true);
    try {
      // Placeholders are filled by the server, so the email and the thread copy always agree.
      await onSend(selected.id, designToText(selected.design));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerToolbar product={product} search={search} onSearch={setSearch} />
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[280px_1fr]">
        <PickerList
          items={rows.map((t) => ({ id: t.id, title: t.name, subtitle: t.subject, product: t.product }))}
          selectedId={selectedId} onSelect={setSelectedId}
          loading={list.isLoading} error={list.error} meta={list.data?.meta} onPage={setPage}
          emptyText={q ? `No email templates match "${q}".` : "No email templates for this product."} />
        <div className="flex min-h-[360px] flex-col gap-2">
          {selected ? (
            <>
              <div className="min-h-0 flex-1">
                <EmailPreview html={fillEmailVars(selected.html, vars, true)} subject={`Re: … (keeps the conversation's subject)`} preheader={selected.design.settings.preheader} />
              </div>
              <div className="flex items-center justify-end gap-2">
                {mode === "send" ? (
                  <>
                    <p className="mr-auto text-xs text-muted-foreground">Sent as a reply in this email thread.</p>
                    <Button onClick={() => void send()} disabled={sending}>
                      {sending ? <Loader2 className="animate-spin" /> : <Send />} Send email
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mr-auto text-xs text-muted-foreground">Adds the text to your reply so you can edit it before sending.</p>
                    <Button onClick={() => onInsert(fillEmailVars(designToText(selected.design), vars))}>
                      <CornerDownLeft /> Insert into reply
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Choose a template to preview it</div>
          )}
        </div>
      </div>
    </div>
  );
}
