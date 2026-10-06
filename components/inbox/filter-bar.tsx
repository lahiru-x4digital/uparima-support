"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Channel, ConversationFilters, ConversationStatus } from "@/types/inbox";
import { CHANNELS } from "./meta";
import { OptionSelect } from "./option-select";

interface Props {
  filters: ConversationFilters;
  onChange: (patch: Partial<ConversationFilters>) => void;
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

const STATUS_TABS: { value: ConversationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
];

// TODO(api): channel options are mock. Confirm which source/channel values the ticket DTO exposes (the support
// module currently has ticket categories via GET /support-desk/ticket-categories) and build options from that.
export function FilterBar({ filters, onChange }: Props) {
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
      <Tabs value={filters.status} onValueChange={(v) => onChange({ status: v as ConversationFilters["status"] })}>
        <TabsList className="w-full">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-2 gap-2">
        <OptionSelect label="Channel" value={filters.channel} options={CHANNEL_OPTIONS}
          onChange={(channel) => onChange({ channel })} className="w-full" />
        <OptionSelect label="Assignee" value={filters.assignee} options={ASSIGNEE_OPTIONS}
          onChange={(assignee) => onChange({ assignee })} className="w-full" />
      </div>
    </div>
  );
}
