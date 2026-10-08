"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useReplyToBotChat } from "@/lib/hooks/use-bot-chat-actions";
import { useBotChatList, useBotChatThread } from "@/lib/hooks/use-bot-chats";
import { useCan, useMe, useStaff } from "@/lib/hooks/use-desk";
import { useAssign, useMarkContacted, useReply, useUpdatePriority, useUpdateStatus } from "@/lib/hooks/use-ticket-actions";
import { flattenRows, useTicketCount, useTicketDetail, useTicketList } from "@/lib/hooks/use-tickets";
import { applyClientFilters } from "@/lib/inbox/filters";
import {
  botChatRefFromId,
  botChatRowToConversation,
  botChatThreadToConversation,
  detailToConversation,
  rowToConversation,
} from "@/lib/inbox/mappers";
import { useSupportAlerts } from "@/lib/realtime/support-socket";
import { cn } from "@/lib/utils";
import type { Channel, Conversation, ConversationFilters } from "@/types/inbox";
import { ChatPane } from "./chat-pane";
import { ContextPanel } from "./context-panel";
import { ConversationList } from "./conversation-list";
import { FilterBar } from "./filter-bar";

const NO_STAFF: never[] = [];

/** Which conversations the list shows: tickets and live bot chats together, or one kind. */
export type WorkspaceView = "all" | "tickets" | "bot";

interface Props {
  filters: ConversationFilters;
  onFiltersChange: (next: ConversationFilters) => void;
  /** Defaults to "all". */
  view?: WorkspaceView;
  /** Pin the list to one channel (e.g. Email) and hide the channel picker. */
  lockedChannel?: Channel;
  /** When set and the Email channel is selected, offers a shortcut to the raw mailbox. */
  onOpenMailbox?: () => void;
}

/**
 * Conversation cards on the left, the open thread in the middle, ticket properties on the right.
 * Tickets and the live WhatsApp bot conversations are merged into one list (nothing is deduped by
 * phone — a person can have several rows at once: an earlier closed ticket, a new one, the live
 * bot chat). Owns the selection and the actions; the filters are controlled by the caller so the
 * page header can drive them too.
 */
