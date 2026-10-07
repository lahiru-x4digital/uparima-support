"use client";

import { useMemo, useState } from "react";
import { Bot, Inbox, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useReplyToBotChat } from "@/lib/hooks/use-bot-chat-actions";
import { useBotChatList, useBotChatThread } from "@/lib/hooks/use-bot-chats";
import { useCan, useMe, useStaff } from "@/lib/hooks/use-desk";
import { useAssign, useMarkContacted, useReply, useUpdatePriority, useUpdateStatus } from "@/lib/hooks/use-ticket-actions";
import { flattenRows, useTicketCount, useTicketDetail, useTicketList } from "@/lib/hooks/use-tickets";
import { applyClientFilters } from "@/lib/inbox/filters";
import {
  botChatRowToConversation,
  botChatThreadToConversation,
  detailToConversation,
  phoneFromBotChatId,
  rowToConversation,
} from "@/lib/inbox/mappers";
import { useSupportAlerts } from "@/lib/realtime/support-socket";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationFilters } from "@/types/inbox";
import { ChatPane } from "./chat-pane";
import { ContextPanel } from "./context-panel";
import { ConversationList } from "./conversation-list";
import { FilterBar } from "./filter-bar";

const DEFAULT_FILTERS: ConversationFilters = { search: "", status: "all", channel: "all", assignee: "all" };
const NO_STAFF: never[] = [];
type View = "all" | "tickets" | "bot";

/** The support inbox: tickets from the apps and the WhatsApp bot, merged with
 * raw bot-only chats into one default "All" list, with a "Needs contact" queue. */
