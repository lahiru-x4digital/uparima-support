import type { Conversation, ConversationFilters } from "@/types/inbox";
import type { TicketListParams } from "@/types/ticket";

/**
 * The part of the filters the backend can apply: ticket status, the WhatsApp
 * channel, and the "needs contact" queue. Everything else (search, other
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
  return params;
}

/** Search, non-WhatsApp channels and assignee, over what is already loaded.
 * Also the only place a bot-only (ticketless) row is checked against the
 * status tab — the backend ticket list can't filter rows that have no
 * ticket, so a specific status (Pending/In review/Done) must hide them, and
 * only "All" or "Needs contact" (neither of which bot-only rows match)
 * shows them. */
export function applyClientFilters(
  conversations: Conversation[],
  filters: ConversationFilters,
  meId: number | null,
): Conversation[] {
  const q = filters.search.trim().toLowerCase();
  return conversations.filter((c) => {
    if (c.status === "bot_only" && filters.status !== "all" && filters.status !== "bot_only") return false;
    if (filters.channel !== "all" && c.channel !== filters.channel) return false;
    if (filters.assignee === "mine" && (meId == null || c.assignedToUserId !== meId)) return false;
    if (filters.assignee === "unassigned" && c.assignedToUserId !== null) return false;
    if (!q) return true;
    return [c.customerName, c.ticketNumber, c.phone, c.subject].some((v) => v.toLowerCase().includes(q));
  });
}
