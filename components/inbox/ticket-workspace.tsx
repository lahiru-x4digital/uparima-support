"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCan, useMe, useStaff } from "@/lib/hooks/use-desk";
import { useAssign, useMarkContacted, useReply, useUpdatePriority, useUpdateStatus } from "@/lib/hooks/use-ticket-actions";
import { flattenRows, useTicketCount, useTicketDetail, useTicketList } from "@/lib/hooks/use-tickets";
import { applyClientFilters } from "@/lib/inbox/filters";
import { detailToConversation, rowToConversation } from "@/lib/inbox/mappers";
import { useSupportAlerts } from "@/lib/realtime/support-socket";
import { cn } from "@/lib/utils";
import type { Channel, ConversationFilters } from "@/types/inbox";
import { ChatPane } from "./chat-pane";
import { ContextPanel } from "./context-panel";
import { ConversationList } from "./conversation-list";
import { FilterBar } from "./filter-bar";

const NO_STAFF: never[] = [];

interface Props {
  filters: ConversationFilters;
  onFiltersChange: (next: ConversationFilters) => void;
  /** Pin the list to one channel (e.g. Email) and hide the channel picker. */
  lockedChannel?: Channel;
  /** When set and the Email channel is selected, offers a shortcut to the raw mailbox. */
  onOpenMailbox?: () => void;
}

/**
 * Ticket cards on the left, the open thread in the middle, ticket properties on the right.
 * Owns the selection and the ticket actions; the filters are controlled by the caller so the
 * page header can drive them too.
 */
export function TicketWorkspace({ filters: given, onFiltersChange, lockedChannel, onOpenMailbox }: Props) {
  const { user } = useAuth();
  const filters = useMemo(() => (lockedChannel ? { ...given, channel: lockedChannel } : given), [given, lockedChannel]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

  const { data: me } = useMe();
  const { data: staffData } = useStaff();
  const staff = staffData ?? NO_STAFF;
  const canReply = useCan("support-ticket-reply.create");
  const canUpdate = useCan("support-ticket.update");
  const canSeeEmail = useCan("email-account.view");

  const list = useTicketList(filters);
  const needsContact = useTicketCount("needs-contact", { needsContact: true });
  const detail = useTicketDetail(activeId);

  const rows = useMemo(() => flattenRows(list.data), [list.data]);
  const conversations = useMemo(() => rows.map((r) => rowToConversation(r, staff)), [rows, staff]);
  const visible = useMemo(
    () => applyClientFilters(conversations, filters, me?.id ?? user?.id ?? null),
    [conversations, filters, me?.id, user?.id],
  );

  const active = useMemo(() => {
    if (!activeId) return null;
    const row = rows.find((r) => r.id === activeId);
    if (detail.data) return detailToConversation(detail.data, row, staff);
    return conversations.find((c) => c.id === activeId) ?? null;
  }, [activeId, rows, detail.data, conversations, staff]);

  const id = activeId ?? "";
  const reply = useReply(id);
  const updateStatus = useUpdateStatus(id);
  const updatePriority = useUpdatePriority(id);
  const assign = useAssign(id);
  const markContacted = useMarkContacted(id);

  // A live hand-off alert can open its ticket straight away.
  function select(ticketId: string) {
    setActiveId(ticketId);
    setMobilePane("chat");
  }
  useSupportAlerts(!!user, select);

  const threadLoading = !!activeId && detail.isLoading;
  const threadError = detail.isError ? getErrorMessage(detail.error) : null;
  const filtered =
    filters.search !== "" || (!lockedChannel && filters.channel !== "all") || filters.assignee !== "all" || filters.status !== "all";

  return (
    <div className="flex min-h-0 flex-1">
      <section className={cn("flex min-h-0 w-full flex-col border-r lg:w-[360px] lg:shrink-0", mobilePane === "chat" && "hidden lg:flex")}>
        <FilterBar filters={filters} needsContactCount={needsContact.data} hideChannel={!!lockedChannel}
          onChange={(p) => onFiltersChange({ ...given, ...p })} />
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
          loading={list.isLoading}
          error={list.isError ? getErrorMessage(list.error) : null}
          hasMore={!!list.hasNextPage}
          loadingMore={list.isFetchingNextPage}
          filtered={filtered}
          onSelect={select}
          onRetry={() => void list.refetch()}
          onLoadMore={() => void list.fetchNextPage()}
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
            canReply={canReply}
            canUpdate={canUpdate}
            markingContacted={markContacted.isPending}
            onRetry={() => void detail.refetch()}
            onBack={() => setMobilePane("list")}
            onToggleContext={() => setContextOpen((o) => !o)}
            onStatusChange={(status) => updateStatus.mutate(status)}
            onSend={(message, files) => reply.mutateAsync({ message, files })}
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
