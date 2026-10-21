"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useIsSuperAdmin, useMe, useStaff } from "@/lib/hooks/use-desk";
import type { Channel, ConversationFilters } from "@/types/inbox";
import { CHANNELS } from "./meta";
import { AlertDot, OptionSelect } from "./option-select";

interface Props {
  filters: ConversationFilters;
  /** Number of drivers still waiting for contact, shown on the first tab. */
  needsContactCount: number | undefined;
  /** Tickets assigned to me that are waiting for a response. */
  myPendingCount?: number;
  /** Tickets assigned to me that I have already contacted (in review). */
  myInReviewCount?: number;
  onChange: (patch: Partial<ConversationFilters>) => void;
  /** The list is pinned to one channel, so don't offer the picker. */
  hideChannel?: boolean;
}

const CHANNEL_OPTIONS: { value: Channel | "all"; label: string }[] = [
  { value: "all", label: "All channels" },
  ...(Object.keys(CHANNELS) as Channel[]).map((c) => ({ value: c, label: CHANNELS[c].label })),
];

/** "Assigned to me · 3 pending · 2 in review", leaving out whichever count is zero. */
function mineLabel(pending = 0, inReview = 0) {
  const parts = [pending ? `${pending} pending` : "", inReview ? `${inReview} in review` : ""].filter(Boolean);
  return parts.length ? `Assigned to me · ${parts.join(" · ")}` : "Assigned to me";
}

export function FilterBar({ filters, needsContactCount, myPendingCount, myInReviewCount, onChange, hideChannel }: Props) {
  // A super admin can also look at any other agent's tickets.
  const isSuperAdmin = useIsSuperAdmin();
  const { data: me } = useMe();
  const { data: staff } = useStaff();
  const otherStaff = isSuperAdmin ? (staff ?? []).filter((s) => s.id !== me?.id) : [];
  const assigneeOptions: { value: ConversationFilters["assignee"]; label: string; alert?: boolean }[] = [
    { value: "all", label: "All" },
    { value: "mine", label: mineLabel(myPendingCount, myInReviewCount), alert: !!myPendingCount },
    { value: "mine_done", label: "My completed tickets" },
    { value: "unassigned", label: "Unassigned" },
    ...otherStaff.map((s) => ({ value: `user:${s.id}` as const, label: `Assigned to ${s.name ?? `User #${s.id}`}` })),
  ];
  // Keep a picked agent selectable while the staff list is still loading.
  if (filters.assignee.startsWith("user:") && !assigneeOptions.some((o) => o.value === filters.assignee)) {
    assigneeOptions.push({ value: filters.assignee, label: `Assigned to user #${filters.assignee.slice(5)}` });
  }
  const statusOptions: { value: ConversationFilters["status"]; label: string }[] = [
    { value: "to_onboard", label: "To onboard" },
    { value: "needs_contact", label: needsContactCount ? `Needs contact (${needsContactCount})` : "Needs contact" },
    { value: "incomplete_driver", label: "Incomplete" },
    { value: "all", label: "Everyone" },
    { value: "pending", label: "Pending" },
    { value: "in_review", label: "In review" },
    { value: "completed", label: "Done" },
    { value: "queued", label: "Waiting for agent" },
    { value: "auto_closed", label: "Auto-closed" },
  ];
  return (
    <div className="flex flex-col gap-2 border-b p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search name, ticket, phone…"
          aria-label="Search conversations"
          className="pl-8"
        />
      </div>
      <div className={hideChannel ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
        <OptionSelect label="Status" value={filters.status} options={statusOptions}
          onChange={(status) => onChange({ status })} className="w-full" />
        {!hideChannel && <OptionSelect label="Channel" value={filters.channel} options={CHANNEL_OPTIONS}
          onChange={(channel) => onChange({ channel })} className="w-full" />}
        <div className="relative">
          <OptionSelect label="Assignee" value={filters.assignee} options={assigneeOptions}
            onChange={(assignee) => onChange({ assignee })} className="w-full" />
          {!!myPendingCount && filters.assignee !== "mine" && (
            <AlertDot className="pointer-events-none absolute -top-1.5 -right-1.5 ring-2 ring-background" />
          )}
        </div>
      </div>
    </div>
  );
}
