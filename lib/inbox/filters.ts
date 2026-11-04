import type { Conversation, ConversationFilters } from "@/types/inbox";
import type { TicketListParams } from "@/types/ticket";

/** The staff member an assignee filter points at: me for "mine" / "mine_done", the id for `user:<id>`, else null. */
export function assigneeUserId(assignee: ConversationFilters["assignee"], meId: number | null): number | null {
  if (assignee === "mine" || assignee === "mine_done") return meId;
  if (assignee.startsWith("user:")) return Number(assignee.slice(5)) || null;
  return null;
}

/**
 * The part of the filters the backend can apply: ticket status, the WhatsApp
 * and email channels, the "needs contact" queue, assignee and text search. Everything
 * else (other channels) is applied to the loaded pages in the browser.
 */
export function toListParams(filters: ConversationFilters, meId: number | null = null): TicketListParams {
  const params: TicketListParams = {};
  if (filters.quick && meId != null) return quickListParams(filters, meId);
  if (filters.status === "needs_contact") {
    params.needsContact = true;
    // "bot_only" is a synthetic, client-only status for ticketless WhatsApp
    // conversations — the ticket list endpoint knows nothing about it.
  } else if (filters.status === "to_onboard") {
    params.toOnboard = true;
  } else if (filters.status === "incomplete_driver") {
    params.incompleteDriver = true;
  } else if (filters.status === "queued") {
    // The routing queue: no matching agent was online when it came in.
    params.routingStatus = "queued";
    params.unassigned = true;
    // Closest deadline first: the order the router will hand them out in.
    params.sort = "queue";
  } else if (filters.status === "auto_closed") {
    params.autoClosed = true;
  } else if (filters.status !== "all" && filters.status !== "bot_only") {
    params.status = filters.status;
  }
  // "Assigned to me" / "Unassigned" are applied by the backend so they cover every page.
  // Newest assignment first, so a ticket that just landed on me is on top however old it is.
  // A super admin's "Assigned to <agent>" works the same way.
  const assigneeId = assigneeUserId(filters.assignee, meId);
  if (assigneeId != null) {
    params.assignedToUserId = assigneeId;
    params.sort = "assigned";
  }
  if (filters.assignee === "unassigned") params.unassigned = true;
  // "Assigned to me" is what is still to be dealt with; finished ones are under "My completed tickets".
  if (assigneeId != null && filters.assignee === "mine") params.excludeCompleted = true;
  if (assigneeId != null && filters.assignee === "mine_done") params.status = "completed";
  if (filters.channel === "whatsapp") params.channel = "whatsapp";
  if (filters.channel === "email") params.source = "email";
  const search = filters.search.trim();
  if (search) params.search = search;
  return params;
}

/** A quick view: my own open tickets, narrowed and ordered by what the view is about. */
function quickListParams(filters: ConversationFilters, meId: number): TicketListParams {
  // The chats I opened lately, whatever their status, the one opened last on top: so one I just left is never lost.
  if (filters.quick === "recent") {
    const recent: TicketListParams = { recentlyViewed: true, sort: "recent" };
    const text = filters.search.trim();
    if (text) recent.search = text;
    return recent;
  }
  const params: TicketListParams = { assignedToUserId: meId, excludeCompleted: true, sort: "assigned" };
  switch (filters.quick) {
    case "needs_reply":
      // The customer wrote last: longest-waiting first.
      params.awaitingReply = true;
      params.sort = "waiting";
      break;
    case "new_to_me":
      params.unopened = true;
      break;
    case "sla_risk":
      params.slaDueWithinMinutes = SLA_RISK_MINUTES;
      params.sort = "sla";
      break;
    case "unread":
      params.unread = true;
      break;
    case "pending":
      params.status = "pending";
      break;
    case "waiting_customer":
      params.waitingOnCustomer = true;
      params.sort = "waiting";
      break;
    default:
      break;
  }
  if (filters.channel === "whatsapp") params.channel = "whatsapp";
  if (filters.channel === "email") params.source = "email";
  const search = filters.search.trim();
  if (search) params.search = search;
  return params;
}

const QUICK_TEXT: Record<NonNullable<ConversationFilters["quick"]>, string> = {
  recent: "Chats you opened in the last 7 days, the one you opened last first",
  needs_reply: "Your chats where the customer wrote last and is waiting for an answer",
  new_to_me: "Chats assigned to you that you have not opened yet",
  sla_risk: "Your chats that are overdue or due within 30 minutes",
  unread: "Your chats with a message you have not read",
  pending: "Your chats that are still pending",
  waiting_customer: "Your chats where you replied last and are waiting for the customer",
  all_mine: "All your open chats",
};

const STATUS_TEXT: Record<string, string> = {
  to_onboard: "Drivers still to onboard",
  needs_contact: "Chats waiting for someone to contact the customer",
  incomplete_driver: "Drivers who did not finish signing up",
  all: "All chats",
  pending: "Pending chats",
  in_review: "Chats in review",
  completed: "Finished chats",
  queued: "Chats waiting for an agent",
  auto_closed: "Chats closed automatically",
  bot_only: "Bot conversations",
};

