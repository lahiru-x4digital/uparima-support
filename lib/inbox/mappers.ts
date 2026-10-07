import type { Attachment, Channel, Conversation, CustomerRole, Message } from "@/types/inbox";
import type { Staff, Ticket, TicketDetail, TicketReply, TicketRow } from "@/types/ticket";

const IMAGE = /\.(jpe?g|png|webp|gif)$/i;
const AUDIO = /\.(ogg|oga|mp3|m4a|aac|wav)$/i;

export function attachmentOf(key: string): Attachment {
  const name = key.split("/").pop() || key;
  const kind = IMAGE.test(name) ? "image" : AUDIO.test(name) ? "audio" : "file";
  return { key, name, kind };
}

/** Where the customer reached us: the bot, an agent-logged call, or one of the apps. */
export function channelOf(t: Pick<Ticket, "channel" | "loggedByUserId" | "submitterType"> & Partial<Pick<Ticket, "source">>): Channel {
  if (t.channel === "whatsapp") return "whatsapp";
  if (t.source === "email") return "email";
  if (t.loggedByUserId != null) return "phone";
  return t.submitterType === "driver" ? "driver_app" : "rider_app";
}

export const roleOf = (t: Pick<Ticket, "submitterType">): CustomerRole =>
  t.submitterType === "driver" ? "driver" : "rider";

/** "10:42" for today, "12 Oct" for earlier days. */
export function formatTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export interface SlaState {
  label: string;
  overdue: boolean;
  /** Under an hour left. */
  soon: boolean;
}

/** "Due in 3h" / "Overdue 25m", or null when the ticket has no SLA. */
export function slaState(slaDueAt: string | null, now: Date = new Date()): SlaState | null {
  if (!slaDueAt) return null;
  const due = new Date(slaDueAt).getTime();
  if (Number.isNaN(due)) return null;
  const diff = due - now.getTime();
  const abs = Math.abs(diff);
  const minutes = Math.max(1, Math.round(abs / 60_000));
  const text =
    minutes >= 24 * 60
      ? `${Math.round(minutes / (24 * 60))}d`
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}h`
        : `${minutes}m`;
  return diff < 0
    ? { label: `Overdue ${text}`, overdue: true, soon: false }
    : { label: `Due in ${text}`, overdue: false, soon: diff < 60 * 60_000 };
}

const staffName = (staff: Staff[], id: number | null) =>
  id == null ? null : (staff.find((s) => s.id === id)?.name ?? `Staff #${id}`);

function base(ticket: Ticket, staff: Staff[], now: Date): Omit<Conversation, "customerName" | "phone" | "email" | "submitter" | "messages"> {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    role: roleOf(ticket),
    channel: channelOf(ticket),
    status: ticket.status,
    priority: ticket.priority,
    assignedToUserId: ticket.assignedToUserId,
    assignedTo: staffName(staff, ticket.assignedToUserId),
    lastAt: formatTime(ticket.updatedAt ?? ticket.createdAt, now),
    createdAt: ticket.createdAt,
    subject: ticket.subject,
    preview: ticket.message,
    rideId: ticket.rideId,
    needsContact: ticket.needsContact,
    contactPreference: ticket.contactPreference,
    contactedAt: ticket.contactedAt,
    topic: ticket.topic,
    language: ticket.contactLanguage,
    slaDueAt: ticket.slaDueAt,
  };
}

function firstMessage(ticket: Ticket, customerName: string, now: Date): Message {
  return {
    id: `${ticket.id}:first`,
    direction: "inbound",
    kind: "text",
    body: ticket.message,
    time: formatTime(ticket.createdAt, now),
    sender: customerName,
    attachments: (ticket.attachments ?? []).map(attachmentOf),
  };
}

function replyMessage(reply: TicketReply, customerName: string, staff: Staff[], now: Date): Message {
  return {
    id: reply.id,
    direction: reply.isStaffReply ? "outbound" : "inbound",
    kind: "text",
    body: reply.message,
    time: formatTime(reply.createdAt, now),
    sender: reply.isStaffReply ? (staffName(staff, reply.authorId) ?? "Support") : customerName,
    // An optimistic reply that has not been saved yet.
    state: reply.id.startsWith("tmp-") ? "sending" : undefined,
    attachments: (reply.attachments ?? []).map(attachmentOf),
  };
}

/** A list row: no replies yet, so the thread holds just the customer's first message. */
export function rowToConversation(row: TicketRow, staff: Staff[], now: Date = new Date()): Conversation {
  const customerName = row.submitterName ?? row.submitterPhone ?? row.reporterPhone ?? row.reporterEmail ?? "Unknown caller";
  return {
    ...base(row, staff, now),
    customerName,
    phone: row.submitterPhone ?? row.reporterPhone ?? "—",
    email: row.reporterEmail ?? null,
    submitter: null,
    messages: [firstMessage(row, customerName, now)],
  };
}

/** The full ticket: the first message followed by every reply, oldest first. */
export function detailToConversation(
  detail: TicketDetail,
  row: TicketRow | undefined,
  staff: Staff[],
  now: Date = new Date(),
): Conversation {
  const { ticket, replies, submitter } = detail;
  const customerName =
    row?.submitterName ??
    (submitter?.kind === "driver" ? submitter.name : submitter?.kind === "hire_tenant" ? submitter.tenantName : null) ??
    ticket.reporterPhone ??
    ticket.reporterEmail ??
    "Unknown caller";
  const phone =
    row?.submitterPhone ?? (submitter?.kind === "driver" ? submitter.phone : null) ?? ticket.reporterPhone ?? "—";
  return {
    ...base(ticket, staff, now),
    customerName,
    phone,
    email: ticket.reporterEmail ?? row?.reporterEmail ?? null,
    submitter,
    messages: [
      firstMessage(ticket, customerName, now),
      ...[...replies]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((r) => replyMessage(r, customerName, staff, now)),
    ],
  };
}

/** International digits only, for wa.me links ("+94 77 123 4567" -> "94771234567"). */
export const whatsappDigits = (phone: string) => phone.replace(/\D/g, "");
