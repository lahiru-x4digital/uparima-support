import { apiGet, apiGetPage, apiPatch, apiPost } from "@/lib/api";
import type {
  Ticket,
  TicketDetail,
  TicketListParams,
  TicketPriority,
  TicketReply,
  TicketRow,
  TicketStatus,
} from "@/types/ticket";

export const listTickets = (params: TicketListParams) =>
  apiGetPage<TicketRow>("/support-desk/tickets", { params });

export const getTicket = (id: string) => apiGet<TicketDetail>(`/support-desk/tickets/${id}`);

/** Multipart: `message` plus any number of `files`. */
/** `emailTemplateId` (email tickets): sends that designed email instead of plain text. */
export function replyToTicket(id: string, message: string, files: File[] = [], emailTemplateId?: number) {
  const form = new FormData();
  form.append("message", message);
  if (emailTemplateId) form.append("emailTemplateId", String(emailTemplateId));
  for (const file of files) form.append("files", file);
  return apiPost<TicketReply>(`/support-desk/tickets/${id}/replies`, form, {
    // Let the browser set the multipart boundary.
    headers: { "Content-Type": undefined },
  });
}

export const updateTicketStatus = (id: string, status: TicketStatus) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/status`, { status });

export const updateTicketPriority = (id: string, priority: TicketPriority) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/priority`, { priority });

export const assignTicket = (id: string, assignedToUserId: number) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/assign`, { assignedToUserId });

/** The driver who asked the WhatsApp bot for a person has been contacted. */
export const markTicketContacted = (id: string) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/contacted`);