export function TicketWorkspace({ filters: given, onFiltersChange, view = "all", lockedChannel, onOpenMailbox }: Props) {
  const { user } = useAuth();
  const filters = useMemo(() => (lockedChannel ? { ...given, channel: lockedChannel } : given), [given, lockedChannel]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

  const { data: me } = useMe();
  const { data: staffData } = useStaff();
  const staff = staffData ?? NO_STAFF;
  const canReplyPerm = useCan("support-ticket-reply.create");
  const canUpdate = useCan("support-ticket.update");
  const canSeeEmail = useCan("email-account.view");

  const list = useTicketList(filters);
  const needsContact = useTicketCount("needs-contact", { needsContact: true });
  const botList = useBotChatList(view === "bot" ? filters.search.trim() : "");

  const rows = useMemo(() => flattenRows(list.data), [list.data]);
  const botRows = useMemo(() => botList.data?.pages.flatMap((p) => p.data) ?? [], [botList.data]);

  const ticketConversations = useMemo(() => rows.map((r) => rowToConversation(r, staff)), [rows, staff]);
  const allBotConversations = useMemo(() => botRows.map((r) => botChatRowToConversation(r)), [botRows]);

  const merged = useMemo(() => {
    // A channel-locked list (Email) is tickets only: bot chats are WhatsApp.
    if (lockedChannel || view === "tickets") return ticketConversations;
    if (view === "bot") return allBotConversations;
    return [...ticketConversations, ...allBotConversations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [lockedChannel, view, ticketConversations, allBotConversations]);

  const visible = useMemo(
    () => applyClientFilters(merged, filters, me?.id ?? user?.id ?? null),
    [merged, filters, me?.id, user?.id],
  );

  const activeBotRef = activeId ? botChatRefFromId(activeId) : null;
  const activePhone = activeBotRef?.phone ?? null;
  const activeSessionId = activeBotRef?.sessionId ?? null;
  const isBotActive = !!activeBotRef;

  const detail = useTicketDetail(isBotActive ? null : activeId);
  const botThread = useBotChatThread(activePhone, activeSessionId);

  const active = useMemo((): Conversation | null => {
    if (!activeId) return null;
    if (activeBotRef) {
      if (botThread.data) {
        return botChatThreadToConversation(activeBotRef.phone, activeBotRef.sessionId, botThread.data);
      }
      return allBotConversations.find((c) => c.id === activeId) ?? null;
    }
    const row = rows.find((r) => r.id === activeId);
    if (detail.data) return detailToConversation(detail.data, row, staff);
    return ticketConversations.find((c) => c.id === activeId) ?? null;
  }, [activeId, activeBotRef, botThread.data, allBotConversations, rows, detail.data, ticketConversations, staff]);

  const ticketId = isBotActive ? "" : (activeId ?? "");
  const reply = useReply(ticketId);
  const replyToBot = useReplyToBotChat(activePhone ?? "");
  const updateStatus = useUpdateStatus(ticketId);
  const updatePriority = useUpdatePriority(ticketId);
  const assign = useAssign(ticketId);
  const markContacted = useMarkContacted(ticketId);

  // A live hand-off alert can open its ticket straight away.
  function select(id: string) {
    setActiveId(id);
    setMobilePane("chat");
  }
  useSupportAlerts(!!user, select);

  const botView = view === "bot" && !lockedChannel;
  const threadLoading = isBotActive ? botThread.isLoading : !!activeId && detail.isLoading;
  const threadError = isBotActive
    ? botThread.isError
      ? getErrorMessage(botThread.error)
      : null
    : detail.isError
      ? getErrorMessage(detail.error)
      : null;
  const filtered =
    filters.search !== "" || (!lockedChannel && filters.channel !== "all") || filters.assignee !== "all" || filters.status !== "all";

  // Sending the first reply to a bot-only chat opens a ticket behind the scenes, but the agent
  // stays on the bot conversation they were already reading; the row gains a ticket number next
  // time the list refreshes. Replies on an email ticket go out as a real email (see backend).
  async function send(message: string, files: File[]) {
    if (isBotActive) return replyToBot.mutateAsync(message);
    return reply.mutateAsync({ message, files });
  }

  return (
    <div className="flex min-h-0 flex-1">
      <section className={cn("flex min-h-0 w-full flex-col border-r lg:w-[360px] lg:shrink-0", mobilePane === "chat" && "hidden lg:flex")}>
        {!botView && (
          <FilterBar filters={filters} needsContactCount={needsContact.data} hideChannel={!!lockedChannel}
            onChange={(p) => onFiltersChange({ ...given, ...p })} />
        )}
        {!lockedChannel && filters.channel === "email" && canSeeEmail && onOpenMailbox && (
          <button type="button" onClick={onOpenMailbox}
            className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted">
            <Mail className="size-3.5 text-primary" />
            <span className="flex-1">Tickets created from email. Open the full mailbox to read and send mail.</span>
            <span className="font-medium text-primary">Open mailbox</span>
          </button>
        )}
        <ConversationList
          conversations={visible}
          activeId={activeId}
          loading={botView ? botList.isLoading : list.isLoading}
          error={(botView ? botList.isError : list.isError) ? getErrorMessage(botView ? botList.error : list.error) : null}
          hasMore={!!(botView ? botList.hasNextPage : list.hasNextPage)}
          loadingMore={botView ? botList.isFetchingNextPage : list.isFetchingNextPage}
          filtered={filtered}
          onSelect={select}
          onRetry={() => (botView ? void botList.refetch() : void list.refetch())}
          onLoadMore={() => (botView ? void botList.fetchNextPage() : void list.fetchNextPage())}
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
  );
}
