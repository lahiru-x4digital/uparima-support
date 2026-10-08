"use client";

import { ExternalLink, Phone, Reply } from "lucide-react";
import { previewHtml } from "@/lib/whatsapp-template/format";
import type { WhatsappTemplateInput } from "@/types/message-template";

/** Phone-style preview of the message as the customer will see it, with sample values filled in. */
export function WhatsappPreview({ t }: { t: WhatsappTemplateInput }) {
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2rem] border-8 border-neutral-800 bg-neutral-800 shadow-xl">
      <div className="flex items-center gap-2 bg-emerald-800 px-4 py-3 text-white">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">U</span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Uparima</p>
          <p className="text-[10px] text-white/70">Business account</p>
        </div>
      </div>
      <div className="min-h-[420px] space-y-1 bg-[#efeae2] p-3 dark:bg-neutral-900">
        <div className="max-w-[92%] overflow-hidden rounded-lg rounded-tl-none bg-white text-[13px] leading-snug text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100">
          <div className="space-y-1 px-2.5 pt-2 pb-1">
            {t.headerType === "text" && t.headerText && (
              <p className="font-bold" dangerouslySetInnerHTML={{ __html: previewHtml(t.headerText, [t.headerExample ?? ""]) }} />
            )}
            <p className="break-words" dangerouslySetInnerHTML={{ __html: previewHtml(t.body || "Your message…", t.bodyExamples) }} />
            {t.footer && <p className="text-[11px] text-neutral-500">{t.footer}</p>}
            <p className="text-right text-[10px] text-neutral-400">12:00</p>
          </div>
        </div>
        {t.buttons.map((b, i) => (
          <div key={i} className="flex max-w-[92%] items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[13px] font-medium text-sky-600 shadow-sm dark:bg-neutral-800">
            {b.type === "url" ? <ExternalLink className="size-3.5" /> : b.type === "phone" ? <Phone className="size-3.5" /> : <Reply className="size-3.5" />}
            {b.text || "Button"}
          </div>
        ))}
      </div>
    </div>
  );
}
