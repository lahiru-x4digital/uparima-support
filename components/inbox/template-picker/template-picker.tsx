"use client";

import { useState } from "react";
import { ClipboardList, FileText, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMe } from "@/lib/hooks/use-desk";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/inbox";
import { CareChooser } from "./care-chooser";
import { EmailChooser } from "./email-chooser";
import { WhatsappChooser } from "./whatsapp-chooser";

type Kind = "email" | "whatsapp" | "care";
const KINDS: Record<Kind, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  care: { label: "Care", icon: ClipboardList },
};
const PICKER_PRODUCTS = ["riders", "drivers", "ads", "hire"];

/**
 * Templates for the reply area of any conversation. A template of the conversation's own channel
 * is sent as that channel's real message (designed email / approved WhatsApp template); every other
 * template is inserted into the reply box as text, to edit and send as a normal reply.
 */
export function TemplatePicker({ conversation: c, onSendEmailTemplate, onInsertText, sendOnly = false, label = "Templates" }: {
  conversation: Conversation;
  onSendEmailTemplate: (templateId: number, text: string) => Promise<unknown>;
  /** Adds text to the reply box; omitted where free text can't be sent. */
  onInsertText?: (text: string) => void;
  /** WhatsApp outside the 24-hour window: only sending an approved template is possible. */
  sendOnly?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const kinds: Kind[] = sendOnly ? ["whatsapp"] : c.channel === "whatsapp" ? ["whatsapp", "email", "care"] : ["email", "whatsapp", "care"];
  const [kind, setKind] = useState<Kind>(kinds[0]);
  const mode = (k: Kind) => ((k === "email" && c.channel === "email") || (k === "whatsapp" && c.channel === "whatsapp") ? "send" : "insert");
  // Only the conversation's product (plus "any product" templates); everything when it has none.
  const product = c.product && PICKER_PRODUCTS.includes(c.product) ? c.product : undefined;
  const phone = c.phone && c.phone !== "—" ? c.phone : null;
  const vars = { customer_name: c.customerName, ticket_number: c.ticketNumber || undefined, agent_name: me?.name ?? undefined };

  function insert(text: string) {
    onInsertText?.(text);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setKind(kinds[0]); }}>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>
        <FileText /> {label}
      </DialogTrigger>
      <DialogContent className="flex h-[88vh] flex-col gap-3 sm:max-w-5xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            For {c.customerName} · {mode(kind) === "send"
              ? kind === "email" ? "sends the designed email in this thread" : "sends on WhatsApp"
              : "inserts the text into your reply"}
          </DialogDescription>
        </DialogHeader>
        {kinds.length > 1 && (
          <div className="flex w-fit rounded-lg border p-0.5 text-sm" role="tablist" aria-label="Template type">
            {kinds.map((k) => {
              const Icon = KINDS[k].icon;
              return (
                <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1", kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <Icon className="size-3.5" /> {KINDS[k].label}
                </button>
              );
            })}
          </div>
        )}
        {/* Only mounted while open, so lists load on demand; keyed so each tab starts fresh. */}
        {open && kind === "email" && (
          <EmailChooser key="email" product={product} vars={vars} mode={mode("email")} onInsert={insert}
            onSend={async (id, text) => {
              await onSendEmailTemplate(id, text);
              setOpen(false);
            }} />
        )}
        {open && kind === "whatsapp" && (
          <WhatsappChooser key="whatsapp" product={product} mode={mode("whatsapp")} phone={phone} customerName={c.customerName}
            ticketId={c.ticketNumber ? c.id : undefined} onSent={() => setOpen(false)} onInsert={insert} />
        )}
        {open && kind === "care" && <CareChooser key="care" onInsert={insert} />}
      </DialogContent>
    </Dialog>
  );
}
