/** Backend DTOs for `/support-desk/*`. Dates arrive as ISO strings. */

import type { BotChatMessage } from "./bot-chat";

export type TicketStatus = "pending" | "in_review" | "completed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type SubmitterType = "user" | "driver" | "hire_tenant";
/** Where a ticket came from: the apps/portal, or the WhatsApp bot. */
export type TicketChannel = "app" | "whatsapp";
export type ContactPreference = "call" | "message";

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: number | null;
  submitterType: SubmitterType;
  category: string;
  subject: string;
  message: string;
  /** S3 keys; resolve with `assetUrl()`. */
  attachments: string[] | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToUserId: number | null;
  slaDueAt: string | null;
  rideId: string | null;
  reporterPhone: string | null;
  /** Set on tickets imported from a connected mailbox. */
  source?: "app" | "phone" | "email";
  reporterEmail?: string | null;
  loggedByUserId: number | null;
  channel: TicketChannel;
  needsContact: boolean;
  contactPreference: ContactPreference | null;
  topic: string | null;
  contactLanguage: string | null;
  contactedAt: string | null;
  contactedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A row of `GET /support-desk/tickets`: the ticket plus who wrote in. */
export interface TicketRow extends Ticket {
  submitterName: string | null;
  submitterPhone: string | null;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  authorId: number | null;
  isStaffReply: boolean;
  message: string;
  attachments: string[] | null;
  createdAt: string;
}

export interface DriverSubmitter {
  kind: "driver";
  driverId: number;
  name: string;
  phone: string | null;
  status: string;
  vehicleRegistrationNumber: string | null;
  suspensionReason: string | null;
  averageRating: number;
  totalRides: number;
  creditBalance: number;
  platformFeeOwedLkr: number;
}

export interface HireTenantSubmitter {
  kind: "hire_tenant";
  tenantId: string;
  tenantName: string;
}

export type Submitter = DriverSubmitter | HireTenantSubmitter | null;

export interface TicketDetail {
  ticket: Ticket;
  replies: TicketReply[];
  submitter: Submitter;
  /** Whether a reply can still be delivered over WhatsApp right now (23.5h
   * window from the customer's last message). Always true for non-WhatsApp
   * tickets, which deliver in-app instead. */
  canReply: boolean;
  /** For a whatsapp-channel ticket: the actual bot conversation (prompts,
   * taps, photos, voice notes) that led to this hand-off, so the thread
   * mirrors WhatsApp itself instead of just the ticket's stored message.
   * Null for a non-WhatsApp ticket, or a WhatsApp ticket old enough to
   * predate sessions. */
  whatsappSession: BotChatMessage[] | null;
  /** This customer's other tickets, newest first (empty for an
   * agent-logged ticket with no matched account). */
  previousTickets: PreviousTicketSummary[];
}

/** One row of a customer's ticket history, for the desk's context panel. */
export interface PreviousTicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface TicketListParams {
  page?: number;
  perPage?: number;
  status?: TicketStatus;
  category?: string;
  needsContact?: boolean;
  channel?: TicketChannel;
  /** Only tickets imported from email. */
  source?: "email";
}

export interface Staff {
  id: number;
  name: string | null;
}

export interface DeskProfile {
  id: number;
  name: string | null;
  email: string | null;
  type: string;
  roles: string[];
  permissions: string[];
}

/** `GET /support-desk/lookup/rides/:id`. */
export interface RideLookup {
  id: string;
  status: string;
  fareLkr: number | string;
  createdAt: string | null;
  completedAt: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  driver: {
    id: number;
    name: string;
    phone: string | null;
    vehicleRegistrationNumber: string | null;
  } | null;
  rider: { id: number; name: string | null; phone: string | null } | null;
}

/** Payload of the `support:handoff` socket event. */
export interface HandoffEvent {
  ticketId: string;
  ticketNumber: string;
  priority: TicketPriority;
  topic: string | null;
  driverName: string | null;
  phone: string;
  contactPreference: ContactPreference | null;
  language: string | null;
  slaDueAt: string | null;
}
