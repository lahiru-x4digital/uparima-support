import type { Conversation, ConversationFilters } from "@/types/inbox";
import type { TicketListParams } from "@/types/ticket";

/**
 * The part of the filters the backend can apply: ticket status, the WhatsApp
 * and email channels, and the "needs contact" queue. Everything else (search, other
 * channels, assignee) is applied to the loaded pages in the browser.
 */
export function toListParams(filters: ConversationFilters): TicketListParams {
  const params: TicketListParams = {};
  if (filters.status === "needs_contact") {
    params.needsContact = true;
    // "bot_only" is a synthetic, client-only status for ticketless WhatsApp
    // conversations — the ticket list endpoint knows nothing about it.
  } else if (filters.status !== "all" && filters.status !== "bot_only") {
    params.status = filters.status;
  }
  if (filters.channel === "whatsapp") params.channel = "whatsapp";
  if (filters.channel === "email") params.source = "email";
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
  const q = filters.search.trim().toLowerCase();
  return conversations.filter((c) => {
    if (filters.status === "needs_contact" && c.status === "bot_only" && !c.needsContact) return false;
    if (filters.channel !== "all" && c.channel !== filters.channel) return false;
    if (filters.assignee === "mine" && (meId == null || c.assignedToUserId !== meId)) return false;
    if (filters.assignee === "unassigned" && c.assignedToUserId !== null) return false;
    if (!q) return true;
    return [c.customerName, c.ticketNumber, c.phone, c.subject].some((v) => v.toLowerCase().includes(q));
  });
}