export function InboxShell() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [view, setView] = useState<View>("all");
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

  const { data: me } = useMe();
  const { data: staffData } = useStaff();
  const staff = staffData ?? NO_STAFF;
  const canReplyPerm = useCan("support-ticket-reply.create");
  const canUpdate = useCan("support-ticket.update");

  const list = useTicketList(filters);
  const needsContact = useTicketCount("needs-contact", { needsContact: true });
  const botList = useBotChatList(view === "bot" ? filters.search.trim() : "");

  const rows = useMemo(() => flattenRows(list.data), [list.data]);
  const botRows = useMemo(() => botList.data?.pages.flatMap((p) => p.data) ?? [], [botList.data]);

  const ticketConversations = useMemo(() => rows.map((r) => rowToConversation(r, staff)), [rows, staff]);

  // A bot-only row whose phone already has a ticket (e.g. the bot itself
  // handed it off) is dropped — that conversation already shows up via its
  // ticket, with the full thread including the pre-hand-off bot messages.
  const ticketPhones = useMemo(
    () => new Set(rows.map((r) => r.submitterPhone ?? r.reporterPhone).filter((p): p is string => !!p)),
    [rows],
  );
  const botOnlyConversations = useMemo(
    () => botRows.filter((r) => !ticketPhones.has(r.phone)).map((r) => botChatRowToConversation(r)),
    [botRows, ticketPhones],
  );

  const merged = useMemo(() => {
    if (view === "tickets") return ticketConversations;
    if (view === "bot") return botOnlyConversations;
    return [...ticketConversations, ...botOnlyConversations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [view, ticketConversations, botOnlyConversations]);

  const visible = useMemo(
    () => applyClientFilters(merged, filters, me?.id ?? user?.id ?? null),
    [merged, filters, me?.id, user?.id],
  );

  const activePhone = activeId ? phoneFromBotChatId(activeId) : null;
  const isBotActive = !!activePhone;

  const detail = useTicketDetail(isBotActive ? null : activeId);
  const botThread = useBotChatThread(activePhone);

  const active = useMemo((): Conversation | null => {
    if (!activeId) return null;
    if (activePhone) {
      if (botThread.data) return botChatThreadToConversation(activePhone, botThread.data);
      return botOnlyConversations.find((c) => c.id === activeId) ?? null;
    }
    const row = rows.find((r) => r.id === activeId);
    if (detail.data) return detailToConversation(detail.data, row, staff);
    return ticketConversations.find((c) => c.id === activeId) ?? null;
  }, [activeId, activePhone, botThread.data, botOnlyConversations, rows, detail.data, ticketConversations, staff]);

  const ticketId = isBotActive ? "" : (activeId ?? "");
  const reply = useReply(ticketId);
  const replyToBot = useReplyToBotChat(activePhone ?? "");
  const updateStatus = useUpdateStatus(ticketId);
  const updatePriority = useUpdatePriority(ticketId);
  const assign = useAssign(ticketId);
  const markContacted = useMarkContacted(ticketId);

  // A live hand-off alert can open its ticket straight away.
  function select(ticketId: string) {
    setActiveId(ticketId);
    setMobilePane("chat");
  }
  useSupportAlerts(!!user, select);

  const threadLoading = isBotActive ? botThread.isLoading : !!activeId && detail.isLoading;
  const threadError = isBotActive
    ? botThread.isError
      ? getErrorMessage(botThread.error)
      : null
    : detail.isError
      ? getErrorMessage(detail.error)
      : null;
  const filtered = filters.search !== "" || filters.channel !== "all" || filters.assignee !== "all" || filters.status !== "all";

  // Sending the first reply to a bot-only chat opens a ticket behind the
  // scenes — follow the conversation into ticket-space once that happens,
  // so the next reply (and every status/assign control) targets the ticket.
  async function send(message: string, files: File[]) {
    if (isBotActive) {
      const result = await replyToBot.mutateAsync(message);
      setActiveId(result.ticketId);
      return result;
    }
    return reply.mutateAsync({ message, files });
  }

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
            {([["all", "All"], ["tickets", "Tickets"], ["bot", "Bot chats"]] as const).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                className={cn("flex items-center gap-1 rounded-md px-2.5 py-1", view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {key === "bot" && <Bot className="size-3.5" />}{label}
              </button>
            ))}
          </div>
          {me && <span className="hidden text-sm text-muted-foreground sm:inline">{me.name ?? me.email}</span>}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className={cn("flex min-h-0 w-full flex-col border-r lg:w-[360px] lg:shrink-0", mobilePane === "chat" && "hidden lg:flex")}>
          {view !== "bot" && (
            <FilterBar filters={filters} needsContactCount={needsContact.data}
              onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />
          )}
          <ConversationList
            conversations={visible}
            activeId={activeId}
            loading={view === "bot" ? botList.isLoading : list.isLoading}
            error={(view === "bot" ? botList.isError : list.isError) ? getErrorMessage(view === "bot" ? botList.error : list.error) : null}
            hasMore={!!(view === "bot" ? botList.hasNextPage : list.hasNextPage)}
            loadingMore={view === "bot" ? botList.isFetchingNextPage : list.isFetchingNextPage}
            filtered={filtered}
            onSelect={select}
            onRetry={() => (view === "bot" ? void botList.refetch() : void list.refetch())}
            onLoadMore={() => (view === "bot" ? void botList.fetchNextPage() : void list.fetchNextPage())}
          />
        </section>

        <main className={cn("min-h-0 min-w-0 flex-1", mobilePane === "list" ? "hidden lg:flex" : "flex")}>
          {activeId && !active && threadLoading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <ChatPane
              conversation={active}
              loading={threadLoading}
              error={threadError}
              contextOpen={contextOpen}
              canReply={canReplyPerm}
              canUpdate={canUpdate}
              markingContacted={markContacted.isPending}
              onRetry={() => (isBotActive ? void botThread.refetch() : void detail.refetch())}
              onBack={() => setMobilePane("list")}
              onToggleContext={() => setContextOpen((o) => !o)}
              onStatusChange={(status) => status !== "bot_only" && updateStatus.mutate(status)}
              onSend={send}
              onMarkContacted={() => markContacted.mutate()}
            />
          )}
        </main>

        {active && contextOpen && (
          <div className={cn("min-h-0 w-[320px] shrink-0", mobilePane === "list" ? "hidden" : "hidden xl:block")}>
            <ContextPanel
              conversation={active}
              staff={staff}
              canUpdate={canUpdate}
              onAssign={(userId) => assign.mutate(userId)}
              onPriority={(priority) => updatePriority.mutate(priority)}
              onClose={() => setContextOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
