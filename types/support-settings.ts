/** Admin-editable routing / SLA rules: `GET|PUT /admin/support/routing/settings`. */

export type AssignmentStrategy = "least_load" | "round_robin";

export interface SlaHours {
  urgent: number;
  high: number;
  normal: number;
  low: number;
}

export interface RoutingSettings {
  autoAssignEnabled: boolean;
  strategy: AssignmentStrategy;
  /** 0 = no cap. */
  maxOpenPerAgent: number;
  previousAgentEnabled: boolean;
  previousAgentDays: number;
  outOfShiftFallback: boolean;
  awayGraceMinutes: number;
  rebalanceEnabled: boolean;
  rebalanceMinAgeMinutes: number;
  rebalanceMaxMoves: number;
  sweepIntervalSeconds: number;
  loadWindowHours: number;
  slaHours: SlaHours;
  whatsappTicketReuseHours: number;
}

export interface RoutingSettingsView {
  settings: RoutingSettings;
  /** The built-in values, for "reset to default". */
  defaults: RoutingSettings;
  /** 0 = never saved (running on the defaults). */
  version: number;
  updatedBy: number | null;
  updatedAt: string | null;
}
