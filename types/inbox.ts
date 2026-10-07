import type { ContactPreference, Submitter, TicketPriority, TicketStatus } from "@/types/ticket";

/** Where the customer reached us from (derived from the ticket, see lib/inbox/mappers.ts). */
export type Channel = "rider_app" | "driver_app" | "whatsapp" | "phone";
/** "bot_only" is a conversation with no ticket yet — every WhatsApp message
 * the bot and customer exchanged, but nobody from support has replied. */
export type ConversationStatus = TicketStatus | "bot_only";
export type Priority = TicketPriority;
export type CustomerRole = "rider" | "driver";
export type MessageDirection = "inbound" | "outbound";
export type MessageKind = "text" | "system";
export type MessageState = "sending" | "sent" | "failed";
export type AttachmentKind = "image" | "audio" | "file";

export interface Attachment {
  key: string;
  name: string;
  kind: AttachmentKind;
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
  channel: Channel;
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
  submitter: Submitter;
  messages: Message[];
}

export interface ConversationFilters {
  search: string;
  /** "needs_contact" is the WhatsApp hand-off queue, not a ticket status. */
  status: ConversationStatus | "needs_contact" | "all";
  channel: Channel | "all";
  assignee: "all" | "mine" | "unassigned";
}
