export type Channel = "rider_app" | "driver_app" | "whatsapp" | "email" | "phone";
export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type Priority = "low" | "normal" | "high" | "urgent";
export type CustomerRole = "rider" | "driver";
export type MessageDirection = "inbound" | "outbound";
export type MessageKind = "text" | "note" | "system";
export type MessageState = "sending" | "sent" | "delivered" | "read";
export type PresenceStatus = "available" | "busy" | "away";

export interface Message {
  id: number;
  direction: MessageDirection;
  kind: MessageKind;
  body: string;
  /** Display time, e.g. "10:42". */
  time: string;
  sender: string;
  state?: MessageState;
}

export interface Conversation {
  id: string;
  ticketNumber: string;
  customerName: string;
  role: CustomerRole;
  phone: string;
  channel: Channel;
  status: ConversationStatus;
  priority: Priority;
  assignedTo: string | null;
  unread: number;
  lastAt: string;
  tags: string[];
  rideId: string | null;
  city: string;
  memberSince: string;
  totalRides: number;
  messages: Message[];
}

export interface TeamMember {
  id: string;
  name: string;
  presence: PresenceStatus;
}

export interface ConversationFilters {
  search: string;
  status: ConversationStatus | "all";
  channel: Channel | "all";
  assignee: "all" | "mine" | "unassigned";
}
