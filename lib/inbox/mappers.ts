import type { Attachment, Channel, Product, Conversation, CustomerRole, Message } from "@/types/inbox";
import type { Staff, Ticket, TicketDetail, TicketReply, TicketRow } from "@/types/ticket";
import type { BotChatMessage, BotChatRow, BotChatThread } from "@/types/bot-chat";

const IMAGE = /\.(jpe?g|png|webp|gif)$/i;
const AUDIO = /\.(ogg|oga|mp3|m4a|aac|wav)$/i;

export function attachmentOf(key: string): Attachment {
  const name = key.split("/").pop() || key;
  const kind = IMAGE.test(name) ? "image" : AUDIO.test(name) ? "audio" : "file";
  return { key, name, kind };
}

/** Where the customer reached us: the bot, an agent-logged call, or one of the apps. */
export function channelOf(t: Pick<Ticket, "channel" | "loggedByUserId" | "submitterType">): Channel {
  if (t.channel === "whatsapp") return "whatsapp";
  if (t.channel === "email") return "email";
  if (t.loggedByUserId != null) return "phone";
  return t.submitterType === "driver" ? "driver_app" : "rider_app";
}

/**
 * Product from the ticket category. Covers the app keys (`uparima_rides`, `ride_reports`,
 * `uparima_ads`, `uparima_jobs`, `uparima_mart`) and the email mailbox keys (`riders`, `drivers`,
 * `ads`, `hire`). The rider and driver apps both send `uparima_rides`, so a ride ticket filed by a
 * driver is "drivers" and one filed by anyone else is "riders".
 */
