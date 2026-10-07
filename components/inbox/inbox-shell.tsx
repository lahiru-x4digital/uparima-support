"use client";

import { useState } from "react";
import { Bot, Inbox, Mail } from "lucide-react";
import { useCan, useMe } from "@/lib/hooks/use-desk";
import { useTicketCount } from "@/lib/hooks/use-tickets";
import { cn } from "@/lib/utils";
import type { ConversationFilters } from "@/types/inbox";
import { BotChatsView } from "./bot-chats-view";
import { EmailView } from "./email-view";
import { TicketWorkspace } from "./ticket-workspace";

type InboxView = "tickets" | "bot" | "email";
const TABS: { key: InboxView; label: string }[] = [
  { key: "tickets", label: "Tickets" },
  { key: "bot", label: "Bot chats" },
  { key: "email", label: "Email" },
];

const DEFAULT_FILTERS: ConversationFilters = { search: "", status: "all", channel: "all", assignee: "all" };

/** The support inbox page: a header with the view switch, then Tickets, Bot chats or the Email mailbox. */
export function InboxShell() {
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<InboxView>("tickets");
  const { data: me } = useMe();
  const canSeeEmail = useCan("email-account.view");
  const needsContact = useTicketCount("needs-contact", { needsContact: true });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Inbox className="size-4" /></span>
          <span className="font-heading text-base font-bold">Messages</span>
          {!!needsContact.data && (
            <button type="button" onClick={() => { setView("tickets"); setFilters((f) => ({ ...f, status: "needs_contact" })); }}
              className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {needsContact.data} waiting for contact
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border p-0.5 text-sm" role="tablist" aria-label="Inbox view">
            {TABS.filter((t) => t.key !== "email" || canSeeEmail).map(({ key, label }) => (
              <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                className={cn("flex items-center gap-1 rounded-md px-2.5 py-1", view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {key === "bot" && <Bot className="size-3.5" />}{key === "email" && <Mail className="size-3.5" />}{label}
              </button>
            ))}
          </div>
          {me && <span className="hidden text-sm text-muted-foreground sm:inline">{me.name ?? me.email}</span>}
        </div>
      </header>

      {view === "bot" ? <BotChatsView /> : view === "email" ? <EmailView /> : (
        <TicketWorkspace filters={filters} onFiltersChange={setFilters} onOpenMailbox={() => setView("email")} />
      )}
    </div>
  );
}
