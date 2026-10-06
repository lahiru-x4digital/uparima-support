import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatTime, slaState, whatsappDigits } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/inbox";
import { languageLabel, topicLabel } from "./meta";

interface Props {
  conversation: Conversation;
  canUpdate: boolean;
  marking: boolean;
  onMarkContacted: () => void;
}

/**
 * Shown on tickets raised through the WhatsApp bot. Staff replies are saved on the ticket but
 * are not delivered over WhatsApp yet, so the agent is pointed at the driver's phone instead.
 */
export function HandoffBanner({ conversation: c, canUpdate, marking, onMarkContacted }: Props) {
  const sla = slaState(c.slaDueAt);
  const method = c.contactPreference === "message" ? "message" : "call";
  const digits = whatsappDigits(c.phone);
  const details = [topicLabel(c.topic), languageLabel(c.language) && `Speaks ${languageLabel(c.language)}`].filter(Boolean);

  return (
    <div className={cn("border-b px-3 py-2.5 text-sm", c.needsContact ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted/40")}>
      {c.needsContact ? (
        <p>
          <span className="font-medium">Asked the WhatsApp bot for a person.</span> They want a {method} on{" "}
          <span className="font-medium">{c.phone}</span>
          {sla && <span className={cn("ml-1", sla.overdue && "font-medium text-red-600 dark:text-red-400")}>· {sla.label}</span>}
        </p>
      ) : c.contactedAt ? (
        <p className="flex items-center gap-1 text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" /> Contacted {formatTime(c.contactedAt)}
        </p>
      ) : (
        <p className="text-muted-foreground">Raised through the WhatsApp bot.</p>
      )}
      {details.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{details.join(" · ")}</p>}
      <p className="mt-0.5 text-xs text-muted-foreground">
        Replies here are saved on the ticket but are not sent to the driver&apos;s WhatsApp yet, so call or message them directly.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {c.phone !== "—" && (
          <>
            <a href={`tel:+${digits}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Phone /> Call</a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
              <MessageCircle /> WhatsApp
            </a>
          </>
        )}
        {c.needsContact && canUpdate && (
          <Button size="sm" onClick={onMarkContacted} disabled={marking}><CheckCircle2 /> Mark contacted</Button>
        )}
      </div>
    </div>
  );
}
