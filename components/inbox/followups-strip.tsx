"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { useDriverFollowupActions, useMyFollowups } from "@/lib/hooks/use-driver-followups";
import { formatTime } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import { AlertDot } from "./option-select";

const isOverdue = (dueAt: string | null) => !!dueAt && new Date(dueAt).getTime() < Date.now();

/**
 * The agent's own "waiting on documents" follow-ups, above the conversation list so they are
 * not lost once the ticket scrolls away. Rows with new files from the driver sort first.
 * Collapsed by default; the dot says something needs a look.
 */
export function FollowupsStrip({ onOpenTicket }: { onOpenTicket: (ticketId: string) => void }) {
  const { data } = useMyFollowups();
  const { remove } = useDriverFollowupActions();
  const [open, setOpen] = useState(false);
  const followups = data ?? [];
  const needsLook = followups.filter((f) => f.newFiles > 0 || isOverdue(f.dueAt)).length;

  // Toast when a driver's file arrives for a follow-up, once per new arrival (not on first load).
  const seenCounts = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    if (!data) return;
    const prev = seenCounts.current;
    if (prev) {
      for (const f of data) {
        if (f.newFiles > (prev.get(f.id) ?? 0)) {
          toast.info(`${f.driver.name ?? "A driver"} sent a file`, {
            description: "A driver you are waiting on has sent something new.",
            ...(f.ticket && { action: { label: "Open", onClick: () => onOpenTicket(f.ticket!.id) } }),
          });
        }
      }
    }
    seenCounts.current = new Map(data.map((f) => [f.id, f.newFiles]));
  }, [data, onOpenTicket]);

  if (followups.length === 0) return null;

  return (
    <div className="border-b">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted/50"
      >
        <Bookmark className="size-3.5 text-primary" />
        <span className="flex-1">My follow-ups ({followups.length})</span>
        {needsLook > 0 && <AlertDot />}
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <ul className="flex max-h-56 flex-col overflow-y-auto px-2 pb-2">
          {followups.map((f) => {
            const overdue = isOverdue(f.dueAt);
            const waiting = f.items.filter((i) => !i.received).map((i) => i.slot);
            return (
              <li key={f.id} className="relative">
                <button
                  type="button"
                  disabled={!f.ticket}
                  title={f.ticket ? "Open the ticket" : "No ticket linked"}
                  onClick={() => f.ticket && onOpenTicket(f.ticket.id)}
                  className="flex w-full flex-col gap-0.5 rounded-md py-1 pr-7 pl-1.5 text-left text-xs enabled:hover:bg-muted"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{f.driver.name ?? f.driver.phone ?? `Driver #${f.driverId}`}</span>
                    {f.newFiles > 0 && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">
                        {f.newFiles} new
                      </span>
                    )}
                  </span>
                  <span className="truncate text-muted-foreground">{waiting.length ? `Needs ${waiting.join(", ")}` : "All received"}</span>
                  {f.dueAt && (
                    <span className={cn("flex items-center gap-1", overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                      <Clock className="size-3" /> {overdue ? "Overdue · " : ""}
                      {formatTime(f.dueAt)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Remove follow-up for ${f.driver.name ?? f.driver.phone ?? `driver #${f.driverId}`}`}
                  title="Remove from my follow-ups"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(f.id)}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
