"use client";

import { useMemo, useState } from "react";
import { Inbox, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { CURRENT_AGENT, MOCK_CONVERSATIONS, TEAM } from "@/lib/mock/inbox";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationFilters, ConversationStatus, Message, PresenceStatus, Priority } from "@/types/inbox";
import { ChatPane } from "./chat-pane";
import { ContextPanel } from "./context-panel";
import { ConversationList } from "./conversation-list";
import { FilterBar } from "./filter-bar";
import { PresenceWidget } from "./presence-widget";

const DEFAULT_FILTERS: ConversationFilters = { search: "", status: "all", channel: "all", assignee: "all" };

/**
 * Inbox UI shell. Design-only: all data is local mock state — replace the
 * `useState` below with service hooks (lib/services/*.service.ts) when wiring the API.
 */
export function InboxShell() {
  // TODO(api): replace this mock state with a `useTickets(filters)` hook over lib/services/tickets.service.ts
  //   -> GET /support-desk/tickets?page&perPage&status&category (paginated; no `search`, `channel` or
  //   `assignee` params exist yet — add them backend-side or keep filtering client-side for the loaded page).
  // TODO(api): current agent + permissions come from GET /support-desk/me (lib/services/support-desk.service.ts);
  //   use permissions to hide reply/status/assign controls the account can't use.
  const { logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS);
  const [activeId, setActiveId] = useState<string | null>(MOCK_CONVERSATIONS[0].id);
  const [contextOpen, setContextOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");
  // TODO(api): presence has no backend endpoint yet (needs GET/POST presence + a socket event) — local only for now.
  const [presence, setPresence] = useState<PresenceStatus>("available");

  // TODO(api): once the backend filters server-side, drop this and pass `filters` to the query instead.
  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.channel !== "all" && c.channel !== filters.channel) return false;
      if (filters.assignee === "mine" && c.assignedTo !== CURRENT_AGENT) return false;
      if (filters.assignee === "unassigned" && c.assignedTo !== null) return false;
      if (!q) return true;
      return [c.customerName, c.ticketNumber, c.phone].some((v) => v.toLowerCase().includes(q));
    });
  }, [conversations, filters]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);
  const onlineCount = TEAM.filter((t) => t.presence === "available").length;

  const patch = (id: string, change: Partial<Conversation>) =>
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, ...change } : c)));

  // TODO(api): opening a thread should load the full ticket + replies (GET /support-desk/tickets/:id)
  //   and mark it read. No "mark read"/unread-count endpoint exists yet — needs backend support.
  function select(id: string) {
    setActiveId(id);
    setMobilePane("chat");
    patch(id, { unread: 0 });
  }

  // TODO(api): "text" -> POST /support-desk/tickets/:id/replies (multipart: message + files), then replace the
  //   optimistic row with the saved reply (see inbox-react's optimistic send: temp negative id, swap on success,
  //   remove + toast on failure). "note" has NO endpoint yet — internal notes need a backend field/route.
  function addMessage(kind: Message["kind"], body: string) {
    if (!active) return;
    const message: Message = {
      id: Date.now(),
      direction: "outbound",
      kind,
      body,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      sender: CURRENT_AGENT,
      state: kind === "text" ? "sent" : undefined,
    };
    patch(active.id, { messages: [...active.messages, message] });
  }

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Inbox className="size-4" /></span><span className="font-heading text-base font-bold">Support Inbox</span>
          {unreadTotal > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unreadTotal} unread</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PresenceWidget status={presence} onlineCount={onlineCount} onChange={setPresence} />
          <ThemeToggle />
          {/* logout() already calls POST /auth/logout via auth.service — nothing more to wire. */}
          <Button variant="ghost" size="sm" onClick={logout}><LogOut /> <span className="hidden sm:inline">Sign out</span></Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className={cn("flex min-h-0 w-full flex-col border-r lg:w-[360px] lg:shrink-0", mobilePane === "chat" && "hidden lg:flex")}>
          <FilterBar filters={filters} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />
          <ConversationList conversations={visible} activeId={activeId} onSelect={select} />
        </section>

        <main className={cn("min-h-0 min-w-0 flex-1", mobilePane === "list" ? "hidden lg:flex" : "flex")}>
          <ChatPane
            conversation={active}
            contextOpen={contextOpen}
            typingName={null}
            onBack={() => setMobilePane("list")}
            onToggleContext={() => setContextOpen((o) => !o)}
            // TODO(api): PATCH /support-desk/tickets/:id/status — update optimistically, roll back on error.
            onStatusChange={(status: ConversationStatus) => active && patch(active.id, { status })}
            onSend={(t) => addMessage("text", t)}
            onNote={(t) => addMessage("note", t)}
          />
        </main>

        {active && contextOpen && (
          <div className={cn("min-h-0 w-[320px] shrink-0", mobilePane === "list" ? "hidden" : "hidden xl:block")}>
            <ContextPanel
              conversation={active}
              team={TEAM}
              // TODO(api): PATCH /support-desk/tickets/:id/assign { assignedToUserId } — send the staff user id, not the name.
              onAssign={(name) => patch(active.id, { assignedTo: name })}
              // TODO(api): PATCH /support-desk/tickets/:id/priority.
              onPriority={(priority: Priority) => patch(active.id, { priority })}
              onClose={() => setContextOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
