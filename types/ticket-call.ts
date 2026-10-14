export type TicketCallStatus = "answered" | "no_answer";

/** A call an agent made about a ticket — `GET /support-desk/tickets/:id/calls`, oldest first. Staff only. */
export interface TicketCall {
  id: string;
  ticketId: string;
  /** 1 = first call, 2 = second … (by call time). */
  number: number;
  status: TicketCallStatus;
  note: string | null;
  calledAt: string;
  caller: { id: number; name: string | null };
}

export interface TicketCallInput {
  status: TicketCallStatus;
  note?: string;
  /** ISO time the call was made; omitted = now. */
  calledAt?: string;
}

export const TICKET_CALL_NOTE_MAX_LENGTH = 1000;
