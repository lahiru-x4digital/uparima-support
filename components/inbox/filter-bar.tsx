"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Channel, ConversationFilters } from "@/types/inbox";
import { CHANNELS } from "./meta";
import { OptionSelect } from "./option-select";

interface Props {
  filters: ConversationFilters;
  /** Number of drivers still waiting for contact, shown on the first tab. */
  needsContactCount: number | undefined;
  onChange: (patch: Partial<ConversationFilters>) => void;
  /** The list is pinned to one channel, so don't offer the picker. */
  hideChannel?: boolean;
}

const CHANNEL_OPTIONS: { value: Channel | "all"; label: string }[] = [
  { value: "all", label: "All channels" },
  ...(Object.keys(CHANNELS) as Channel[]).map((c) => ({ value: c, label: CHANNELS[c].label })),
];

const ASSIGNEE_OPTIONS: { value: ConversationFilters["assignee"]; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "mine", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

export function FilterBar({ filters, needsContactCount, onChange, hideChannel }: Props) {
  const tabs: { value: ConversationFilters["status"]; label: string }[] = [
    { value: "needs_contact", label: needsContactCount ? `Needs contact (${needsContactCount})` : "Needs contact" },
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "in_review", label: "In review" },
    { value: "completed", label: "Done" },
  ];
  return (
    <div className="flex flex-col gap-2 border-b p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search loaded: name, ticket, phone…"
          aria-label="Search conversations"
          className="pl-8"
        />
      </div>
      <Tabs value={filters.status} onValueChange={(v) => onChange({ status: v as ConversationFilters["status"] })}>
        <TabsList className="w-full">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-1.5 text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className={hideChannel ? "grid gap-2" : "grid grid-cols-2 gap-2"}>
        {!hideChannel && <OptionSelect label="Channel" value={filters.channel} options={CHANNEL_OPTIONS}
          onChange={(channel) => onChange({ channel })} className="w-full" />}
        <OptionSelect label="Assignee" value={filters.assignee} options={ASSIGNEE_OPTIONS}
          onChange={(assignee) => onChange({ assignee })} className="w-full" />
      </div>
    </div>
  );
}
