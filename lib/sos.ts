import type { SosAlert } from "@/types/sos";

export function sosCallerName(a: SosAlert): string {
  const name = a.triggered_by_role === "driver" ? a.driver_name : a.rider_name;
  return name?.trim() || (a.triggered_by_role === "driver" ? "Driver" : "Rider");
}

export function sosRoleLabel(a: SosAlert): string {
  return a.triggered_by_role === "driver" ? "Driver" : "Rider";
}

/** "45s ago", "12m ago", "2h 5m ago" */
export function elapsedSince(iso?: string | null, now = Date.now()): string {
  if (!iso) return "—";
  const secs = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

/** "45s", "3m 20s", "1h 5m" between two timestamps. */
export function durationBetween(from?: string | null, to?: string | null): string {
  if (!from || !to) return "—";
  const secs = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function mapsViewUrl(lat: number | string, lng: number | string) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