export function productOf(category: string | null | undefined, submitterType?: Ticket["submitterType"]): Product | null {
  // The apps send ads / jobs as the submitter type, so that wins over the category key.
  if (submitterType === "ads") return "ads";
  if (submitterType === "jobs") return "hire";
  const c = (category ?? "").toLowerCase();
  if (!c) return null;
  if (/hire|job/.test(c)) return "hire";
  if (/driver/.test(c)) return "drivers";
  if (/ride/.test(c)) return submitterType === "driver" ? "drivers" : "riders";
  if (/(^|_)ads?($|_)|classified/.test(c)) return "ads";
  if (/mart/.test(c)) return "mart";
  return null;
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

function base(
  ticket: Ticket,
  staff: Staff[],
  now: Date,
  canReply = true,
): Omit<Conversation, "customerName" | "phone" | "email" | "submitter" | "messages"> {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    role: roleOf(ticket),
    channel: channelOf(ticket),
    product: productOf(ticket.category, ticket.submitterType),
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
    canReply,
    isCurrentSession: true,
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
  const { ticket, replies, submitter, canReply } = detail;
  const customerName =
    row?.submitterName ??
    (submitter?.kind === "driver" ? submitter.name : submitter?.kind === "hire_tenant" ? submitter.tenantName : null) ??
    ticket.reporterPhone ??
    ticket.reporterEmail ??
    "Unknown caller";
  const phone =
    row?.submitterPhone ?? (submitter?.kind === "driver" ? submitter.phone : null) ?? ticket.reporterPhone ?? "—";
  return {
    ...base(ticket, staff, now, canReply),
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

const BOT_CHAT_PREFIX = "bot:";
/** A synthetic conversation id for one session: `bot:<phone>:<sessionId>`,
 * or `bot:<phone>:legacy` for messages logged before sessions existed. */
export const botChatId = (phone: string, sessionId: string | null) =>
  `${BOT_CHAT_PREFIX}${phone}:${sessionId ?? "legacy"}`;

export interface BotChatRef {
  phone: string;
  sessionId: string | null;
}

export function botChatRefFromId(id: string): BotChatRef | null {
  if (!id.startsWith(BOT_CHAT_PREFIX)) return null;
  const rest = id.slice(BOT_CHAT_PREFIX.length);
  const sep = rest.lastIndexOf(":");
  if (sep === -1) return null;
  const sessionId = rest.slice(sep + 1);
  return {
    phone: rest.slice(0, sep),
    sessionId: sessionId === "legacy" ? null : sessionId,
  };
}

function metaOptions(meta: BotChatMessage["meta"]): string[] | undefined {
  const list = meta?.options;
  return Array.isArray(list) ? list.filter((o): o is string => typeof o === "string") : undefined;
}

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const PASSTHROUGH_KINDS = new Set(["tap", "location", "location_request", "media", "cta", "template"]);

/** The backend already knows the WhatsApp media type ("image" | "document" |
 * "audio") — trusting it instead of re-inferring from the synthetic S3 key's
 * extension avoids two independent extension-guessing paths drifting apart. */
function mediaKindOf(mediaKind: string | undefined): Attachment["kind"] {
  if (mediaKind === "image") return "image";
  if (mediaKind === "audio") return "audio";
  return "file";
}

/** Maps the bot's own message kind (buttons/list/tap/location/...) to the
 * portal's Message kind, so the thread renders the way WhatsApp itself
 * does — see MessageBubble. "buttons" and "list" both become "options":
 * WhatsApp shows either as tappable chips under the bubble. */
function botMessage(m: BotChatMessage, customerName: string): Message {
  const kind: Message["kind"] =
    m.kind === "buttons" || m.kind === "list"
      ? "options"
      : PASSTHROUGH_KINDS.has(m.kind)
        ? (m.kind as Message["kind"])
        : "text";
  // Populated once the backend has downloaded and stored the media (a few
  // seconds after the message itself); absent for older messages or a still
  // in-flight/failed capture, in which case the bubble falls back to its
  // icon+text rendering (see MessageBubble's KindLine "media" case).
  const s3Key = str(m.meta?.s3Key);
  const attachments: Attachment[] = s3Key
    ? [{ key: s3Key, name: s3Key.split("/").pop() ?? s3Key, kind: mediaKindOf(str(m.meta?.mediaKind)) }]
    : [];
  return {
    id: m.id,
    direction: m.direction === "in" ? "inbound" : "outbound",
    kind,
    body: m.body,
    time: formatTime(m.createdAt),
    sender: m.direction === "in" ? customerName : "Bot",
    attachments,
    meta: {
      options: metaOptions(m.meta),
      menu: str(m.meta?.menu),
      label: str(m.meta?.label),
      mediaKind: str(m.meta?.mediaKind),
      template: str(m.meta?.template),
    },
  };
}

/** One session of a WhatsApp conversation the bot has had with no ticket
 * yet, as a list-row-shaped synthetic `Conversation` (id
 * `bot:<phone>:<sessionId>`). */
export function botChatRowToConversation(row: BotChatRow, now: Date = new Date()): Conversation {
  const customerName = row.name ?? `+${row.phone}`;
  return {
    id: botChatId(row.phone, row.sessionId),
    ticketNumber: "",
    customerName,
    role: "driver",
    phone: row.phone,
    email: null,
    channel: "whatsapp",
    product: null,
    status: "bot_only",
    priority: null,
    assignedToUserId: null,
    assignedTo: null,
    lastAt: formatTime(row.lastAt, now),
    createdAt: row.lastAt,
    subject: "WhatsApp conversation",
    preview: row.lastDirection === "out" ? `Bot: ${row.lastBody}` : row.lastBody,
    rideId: null,
    needsContact: row.needsContact,
    contactPreference: null,
    contactedAt: null,
    topic: null,
    language: row.language,
    slaDueAt: null,
    canReply: true,
    isCurrentSession: row.isCurrentSession,
    submitter: null,
    messages: [],
  };
}

/** The full bot-chat thread for a ticketless conversation, in `ChatPane`
 * shape. `sessionId` is the session being viewed, which the caller already
 * knows from the row/id it opened — it may differ from
 * `thread.contact.sessionId`, the phone's *current* session (see
 * `BotChatThread.contact.sessionId`). */
export function botChatThreadToConversation(
  phone: string,
  sessionId: string | null,
  thread: BotChatThread,
  now: Date = new Date(),
): Conversation {
  const customerName = thread.contact.name ?? `+${phone}`;
  return {
    id: botChatId(phone, sessionId),
    ticketNumber: "",
    customerName,
    role: "driver",
    phone,
    email: null,
    channel: "whatsapp",
    product: null,
    status: "bot_only",
    priority: null,
    assignedToUserId: null,
    assignedTo: null,
    lastAt: thread.messages.length ? formatTime(thread.messages[thread.messages.length - 1].createdAt, now) : "",
    createdAt: thread.messages[0]?.createdAt ?? new Date().toISOString(),
    subject: "WhatsApp conversation",
    preview: thread.messages[thread.messages.length - 1]?.body ?? "",
    rideId: null,
    needsContact: thread.contact.needsContact,
    contactPreference: null,
    contactedAt: null,
    topic: null,
    language: thread.contact.language,
    slaDueAt: null,
    canReply: thread.canReply,
    isCurrentSession: thread.isCurrentSession,
    submitter: null,
    messages: thread.messages.map((m) => botMessage(m, customerName)),
  };
}
