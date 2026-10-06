import type { ContactPreference, Submitter, TicketPriority, TicketStatus } from "@/types/ticket";

/** Where the customer reached us from (derived from the ticket, see lib/inbox/mappers.ts). */
export type Channel = "rider_app" | "driver_app" | "whatsapp" | "phone";
export type ConversationStatus = TicketStatus;
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
  /** The ticket id. */
  id: string;
  ticketNumber: string;
  customerName: string;
  role: CustomerRole;
  phone: string;
  channel: Channel;
  status: ConversationStatus;
  priority: Priority;
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