/** The current filters in plain words, shown under the filter boxes so nobody has to guess what the list contains. */
export function describeFilters(filters: ConversationFilters): string {
  if (filters.quick) return QUICK_TEXT[filters.quick];
  const status = STATUS_TEXT[filters.status] ?? "Chats";
  const who =
    filters.assignee === "mine"
      ? "assigned to you"
      : filters.assignee === "mine_done"
        ? "that you finished"
        : filters.assignee === "unassigned"
          ? "that nobody has taken yet"
          : filters.assignee.startsWith("user:")
            ? "assigned to another agent"
            : "from everyone";
  return `${status} ${who}`;
}

/** "SLA at risk" = due within this many minutes, or already overdue. */
export const SLA_RISK_MINUTES = 30;

/**
 * Applies a filter change. A queued ticket has no owner, so "Waiting for agent" with "Assigned to me"
 * would always be empty: choosing one steps the other back to "all" instead of showing a blank list.
 */
export function reconcileFilters(current: ConversationFilters, patch: Partial<ConversationFilters>): ConversationFilters {
  const next = { ...current, ...patch };
  // Picking a quick view means "my open tickets, narrowed by this": it replaces the status and assignee.
  if (patch.quick) {
    next.status = "all";
    next.assignee = "mine";
  } else if (patch.status !== undefined || patch.assignee !== undefined) {
    // Choosing a status or assignee by hand leaves the quick view.
    next.quick = null;
  }
  const owned = (a: ConversationFilters["assignee"]) => a === "mine" || a === "mine_done" || a.startsWith("user:");
  if (patch.status === "queued" && owned(next.assignee)) next.assignee = "all";
  if (patch.assignee && owned(patch.assignee) && next.status === "queued") next.status = "all";
  // "My completed tickets" is every completed ticket of mine: a status that excludes them would
  // leave it blank, so choosing one steps the other back instead.
  const showsCompleted = (s: ConversationFilters["status"]) => s === "all" || s === "completed";
  if (patch.assignee === "mine_done" && !showsCompleted(next.status)) next.status = "all";
  if (patch.status && next.assignee === "mine_done" && !showsCompleted(patch.status)) next.assignee = "all";
  return next;
}

/** Search, non-WhatsApp channels and assignee, over what is already loaded.
 * A bot-only (ticketless) row has no ticket status, so the Pending/In
 * review/Done status tabs never apply to it — it shows on every status tab,
 * same as it does on "All". "Needs contact" is the one exception: ticket rows
 * are already server-filtered to needsContact=true for that tab (see
 * toListParams), but bot rows bypass that server filter entirely, so the
 * same rule is applied here — only a bot row mid-hand-off (needsContact
 * true, see botNeedsContact) shows under that tab. */
export function applyClientFilters(
  conversations: Conversation[],
  filters: ConversationFilters,
  meId: number | null,
): Conversation[] {
  // Text search is applied by the backend (see toListParams), so it reaches
  // every page; filtering it again here could only hide rows it matched.
  // "Recently opened" is decided by the server (it knows what this person opened); keep its tickets as they are.
  if (filters.quick === "recent") {
    return conversations.filter((c) => c.status !== "bot_only" && (filters.channel === "all" || c.channel === filters.channel));
  }
  return conversations.filter((c) => {
    // Quick views are about tickets; a bot-only chat has no owner, SLA or reply state.
    if (filters.quick && c.status === "bot_only") return false;
    if (filters.status === "needs_contact" && c.status === "bot_only" && !c.needsContact) return false;
    // Ticket rows are already server-filtered to incompleteDriver=true for
    // this tab (see toListParams), but bot rows bypass that server filter
    // entirely (list() only applies it when wired in — see useBotChatList),
    // so re-check it here against what the row itself carries.
    if (filters.status === "incomplete_driver" && c.status === "bot_only" && !c.incompleteDriver) return false;
    // Same for "To onboard": the bot list is only server-filtered on its own tab.
    if (filters.status === "to_onboard" && c.status === "bot_only" && !c.toOnboard) return false;
    // Queue and auto-closed are ticket-only views; a bot-only row has no routing.
    if ((filters.status === "queued" || filters.status === "auto_closed") && c.status === "bot_only") return false;
    if (filters.channel !== "all" && c.channel !== filters.channel) return false;
    if (filters.assignee === "mine" && (meId == null || c.assignedToUserId !== meId)) return false;
    // Finished tickets leave "Assigned to me" (unless the Done status is picked explicitly).
    if (filters.assignee === "mine" && c.status === "completed" && filters.status !== "completed") return false;
    if (filters.assignee === "mine_done" && (meId == null || c.assignedToUserId !== meId || c.status !== "completed")) return false;
    if (filters.assignee.startsWith("user:") && c.assignedToUserId !== assigneeUserId(filters.assignee, meId)) return false;
    // "Unassigned" = tickets nobody owns. A bot-only chat has no owner either, but it isn't a ticket.
    if (filters.assignee === "unassigned" && (c.assignedToUserId !== null || c.status === "bot_only")) return false;
    return true;
  });
}
