"use client";

import { useState } from "react";
import { Download, Loader2, Mail, Ticket } from "lucide-react";
import { OptionSelect } from "@/components/inbox/option-select";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/hooks/use-desk";
import { useEmailAccounts, useImportEmails } from "@/lib/hooks/use-email-accounts";
import { MailInbox } from "@/components/mail/mail-inbox";
import { cn } from "@/lib/utils";
import type { ConversationFilters } from "@/types/inbox";
import { TicketWorkspace } from "./ticket-workspace";

const DEFAULT_FILTERS: ConversationFilters = { search: "", status: "all", channel: "email", assignee: "all" };

type Mode = "tickets" | "mailbox";
const IMPORT_DAYS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const MODES: { key: Mode; label: string; icon: typeof Ticket }[] = [
  { key: "tickets", label: "Tickets", icon: Ticket },
  { key: "mailbox", label: "Mailbox", icon: Mail },
];

/**
 * Email → Inbox. Default view is the helpdesk layout: email ticket cards, the open thread with
 * reply, and status / priority / assignee on the right. "Mailbox" is the raw mailbox (read, send).
 */
export function EmailTicketsView() {
  const [mode, setMode] = useState<Mode>("tickets");
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS);
  const [days, setDays] = useState("30");
  const accounts = useEmailAccounts();
  const importEmails = useImportEmails();
  const canImport = useCan("email-account.update");
  const activeIds = (accounts.data ?? []).filter((a) => a.status !== "inactive").map((a) => a.id);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Mail className="size-4" /></span>
          <span className="font-heading text-base font-bold">Email</span>
        </div>
        <div className="flex items-center gap-2">
        {mode === "tickets" && canImport && activeIds.length > 0 && (
          <>
            <OptionSelect label="Import range" value={days} options={IMPORT_DAYS} onChange={setDays} />
            <Button size="sm" variant="outline" disabled={importEmails.isPending}
              title="Turn mail already in the mailbox into tickets. Emails that are already tickets are skipped."
              onClick={() => importEmails.mutate({ ids: activeIds, days: Number(days) })}>
              {importEmails.isPending ? <Loader2 className="animate-spin" /> : <Download />} Import existing emails
            </Button>
          </>
        )}
        <div className="flex rounded-lg border p-0.5 text-sm" role="tablist" aria-label="Email view">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
              className={cn("flex items-center gap-1 rounded-md px-2.5 py-1", mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>
        </div>
      </header>
      {mode === "mailbox" ? (
        <MailInbox />
      ) : (
        <TicketWorkspace filters={filters} onFiltersChange={setFilters} lockedChannel="email" />
      )}
    </div>
  );
}
