export type TicketCallStatus = "answered" | "no_answer";

/** A call an agent made about a ticket - `GET /support-desk/tickets/:id/calls`, oldest first. Staff only. */
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
  /** Required - a call can't be saved without a note. */
  note: string;
  /** ISO time the call was made; omitted = now. */
  calledAt?: string;
}

/** Result of logging a call on a driver: the ticket it went on, and whether this call opened it. */
export interface DriverCallResult {
  ticketId: string;
  ticketNumber: string;
  ticketCreated: boolean;
  call: TicketCall;
}

export const TICKET_CALL_NOTE_MAX_LENGTH = 1000;

/** `PATCH /support-desk/tickets/:id/calls/:callId` - only the agent who logged the call. The note can't be emptied. */
export interface TicketCallUpdate {
  status?: TicketCallStatus;
  note?: string;
}
