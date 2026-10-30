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
  /** The WhatsApp bot session this ticket covers (one ticket per session). */
  whatsappSessionId?: string | null;
  /** Closed by the system, not staff (e.g. the bot finished a driver signup). */
  autoClosed?: boolean;
  autoCloseReason?: string | null;
  assignedAt?: string | null;
  /** When the assignee first opened it; cleared on every (re)assignment, so null = new to them. */
  firstOpenedAt?: string | null;
  assignmentMethod?: AssignmentMethod | null;
  /** Auto-assigned to an online agent outside their shift (nobody in shift matched). */
  assignedOutOfShift?: boolean;
  onboardingReason?: OnboardingReason | null;
  /** "queued" = waiting for a matching agent to come online. */
  routingStatus?: RoutingStatus | null;
  queuedReason?: QueuedReason | null;
  createdAt: string;
  updatedAt: string;
  /** Newest message on the ticket (customer or staff reply), else its creation. Only on list rows. */
  lastActivityAt?: string | null;
}

export type AssignmentMethod = "auto" | "manual";
export type RoutingStatus = "queued" | "assigned";
export type QueuedReason = "no_online_match" | "no_qualified_agent";
export type OnboardingReason = "new_number" | "incomplete" | "pending" | "signup_started";

/** A row of `GET /support-desk/tickets`: the ticket plus who wrote in. */
export interface TicketRow extends Ticket {
  submitterName: string | null;
  submitterPhone: string | null;
  /** The linked driver's `DriverStatus` (e.g. "incomplete", "approved"),
   * null when the submitter isn't a driver or has no driver record. */
  submitterDriverStatus: string | null;
  /** True when this ticket has activity newer than the current staff
   * member's last-seen pointer for it (or they've never opened it). */
  unseen: boolean;
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
  /** When the customer last wrote on WhatsApp (the reply window counts from here). */
  lastCustomerMessageAt?: string | null;
  /** For a whatsapp-channel ticket: the actual bot conversation (prompts,
   * taps, photos, voice notes) that led to this hand-off, so the thread
   * mirrors WhatsApp itself instead of just the ticket's stored message.
   * Null for a non-WhatsApp ticket, or a WhatsApp ticket old enough to
   * predate sessions. */
  whatsappSession: BotChatMessage[] | null;
  /** This customer's other tickets, newest first (empty for an
   * agent-logged ticket with no matched account). */
  previousTickets: PreviousTicketSummary[];
  /** The customer's few earlier tickets with their conversations, oldest first, so the thread
   * can show them above this one. */
  earlierConversations?: Array<{
    ticket: Ticket;
    replies: TicketReply[];
    whatsappSession: BotChatMessage[] | null;
  }>;
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
  /** Driver's profile registration was never finished (DriverStatus "incomplete"). */
  incompleteDriver?: boolean;
  /** The sender is a driver still onboarding, or a number we have no record of. */
  toOnboard?: boolean;
  /** Only tickets assigned to this staff user (users.id). */
  assignedToUserId?: number;
  /**
   * "assigned" = most recently assigned first, pending before in review (the "Assigned to me" view);
   * "queue" = closest response deadline first, the order the routing queue is drained in.
   */
  sort?: "assigned" | "queue" | "oldest";
  /** Only tickets created more than this many hours ago. */
  olderThanHours?: number;
  /** Only tickets nobody owns yet. */
  unassigned?: boolean;
  /** Leaves out completed tickets (an explicit `status` wins). */
  excludeCompleted?: boolean;
  /** Only tickets the system closed (true) or not (false). */
  autoClosed?: boolean;
  /** "queued" = the routing queue: waiting for a matching agent. */
  routingStatus?: RoutingStatus;
  /** Matches ticket number, subject and sender name/phone/email across all pages. */
  search?: string;
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
  /** Who the ticket is already routed to; null while it waits in the queue. */
  assignedToUserId?: number | null;
}

/** Payload of the `support:assigned` socket event, sent only to the assignee. */
export interface AssignedEvent {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  channel: string;
  outOfShift: boolean;
  method: AssignmentMethod;
}

/** One step of a ticket's assignment path (GET /support-desk/tickets/:id/assignment-history). */
export interface AssignmentStep {
  id: string;
  type: "assigned" | "auto_assigned" | "unassigned" | "queued";
  at: string;
  /** new_ticket, queue_drain, reassigned, rebalanced, agent_offline, manual, no_online_match … */
  reason: string | null;
  /** Who did it; null = the system. */
  by: { id: number; name: string | null } | null;
  /** The agent it concerns: who got the ticket, or who lost it. */
  agent: { id: number; name: string | null } | null;
  /** The agent who held it before. */
  from: { id: number; name: string | null } | null;
  meta: Record<string, unknown> | null;
}
