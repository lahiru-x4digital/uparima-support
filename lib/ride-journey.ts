// Leaflet-free helpers for the ride journey modal and map — kept out of the map component so
// importing them never pulls Leaflet into server rendering.

import type { JourneyOutage, JourneyPoint } from "@/types/ride";

export type JourneyStop = { lat: number; lng: number; seconds: number };

// One colour per side so the two paths are never mixed up — the leg is told apart by the dash
// style instead (dotted = rider finding a driver, dashed = before pickup, solid = trip). Outage
// colours are kept clear of both.
export const DRIVER_COLOR = "#7c3aed"; // purple
export const RIDER_COLOR = "#0d9488"; // teal

export const JOURNEY_COLORS = {
  pickupLeg: DRIVER_COLOR,
  trip: DRIVER_COLOR,
  tripFaint: "#c4b5fd",
  start: "#16a34a",
  end: "#dc2626",
  quoted: "#0f172a",
  stop: "#d97706",
  riderSearch: RIDER_COLOR,
  riderPickupLeg: RIDER_COLOR,
  rider: RIDER_COLOR,
  offline: "#e11d48",
  noSignal: "#f97316",
};

export const OUTAGE_LABEL: Record<JourneyOutage["kind"], string> = {
  offline: "Connection lost",
  no_signal: "No location",
};

export const outageColor = (kind: JourneyOutage["kind"]) =>
  kind === "offline" ? JOURNEY_COLORS.offline : JOURNEY_COLORS.noSignal;

export type JourneySegment = { positions: [number, number][]; outage?: JourneyOutage };

/**
 * Cuts one side's line into normal runs and the stretches that fall inside an outage. A step
 * between two consecutive points belongs to an outage when their time spans overlap — so it works
 * whether the backend kept exactly the points bracketing the gap or not, and consecutive steps of
 * the same outage become one stretch. Outages no step overlaps (still open on a live ride, or one
 * that ran to the ride's end) aren't stretches — see `outageAnchor`.
 */
export function splitByOutages(points: JourneyPoint[], outages: JourneyOutage[]): JourneySegment[] {
  const out: JourneySegment[] = [];
  let run: [number, number][] = [];
  let runOutage: JourneyOutage | undefined;
  const flush = () => {
    if (run.length > 1) out.push({ positions: run, outage: runOutage });
  };
  for (let i = 0; i < points.length - 1; i++) {
    const [lat0, lng0, t0] = points[i];
    const [lat1, lng1, t1] = points[i + 1];
    const outage = outages.find((o) => o.from < t1 && o.to > t0);
    if (run.length === 0 || outage !== runOutage) {
      flush();
      run = [[lat0, lng0]];
      runOutage = outage;
    }
    run.push([lat1, lng1]);
  }
  flush();
  return out;
}

/** The part of a line recorded between two times, padded with the points just before and after. */
export function pointsDuring(points: JourneyPoint[], from: number, to: number): [number, number][] {
  const first = points.findIndex((p) => p[2] >= from);
  if (first === -1) return [];
  let last = points.length - 1;
  for (let i = first; i < points.length; i++) {
    if (points[i][2] > to) {
      last = i;
      break;
    }
  }
  return points.slice(Math.max(0, first - 1), last + 1).map(([lat, lng]) => [lat, lng]);
}

/** Where to pin an outage: the last recorded point at or before it began. */
export function outageAnchor(points: JourneyPoint[], o: JourneyOutage): [number, number] | null {
  let best: JourneyPoint | null = null;
  for (const p of points) {
    if (p[2] <= o.from) best = p;
    else break;
  }
  best ??= points[0] ?? null;
  return best ? [best[0], best[1]] : null;
}

export function formatClock(epochSec: number) {
  return new Date(epochSec * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Matches the backend's PATH_KEEP_STOP_SECONDS — a gap this long between two recorded points
// means the vehicle stood still.
export const STOP_GAP_SECONDS = 30;

export function findStops(points: JourneyPoint[]): JourneyStop[] {
  const stops: JourneyStop[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const gap = points[i + 1][2] - points[i][2];
    if (gap >= STOP_GAP_SECONDS) stops.push({ lat: points[i][0], lng: points[i][1], seconds: gap });
  }
  return stops;
}

export function formatSeconds(total: number) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Plain OpenStreetMap tiles: free, no key. Fine for an internal portal's volume. (The rider app's
 * live-tracking map uses Stadia with a backend key; the portal used to share that key and its quota.)
 */
export const MAP_TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  // OpenStreetMap answers 403 "Access blocked" to a website that doesn't say who it is (the Referer
  // header), and this site is served with `Referrer-Policy: same-origin`, which hides it from other
  // hosts. Set on the tile images themselves, this sends our origin (never the page path) to the
  // tile server only.
  referrerPolicy: "strict-origin-when-cross-origin",
} as const;

export const mapsViewUrl = (lat: number | string, lng: number | string) => `https://www.google.com/maps?q=${lat},${lng}`;
