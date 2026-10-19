import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { TicketCall, TicketCallInput, TicketCallUpdate } from "@/types/ticket-call";

/** Oldest first, so a call's position is its number. */
export const listTicketCalls = (ticketId: string) => apiGet<TicketCall[]>(`/support-desk/tickets/${ticketId}/calls`);

export const logTicketCall = (ticketId: string, input: TicketCallInput) =>
  apiPost<TicketCall>(`/support-desk/tickets/${ticketId}/calls`, input);

/** Corrects a call's outcome and/or note. The backend allows it only for the agent who logged the call (403 otherwise). */
export const updateTicketCall = (ticketId: string, callId: string, input: TicketCallUpdate) =>
  apiPatch<TicketCall>(`/support-desk/tickets/${ticketId}/calls/${callId}`, input);
