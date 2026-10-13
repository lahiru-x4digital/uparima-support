/** A document the agent is still waiting on from the driver. */
export interface DriverFollowupItem {
  /** A preset key from FOLLOWUP_DOC_PRESETS, or a free label. */
  slot: string;
  received: boolean;
}

/** An agent's "waiting on documents" bookmark on a driver. Mirrors the backend DriverFollowupView. */
export interface DriverFollowup {
  id: string;
  driverId: number;
  driver: { name: string | null; phone: string | null };
  ticket: { id: string; ticketNumber: string } | null;
  owner: { id: number; name: string | null };
  items: DriverFollowupItem[];
  note: string | null;
  dueAt: string | null;
  status: "open" | "done";
  /** Files the driver sent since the owner last looked. */
  newFiles: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverFollowupInput {
  ticketNumber?: string;
  items?: DriverFollowupItem[];
  note?: string;
  /** ISO timestamp, or null to clear. */
  dueAt?: string | null;
  /** Hand over to another agent (update only). */
  ownerId?: number;
}

export const FOLLOWUP_DOC_PRESETS = [
  { slot: "Licence front", label: "Licence front" },
  { slot: "Licence back", label: "Licence back" },
  { slot: "Insurance", label: "Insurance" },
  { slot: "Revenue licence", label: "Revenue licence" },
  { slot: "Vehicle photo", label: "Vehicle photo" },
  { slot: "Profile photo", label: "Profile photo" },
] as const;

export const FOLLOWUP_NOTE_MAX_LENGTH = 300;
