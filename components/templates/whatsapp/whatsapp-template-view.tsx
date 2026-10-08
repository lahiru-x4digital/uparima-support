"use client";

import type { WhatsappTemplate } from "@/types/message-template";
import { cn } from "@/lib/utils";
import { productLabel } from "../meta-products";
import { DetailRow, ViewDialog } from "../view-dialog";
import { LANGUAGE_OPTIONS, WA_STATUS } from "./meta";
import { WhatsappPreview } from "@/components/template-preview/whatsapp-preview";

/** Read-only view of a WhatsApp template: phone preview plus its Meta status. */
export function WhatsappTemplateView({ t }: { t: WhatsappTemplate }) {
  return (
    <ViewDialog name={t.name} title={t.name} className="sm:max-w-3xl">
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <dl>
          <DetailRow label="Status">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", WA_STATUS[t.status].className)}>{WA_STATUS[t.status].label}</span>
            <p className="mt-1 text-xs text-muted-foreground">{WA_STATUS[t.status].hint}</p>
          </DetailRow>
          {t.status === "rejected" && t.rejectedReason && (
            <DetailRow label="Rejected because"><span className="text-destructive">{t.rejectedReason}</span></DetailRow>
          )}
          <DetailRow label="Category">{t.category === "UTILITY" ? "Utility" : "Marketing"}</DetailRow>
          <DetailRow label="Language">{LANGUAGE_OPTIONS.find((l) => l.value === t.language)?.label ?? t.language}</DetailRow>
          <DetailRow label="Product">{productLabel(t.product) ?? "Any product"}</DetailRow>
          {t.bodyExamples.length > 0 && (
            <DetailRow label="Sample values">
              {t.bodyExamples.map((e, i) => <div key={i}><span className="font-mono text-xs text-muted-foreground">{`{{${i + 1}}}`}</span> {e}</div>)}
            </DetailRow>
          )}
          <DetailRow label="Submitted">{t.submittedAt ? new Date(t.submittedAt).toLocaleString() : "Not yet"}</DetailRow>
        </dl>
        <WhatsappPreview t={t} />
      </div>
    </ViewDialog>
  );
}
