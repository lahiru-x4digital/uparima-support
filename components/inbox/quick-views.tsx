"use client";

import { AlertTriangle, BellRing, Clock, History, Hourglass, Inbox, MailOpen, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuickView } from "@/types/inbox";
import type { AgentTicketCounts } from "@/types/ticket";

interface ViewDef {
  key: QuickView;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** The number on the chip; none for a list that is not a to-do (Recently opened). */
  count?: (c: AgentTicketCounts) => number;
  /** Chips that mean "act now" turn red/amber when they are not empty. */
  tone?: "urgent" | "attention";
}

// In the order an agent should work through them.
const VIEWS: ViewDef[] = [
  { key: "recent", label: "Recently opened", hint: "The chats you opened in the last 7 days, the one you opened last first. Open a chat, then come back here to find it again.", icon: History },
  { key: "needs_reply", label: "Needs reply", hint: "The customer wrote last and nobody has answered. Longest wait first.", icon: BellRing, count: (c) => c.awaitingReply, tone: "attention" },
  { key: "new_to_me", label: "New to me", hint: "Assigned to you and not opened yet.", icon: Sparkles, count: (c) => c.unopened, tone: "attention" },
  { key: "sla_risk", label: "SLA at risk", hint: "Unanswered and overdue, or due within 30 minutes.", icon: AlertTriangle, count: (c) => c.slaBreached + c.slaSoon, tone: "urgent" },
  { key: "unread", label: "Unread", hint: "A message you have not opened yet.", icon: MailOpen, count: (c) => c.unread },
  { key: "pending", label: "Pending", hint: "Assigned to you and still pending.", icon: Hourglass, count: (c) => c.pending },
  { key: "waiting_customer", label: "Waiting on customer", hint: "You replied last. Nothing to do until they answer.", icon: Clock, count: (c) => c.waitingOnCustomer },
  { key: "all_mine", label: "All mine", hint: "Every open ticket assigned to you.", icon: Inbox, count: (c) => c.openTotal },
];

/** One-click views of an agent's own work, with live counts. */
export function QuickViews({
  active,
  counts,
  onSelect,
}: {
  active: QuickView | null | undefined;
  counts: AgentTicketCounts | undefined;
  onSelect: (view: QuickView | null) => void;
}) {
  return (
    <div role="group" aria-label="My tickets" className="flex gap-1.5 overflow-x-auto border-b px-3 py-2 [scrollbar-width:thin]">
      {VIEWS.map((v) => {
        const n = counts && v.count ? v.count(counts) : undefined;
        const selected = active === v.key;
        const hot = !selected && !!n && v.tone;
        return (
          <button
            key={v.key}
            type="button"
            title={v.hint}
            aria-pressed={selected}
            onClick={() => onSelect(selected ? null : v.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected && "border-primary bg-primary text-primary-foreground",
              !selected && "text-muted-foreground hover:bg-muted hover:text-foreground",
              hot && v.tone === "urgent" && "border-destructive/50 text-destructive",
              hot && v.tone === "attention" && "border-amber-500/60 text-foreground",
            )}
          >
            <v.icon className="size-3.5" aria-hidden />
            {v.label}
            {n !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", selected ? "bg-primary-foreground/20" : "bg-muted")}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
