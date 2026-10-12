/** The signed-in agent's routing state: `GET /support-desk/me/routing`. */

export type Presence = "online" | "away" | "offline";

export interface Shift {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** "HH:MM", Sri Lanka time; an end at or before the start runs past midnight. */
  startTime: string;
  endTime: string;
}

export interface MyRouting {
  presence: Presence;
  inShift: boolean;
  todayShifts: Shift[];
  languages: string[];
  /** Ticket category keys; empty = takes every category. */
  skills: string[];
  routingEnabled: boolean;
  /** Open (pending + in review) tickets assigned to me. */
  openLoad: number;
}
