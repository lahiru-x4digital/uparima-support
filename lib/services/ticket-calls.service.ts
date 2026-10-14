import { apiGet, apiPost } from "@/lib/api";
import type { TicketCall, TicketCallInput } from "@/types/ticket-call";

/** Oldest first, so a call's position is its number. */
export const listTicketCalls = (ticketId: string) => apiGet<TicketCall[]>(`/support-desk/tickets/${ticketId}/calls`);

export const logTicketCall = (ticketId: string, input: TicketCallInput) =>
  apiPost<TicketCall>(`/support-desk/tickets/${ticketId}/calls`, input);
