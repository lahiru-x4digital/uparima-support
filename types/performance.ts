/** Backend DTOs for `GET /support-desk/me/performance` — the signed-in agent's own numbers. */

export interface TimingStats {
  count: number;
  avgSec: number | null;
  medianSec: number | null;
  /** From the moment it was assigned to the agent (their own speed). */
  avgFromAssignedSec: number | null;
}

export interface AgentMetrics {
  userId: number;
  name: string | null;
  workload: {
    assigned: number;
    completed: number;
    autoClosed: number;
    reopened: number;
    /** Right now, not period-bound. */
    open: number;
    pending: number;
    inReview: number;
    /** Of the open ones, how many the agent has not opened yet. */
    notOpened: number;
    overdue: number;
    oldestOpenAt: string | null;
  };
  speed: {
    firstResponse: TimingStats;
    resolution: TimingStats;
    slaMet: number;
    slaTotal: number;
    slaPct: number | null;
  };
  activity: {
    replies: number;
    whatsappTemplates: number;
    emails: number;
    sms: number;
    notes: number;
    logged: number;
    contacts: number;
  };
  availability: {
    onlineSec: number;
    scheduledSec: number;
    adherencePct: number | null;
  };
}

export interface MyPerformance {
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  agent: AgentMetrics;
  /** The same numbers for the period just before, to show the change. */
  previous: AgentMetrics | null;
}

/** How the agent took part in a driver's approval: pressed approve, logged a call, or sent a manual reply. */
export type ApprovalInvolvement = "approve" | "call" | "reply";

export interface MyApproval {
  approvalId: number;
  driverId: number;
  driver: string | null;
  phone: string | null;
  approvedAt: string;
  /** manual | auto | ai_validate | admin_create */
  approvedHow: string | null;
  approvedBy: string | null;
  involvement: ApprovalInvolvement[];
}

export interface MyApprovals {
  range: { from: string; to: string };
  /** A call or reply counts toward an approval if it came this many days before it. */
  windowDays: number;
  data: MyApproval[];
}

export interface CompletedTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string | null;
  status: string;
  channel: string | null;
  createdAt: string;
  /** When the agent completed it. */
  eventAt: string | null;
  autoClosed: boolean;
}
