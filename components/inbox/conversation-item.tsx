import { MessageSquare, PhoneCall } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { slaState } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/inbox";
import { CHANNELS, PRIORITIES, PRODUCTS, STATUSES, initials, topicLabel } from "./meta";

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}

export function ConversationItem({ conversation: c, active, onSelect }: Props) {
  const channel = CHANNELS[c.channel];
  const ChannelIcon = channel.icon;
  const topic = topicLabel(c.topic);
  // Only a waiting hand-off is urgent on the clock; finished tickets don't need an SLA chip.
  const sla = c.needsContact || c.status !== "completed" ? slaState(c.slaDueAt) : null;
  const PreferenceIcon = c.contactPreference === "message" ? MessageSquare : PhoneCall;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn(
        "flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60",
        active && "bg-muted",
      )}
    >
      <div className="relative">
        <Avatar size="lg">
          <AvatarFallback>{initials(c.customerName)}</AvatarFallback>
        </Avatar>
        {c.needsContact ? (
          <span className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white ring-2 ring-background">
            <span className="text-xs leading-none font-bold">!</span>
          </span>
        ) : c.unread ? (
          <span className="absolute -top-1 -left-1 size-3 rounded-full bg-blue-600 ring-2 ring-background" aria-hidden />
        ) : null}
        <span className={cn("absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-background", channel.className)}>
          <ChannelIcon className="size-3" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", c.needsContact || c.unread ? "font-semibold" : "font-medium")}>{c.customerName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{c.lastAt}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{topic ? `${topic} · ${c.preview}` : c.preview}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Where it came from and which product it is about, so mixed lists read at a glance. */}
          <span className={cn("inline-flex h-4 items-center gap-1 rounded px-1.5 text-[10px] font-medium", channel.className)}>
            <ChannelIcon className="size-2.5" /> {channel.label}
          </span>
          {c.product && (
            <span className={cn("inline-flex h-4 items-center rounded px-1.5 text-[10px] font-medium", PRODUCTS[c.product].className)}>
              {PRODUCTS[c.product].label}
            </span>
          )}
          {c.needsContact && (
            <Badge className="h-4 gap-1 px-1.5 text-[10px]">
              <PreferenceIcon className="size-2.5" /> Needs {c.contactPreference === "message" ? "message" : "call"}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", STATUSES[c.status].dot)} />
            {STATUSES[c.status].label}
          </span>
          {(c.priority === "urgent" || c.priority === "high") && (
            <Badge variant="secondary" className={cn("h-4 px-1.5 text-[10px]", PRIORITIES[c.priority].className)}>
              {PRIORITIES[c.priority].label}
            </Badge>
          )}
          {sla && (
            <span className={cn("text-xs", sla.overdue ? "font-medium text-red-600 dark:text-red-400" : sla.soon ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
              {sla.label}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{c.ticketNumber}</span>
        </div>
      </div>
    </button>
  );
}
