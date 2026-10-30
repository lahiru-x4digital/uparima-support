/** The admins' WhatsApp chats page: every incoming conversation, with its ticket if it has one. */

export type IncomingTicketFilter = "all" | "none" | "has";

export interface IncomingFilter {
  q: string;
  ticket: IncomingTicketFilter;
  /** yyyy-mm-dd, "" for none. */
  from: string;
  to: string;
}

export interface IncomingTicket {
  id: string;
  ticketNumber: string;
  status: string;
  assignedToUserId: number | null;
  assignedToName: string | null;
  queuedReason: "no_online_match" | "no_qualified_agent" | null;
}

/** One conversation: a phone's WhatsApp session in which the customer wrote at least once. */
export interface IncomingChat {
  phone: string;
  name: string | null;
  language: string | null;
  userId: number | null;
  /** Null for messages logged before sessions existed. */
  sessionId: string | null;
  isCurrentSession: boolean;
  startedAt: string;
  lastAt: string;
  lastDirection: "in" | "out";
  lastKind: string;
  lastBody: string;
  inboundCount: number;
  ticket: IncomingTicket | null;
}

export interface IncomingChatRef {
  phone: string;
  sessionId: string | null;
}

export interface CreateTicketResult extends IncomingChatRef {
  /** created = a new ticket; existing = the phone already had one open; failed = none. */
  outcome: "created" | "existing" | "failed";
  ticketId?: string;
  ticketNumber?: string;
  assignedToUserId?: number | null;
  queuedReason?: string | null;
  error?: string;
}

export interface CreateTicketsSummary {
  results: CreateTicketResult[];
  created: number;
  existing: number;
  assigned: number;
  queued: number;
  failed: number;
}

/** The background run that opens a ticket for every no-ticket conversation. */
export interface CreateAllStatus {
  state: "running" | "done" | "failed";
  /** Tickets opened so far. */
  created: number;
  /** Waiting tickets given an agent by the final pass. */
  assigned: number;
  /** Conversations that could not get a ticket, and the distinct reasons. */
  failed?: number;
  errors?: string[];
  startedAt: string;
  finishedAt?: string;
  error?: string;
}
