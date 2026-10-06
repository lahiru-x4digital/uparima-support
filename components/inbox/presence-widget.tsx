"use client";

import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/types/inbox";
import { OptionSelect } from "./option-select";

const OPTIONS: { value: PresenceStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "away", label: "Away" },
];

const DOT: Record<PresenceStatus, string> = {
  available: "bg-emerald-500",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

interface Props {
  status: PresenceStatus;
  onlineCount: number;
  onChange: (status: PresenceStatus) => void;
}

// TODO(api): "N online" should come from the staff list (GET /support-desk/staff) plus a live presence feed.
export function PresenceWidget({ status, onlineCount, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 rounded-full", DOT[status])} aria-hidden />
      <OptionSelect label="Your status" value={status} options={OPTIONS} onChange={onChange} />
      <span className="hidden text-xs text-muted-foreground xl:inline">{onlineCount} online</span>
    </div>
  );
}
