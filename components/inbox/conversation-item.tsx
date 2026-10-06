import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/inbox";
import { CHANNELS, PRIORITIES, STATUSES, initials } from "./meta";

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}

export function ConversationItem({ conversation: c, active, onSelect }: Props) {
  const channel = CHANNELS[c.channel];
  const ChannelIcon = channel.icon;
  const last = c.messages.filter((m) => m.kind !== "system").at(-1);

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
        <span className={cn("absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-background", channel.className)}>
          <ChannelIcon className="size-3" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", c.unread > 0 ? "font-semibold" : "font-medium")}>{c.customerName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{c.lastAt}</span>
        </div>
        <p className={cn("mt-0.5 truncate text-sm", c.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
          {last?.direction === "outbound" && "You: "}
          {last?.body}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", STATUSES[c.status].dot)} />
            {STATUSES[c.status].label}
          </span>
          {(c.priority === "urgent" || c.priority === "high") && (
            <Badge variant="secondary" className={cn("h-4 px-1.5 text-[10px]", PRIORITIES[c.priority].className)}>
              {PRIORITIES[c.priority].label}
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{c.ticketNumber}</span>
          {c.unread > 0 && (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {c.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
