/** A staff-only handoff note on a driver — `GET /support-desk/drivers/:id/notes`. Never shown to drivers. */
export interface DriverNote {
  id: string;
  driverId: number;
  content: string;
  /** The ticket the note was written about, if the author linked one. */
  ticket: { id: string; ticketNumber: string } | null;
  author: { id: number; name: string | null };
  createdAt: string;
  updatedAt: string;
  edited: boolean;
}

export interface DriverNoteInput {
  content: string;
  /** "TKT-…" (the prefix is optional); empty = not linked to a ticket. */
  ticketNumber?: string;
}

export const DRIVER_NOTE_MAX_LENGTH = 2000;
