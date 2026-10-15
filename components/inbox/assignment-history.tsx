"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAssignmentHistory } from "@/lib/hooks/use-tickets";
import { formatTime } from "@/lib/inbox/mappers";
import type { AssignmentStep } from "@/types/ticket";
import { ASSIGNMENT_REASONS, ASSIGNMENT_RULES } from "./meta";

const who = (a: { id: number; name: string | null } | null) => (a ? (a.name ?? `Staff #${a.id}`) : "Someone");
const isGain = (s: AssignmentStep) => s.type === "assigned" || s.type === "auto_assigned";

/** Why a step happened, in words: the reason, and for a pick how the router chose. */
function why(step: AssignmentStep): string {
  const rule = typeof step.meta?.rule === "string" ? ASSIGNMENT_RULES[step.meta.rule] : undefined;
  const reason = step.reason ? ASSIGNMENT_REASONS[step.reason] : undefined;
  // For a returning customer or a rebalance the rule already says it all.
  if (step.meta?.rule === "previous_agent" || step.meta?.rule === "rebalance") return rule ?? reason ?? "";
  return [reason, rule].filter(Boolean).join(" · ");
}

/** One line of the trail: who gained or lost the ticket, and why. */
function describe(step: AssignmentStep): string {
  const reason = step.type === "queued" ? (step.reason ? ASSIGNMENT_REASONS[step.reason] : undefined) : why(step);
  const text =
    step.type === "queued"
      ? "Waited in the queue"
      : step.type === "unassigned"
        ? `${who(step.agent)} lost it`
        : `${who(step.agent)} got it${step.from ? ` (from ${who(step.from)})` : ""}`;
  return reason ? `${text}: ${reason}` : text;
}

/**
 * Why the current agent has this ticket, and how it got there: the latest assignment's reason (a
 * returning customer, a rebalance, the previous agent leaving …), with the whole trail one click away.
 */
export function AssignmentWhy({ ticketId }: { ticketId: string | null }) {
  const { data } = useAssignmentHistory(ticketId);
  const [open, setOpen] = useState(false);
  const steps = data ?? [];
  if (steps.length === 0) return null;

  const latest = [...steps].reverse().find(isGain);
  const summary = latest ? why(latest) : "";

  return (
    <div className="flex flex-col gap-1">
      {summary && (
        <p className="text-xs text-muted-foreground">
          Why: {summary}
          {latest?.from ? ` · was ${who(latest.from)}` : ""}
        </p>
      )}
      {steps.length > 1 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Assignment history ({steps.length}) {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      )}
      {open && (
        <ol className="flex flex-col gap-1 border-l pl-2.5 text-xs text-muted-foreground">
          {steps.map((s) => (
            <li key={s.id}>
              <span className="font-medium text-foreground">{formatTime(s.at)}</span> · {describe(s)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
