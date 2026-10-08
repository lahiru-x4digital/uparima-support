"use client";

import { Badge } from "@/components/ui/badge";
import type { CareTemplate } from "@/types/care-template";
import { requestTypeLabel } from "./meta";
import { DetailRow, ViewDialog } from "./view-dialog";

const dash = (v: string | null) => v?.trim() || <span className="text-muted-foreground">—</span>;

/** Read-only view of a care template: its ticket defaults and custom fields. */
export function CareTemplateView({ t }: { t: CareTemplate }) {
  return (
    <ViewDialog name={t.name} title={t.name} description={requestTypeLabel(t.requestType)}>
      <dl>
        <DetailRow label="Status"><Badge variant={t.status === "active" ? "default" : "secondary"} className="capitalize">{t.status}</Badge></DetailRow>
        <DetailRow label="Priority"><span className="capitalize">{dash(t.priority)}</span></DetailRow>
        <DetailRow label="Description">{dash(t.description)}</DetailRow>
        <DetailRow label="Ticket title">{dash(t.ticketTitle)}</DetailRow>
        <DetailRow label="Ticket text"><span className="whitespace-pre-wrap">{dash(t.ticketDescription)}</span></DetailRow>
        <DetailRow label="Custom fields">
          {t.fields.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <ul className="space-y-1">
              {t.fields.map((f) => (
                <li key={f.key} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{f.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{f.key}</span>
                  <Badge variant="outline" className="capitalize">{f.type}</Badge>
                  {f.required && <Badge variant="secondary">Required</Badge>}
                </li>
              ))}
            </ul>
          )}
        </DetailRow>
      </dl>
    </ViewDialog>
  );
}
