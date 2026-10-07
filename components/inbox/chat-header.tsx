import { ArrowLeft, CheckCircle2, PanelRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Conversation, ConversationStatus } from "@/types/inbox";
import { CHANNELS, STATUSES, initials } from "./meta";
import { OptionSelect } from "./option-select";

const STATUS_OPTIONS = (Object.keys(STATUSES) as ConversationStatus[]).map((s) => ({ value: s, label: STATUSES[s].label }));

interface Props {
  conversation: Conversation;
  contextOpen: boolean;
  canUpdate: boolean;
  onBack: () => void;
  onToggleContext: () => void;
  onStatusChange: (status: ConversationStatus) => void;
}

export function ChatHeader({ conversation: c, contextOpen, canUpdate, onBack, onToggleContext, onStatusChange }: Props) {
  return (
    <header className="flex items-center gap-3 border-b px-3 py-2.5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back to conversations">
        <ArrowLeft />
      </Button>
      <Avatar>
        <AvatarFallback>{initials(c.customerName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">{c.customerName}</h2>
        <p className="truncate text-xs text-muted-foreground">
          {c.ticketNumber} · {CHANNELS[c.channel].label}{c.channel === "email" ? ` · ${c.email ?? ""}` : ` · ${c.role === "rider" ? "Rider" : "Driver"}`}
        </p>
      </div>
      {canUpdate && (
        <>
          <OptionSelect label="Status" value={c.status} options={STATUS_OPTIONS} onChange={onStatusChange} />
          <Button variant="outline" size="sm" onClick={() => onStatusChange("completed")} disabled={c.status === "completed"}>
            <CheckCircle2 /> <span className="hidden sm:inline">Complete</span>
          </Button>
        </>
      )}
      <Button variant={contextOpen ? "secondary" : "ghost"} size="icon" onClick={onToggleContext} aria-label="Toggle details panel">
        <PanelRight />
      </Button>
    </header>
  );
}
