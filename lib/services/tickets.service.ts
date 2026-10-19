import { apiGet, apiGetPage, apiPatch, apiPost } from "@/lib/api";
import type {
  AssignmentStep,
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

/** Who the ticket was given to, in order, and why it moved or waited. */
export const getAssignmentHistory = (id: string) =>
  apiGet<AssignmentStep[]>(`/support-desk/tickets/${id}/assignment-history`);

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

/** A voice note recorded in the portal, sent to a WhatsApp ticket's customer. The backend
 * converts it to OGG/Opus and sends it as a WhatsApp voice message; rejects if WhatsApp refuses. */
export function sendVoiceReply(id: string, recording: Blob) {
  const form = new FormData();
  form.append("audio", recording, voiceFileName(recording));
  return apiPost<TicketReply>(`/support-desk/tickets/${id}/voice-replies`, form, {
    headers: { "Content-Type": undefined },
  });
}

/** A file name whose extension matches what the browser recorded (webm / ogg / mp4). */
export function voiceFileName(recording: Blob) {
  const ext = recording.type.includes("ogg") ? "ogg" : recording.type.includes("mp4") ? "mp4" : "webm";
  return `voice-note.${ext}`;
}

export const updateTicketStatus = (id: string, status: TicketStatus) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/status`, { status });

export const updateTicketPriority = (id: string, priority: TicketPriority) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/priority`, { priority });

/** Completes several of my own tickets at once; ids not assigned to me come back as `skipped`. */
export const bulkCloseTickets = (ids: string[]) =>
  apiPost<{ closed: string[]; skipped: string[] }>("/support-desk/tickets/bulk-close", { ids });

export const assignTicket = (id: string, assignedToUserId: number) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/assign`, { assignedToUserId });

/** The driver who asked the WhatsApp bot for a person has been contacted. */
export const markTicketContacted = (id: string) =>
  apiPatch<Ticket>(`/support-desk/tickets/${id}/contacted`);
