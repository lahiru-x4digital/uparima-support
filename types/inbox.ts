import type { ContactPreference, PreviousTicketSummary, Submitter, TicketPriority, TicketStatus } from "@/types/ticket";

/** Where the customer reached us from (derived from the ticket, see lib/inbox/mappers.ts). */
export type Channel = "rider_app" | "driver_app" | "whatsapp" | "phone" | "email";
/** "bot_only" is a conversation with no ticket yet — every WhatsApp message
 * the bot and customer exchanged, but nobody from support has replied. */
export type ConversationStatus = TicketStatus | "bot_only";
export type Priority = TicketPriority;
/** Which Uparima product a conversation is about (derived from the ticket category). */
export type Product = "riders" | "drivers" | "ads" | "hire" | "mart";
export type CustomerRole = "rider" | "driver";
export type MessageDirection = "inbound" | "outbound";
/**
 * "text"/"system" are ticket-thread messages. The rest mirror what the
 * WhatsApp bot actually sent or the customer actually did, so the portal
 * can render it the way WhatsApp itself does — a menu's option chips, a
 * tapped choice as its own small bubble, a location/media/link marker.
 */
export type MessageKind = "text" | "system" | "tap" | "options" | "location" | "location_request" | "media" | "cta" | "template";
export type MessageState = "sending" | "sent" | "failed";
export type AttachmentKind = "image" | "audio" | "file";

export interface Attachment {
  key: string;
  name: string;
  kind: AttachmentKind;
}

/** Extra, kind-specific detail a bot message carries, straight from the WhatsApp payload. */
export interface MessageMeta {
  /** Button/list option titles, for kind "options". */
  options?: string[];
  /** The menu's own title (a WhatsApp list's button label), for kind "options". */
  menu?: string;
  /** Link text, for kind "cta". */
  label?: string;
  /** "image" | "document" etc., for kind "media". */
  mediaKind?: string;
  /** Template name, for kind "template". */
  template?: string;
}

export interface Message {
  id: string;
  direction: MessageDirection;
  kind: MessageKind;
  body: string;
  /** Display time, e.g. "10:42". */
  time: string;
  sender: string;
  state?: MessageState;
  attachments: Attachment[];
  meta?: MessageMeta;
}

export interface Conversation {
  /** The ticket id, or `bot:<phone>` for a WhatsApp conversation with no
   * ticket yet (see lib/inbox/mappers.ts botChatRowToConversation). */
  id: string;
  /** "" for a bot-only conversation — it has no ticket. */
  ticketNumber: string;
  customerName: string;
  role: CustomerRole;
  phone: string;
  /** Sender address for tickets that arrived by email. */
  email: string | null;
  channel: Channel;
  /** Null when the category does not say (e.g. a WhatsApp chat with no ticket yet). */
  product: Product | null;
  status: ConversationStatus;
  /** null for a bot-only conversation, which has no ticket to prioritise. */
  priority: Priority | null;
  assignedToUserId: number | null;
  assignedTo: string | null;
  /** Last activity, display text. */
  lastAt: string;
  createdAt: string;
  subject: string;
  /** First line of the customer's message, for the list. */
  preview: string;
  rideId: string | null;
  /** True when this conversation has activity the current staff member
   * hasn't seen yet. Always false once its detail has been opened. */
  unread: boolean;
  /** WhatsApp hand-off fields. */
  needsContact: boolean;
  contactPreference: ContactPreference | null;
  contactedAt: string | null;
  topic: string | null;
  language: string | null;
  slaDueAt: string | null;
  /** Whether a reply can still be delivered over WhatsApp right now (23.5h
   * window). Always true for a non-WhatsApp conversation. */
  canReply: boolean;
  /** For a bot-only conversation: whether this is the phone's *current*
   * session — a reply always reaches the person now, so it is only offered
   * from the current session, never from one that already ended. Always
   * true for a ticket (there is no "session" concept there). */
  isCurrentSession: boolean;
  submitter: Submitter;
  messages: Message[];
  /** The ticket's own first-message attachments (separate from per-message
   * attachments in `messages`, since the panel shows this as a ticket-level
   * fact, not part of the thread). */
  attachments: Attachment[];
  /** This customer's other tickets, newest first; empty when none or when
   * there's no ticket detail yet (a list row / bot-only conversation). */
  previousTickets: PreviousTicketSummary[];
}

export interface ConversationFilters {
  search: string;
  /** "needs_contact" is the WhatsApp hand-off queue, not a ticket status. */
  status: ConversationStatus | "needs_contact" | "all";
  channel: Channel | "all";
  assignee: "all" | "mine" | "unassigned";
}
