"use client";

import type { EmailTemplate } from "@/types/message-template";
import { ViewDialog } from "../view-dialog";
import { EmailPreview } from "@/components/template-preview/email-preview";

/** Read-only view of an email template: the saved, rendered email. */
export function EmailTemplateView({ t }: { t: EmailTemplate }) {
  return (
    <ViewDialog name={t.name} title={t.name} description={`Subject: ${t.subject}`} className="h-[90vh] sm:max-w-4xl">
      <EmailPreview html={t.html} subject={t.subject} preheader={t.design.settings.preheader} />
    </ViewDialog>
  );
}
