import type { Conversation, ConversationFilters } from "@/types/inbox";
import type { TicketListParams } from "@/types/ticket";

/**
 * The part of the filters the backend can apply: ticket status, the WhatsApp
 * and email channels, the "needs contact" queue, assignee and text search. Everything
 * else (other channels) is applied to the loaded pages in the browser.
 */
export function toListParams(filters: ConversationFilters, meId: number | null = null): TicketListParams {
  const params: TicketListParams = {};
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
  } else if (filters.status === "auto_closed") {
    params.autoClosed = true;
  } else if (filters.status !== "all" && filters.status !== "bot_only") {
    params.status = filters.status;
  }
  // "Assigned to me" / "Unassigned" are applied by the backend so they cover every page.
  // Newest assignment first, so a ticket that just landed on me is on top however old it is.
  if (filters.assignee === "mine" && meId != null) {
    params.assignedToUserId = meId;
    params.sort = "assigned";
  }
  if (filters.assignee === "unassigned") params.unassigned = true;
  if (filters.channel === "whatsapp") params.channel = "whatsapp";
  if (filters.channel === "email") params.source = "email";
  const search = filters.search.trim();
  if (search) params.search = search;
  return params;
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
  return conversations.filter((c) => {
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
    if (filters.assignee === "unassigned" && c.assignedToUserId !== null) return false;
    return true;
  });
}
