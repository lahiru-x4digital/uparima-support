import { MessageSquare, PhoneCall, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/lib/hooks/use-desk";
import { isNewToMe, slaState, timeAgo } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/inbox";
import {
  AUTO_CLOSE_REASONS,
  CHANNELS,
  ONBOARDING_CATEGORY,
  ONBOARDING_REASONS,
  PRIORITIES,
  PRODUCTS,
  QUEUED_REASONS,
  QUEUED_SHORT,
  STATUSES,
  initials,
  topicLabel,
} from "./meta";

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  /** "Assigned to me" is on: mark the ones I still have to finish. */
  markOpen?: boolean;
  /** The signed-in agent, to tell which tickets just landed on them. */
  meId?: number | null;
}

/** The row's background: new-to-me and selected tints. Shared with the checkbox cell beside
 * the row (conversation-list.tsx) so the two always read as one row. */
export function rowTint(c: Conversation, active: boolean, meId?: number | null) {
  return cn(
    isNewToMe(c, meId) && "bg-primary/5",
    // Selected: a light primary tint, strong enough to stand out in light mode too.
    active && "bg-primary/15 dark:bg-primary/25",
  );
}

/** Hover for a row wrapped in a `group/row` (the list with checkboxes), so hovering either the
 * checkbox cell or the row lights up both. A standalone row uses its own `hover:` instead. */
export function rowHover(active: boolean) {
  return active
    ? "group-hover/row:bg-primary/20 dark:group-hover/row:bg-primary/30"
    : "group-hover/row:bg-muted/60";
}

export function ConversationItem({ conversation: c, active, onSelect, markOpen, meId }: Props) {
  const isAdmin = useIsAdmin();
  const channel = CHANNELS[c.channel];
  const ChannelIcon = channel.icon;
  const topic = topicLabel(c.topic);
  // Only a waiting hand-off is urgent on the clock; finished tickets don't need an SLA chip.
  const sla = c.needsContact || c.status !== "completed" ? slaState(c.slaDueAt) : null;
  // Red "!" = a driver asked for a person and is waiting. Yellow "!" = on my list and not finished
  // (only in the "Assigned to me" view). Red wins when both apply.
  const showHelpAlert = c.needsContact;
  const showMineAlert = !showHelpAlert && !!markOpen && c.status !== "completed";
  const mine = meId != null && c.assignedToUserId === meId && c.status !== "completed";
  const assignedAt = mine ? (c.routing?.assignedAt ?? null) : null;
  const newToMe = isNewToMe(c, meId);
  const PreferenceIcon = c.contactPreference === "message" ? MessageSquare : PhoneCall;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn(
        "flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60",
        rowTint(c, active, meId),
        active && "hover:bg-primary/20 dark:hover:bg-primary/30",
        rowHover(active),
      )}
    >
      <div className="relative">
        <Avatar size="lg">
          <AvatarFallback>{initials(c.customerName)}</AvatarFallback>
        </Avatar>
        {/* One corner for every "look at me" mark: the red "!" (waiting for contact, or assigned to me
            and not finished) and the blue NEW for a ticket/message nobody has opened yet. */}
        {(showHelpAlert || showMineAlert || c.unread) && (
          <div className="absolute -top-1 -left-1 flex items-center gap-0.5">
            {showHelpAlert && (
              <span title="Waiting for contact"
                className="flex size-5 items-center justify-center rounded-full bg-destructive text-white ring-2 ring-background">
                <span className="text-xs leading-none font-bold">!</span>
              </span>
            )}
            {showMineAlert && (
              <span title="Assigned to you and not finished yet"
                className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background">
                <span className="text-xs leading-none font-bold">!</span>
              </span>
            )}
            {c.unread && (
              <span className="flex h-4 items-center rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-background">
                NEW
              </span>
            )}
          </div>
        )}
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
          {newToMe && (
            <span title="Assigned to you and you have not opened it yet"
              className="inline-flex h-4 items-center rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
              New to you
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
          {/* Admins see whose chat it is at a glance (a finished ticket still shows who had it). */}
          {isAdmin && c.ticketNumber && (
            <span
              title={c.assignedTo ? `Assigned to ${c.assignedTo}` : "Not assigned to anyone"}
              className={cn(
                "inline-flex h-4 max-w-40 items-center gap-1 rounded px-1.5 text-[10px] font-medium",
                c.assignedTo ? "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200" : "bg-muted text-muted-foreground",
              )}
            >
              <UserRound className="size-2.5 shrink-0" />
              <span className="truncate">{c.assignedTo ?? "Unassigned"}</span>
            </span>
          )}
          {assignedAt && <span className="text-xs text-muted-foreground">Assigned {timeAgo(assignedAt)}</span>}
          {(c.priority === "urgent" || c.priority === "high") && (
            <Badge variant="secondary" className={cn("h-4 px-1.5 text-[10px]", PRIORITIES[c.priority].className)}>
              {PRIORITIES[c.priority].label}
            </Badge>
          )}
          {c.routing?.category === ONBOARDING_CATEGORY && (
            <span title={ONBOARDING_REASONS[c.routing.onboardingReason ?? ""] ?? "Driver onboarding"}
              className="inline-flex h-4 items-center rounded bg-violet-100 px-1.5 text-[10px] font-medium text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
              Onboarding
            </span>
          )}
          {c.routing?.autoClosed && (
            <span title={AUTO_CLOSE_REASONS[c.routing.autoCloseReason ?? ""] ?? "Closed automatically"}
              className="inline-flex h-4 items-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Auto-closed
            </span>
          )}
          {c.routing?.status === "queued" && c.assignedToUserId == null && (
            <span title={QUEUED_REASONS[c.routing.queuedReason ?? ""] ?? "Waiting for an agent"}
              className={cn("inline-flex h-4 items-center rounded px-1.5 text-[10px] font-medium",
                c.routing.queuedReason === "no_qualified_agent"
                  ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200")}>
              Queued{c.routing.queuedReason && QUEUED_SHORT[c.routing.queuedReason] ? ` · ${QUEUED_SHORT[c.routing.queuedReason]}` : ""}
            </span>
          )}
          {c.routing?.outOfShift && c.assignedToUserId != null && c.status !== "completed" && (
            <span title="Routed to an agent outside their shift because nobody on shift could take it"
              className="inline-flex h-4 items-center rounded bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              Out of shift
            </span>
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
