"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngTuple } from "leaflet";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { useRidePath } from "@/lib/hooks/use-rides";
import {
  JOURNEY_COLORS,
  OUTAGE_LABEL,
  findStops,
  formatClock,
  formatSeconds,
  outageAnchor,
  outageColor,
  pointsDuring,
  splitByOutages,
} from "@/lib/ride-journey";
import { cn } from "@/lib/utils";
import type { JourneyOutage, JourneyPoint, JourneyRole } from "@/types/ride";
import type { JourneyLine, OutageMarker } from "./ride-journey-map";

// Leaflet needs the browser, so the map is loaded on the client only.
const RideJourneyMap = dynamic(() => import("./ride-journey-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted" />,
});

const END_REASON_LABEL: Record<string, string> = {
  completed: "Completed",
  early_ended: "Ended early",
  cancelled: "Cancelled",
  no_show: "Rider no-show",
  abandoned: "Abandoned",
};

const toLatLng = (pts: Array<[number, number, ...number[]]>): LatLngTuple[] => pts.map(([lat, lng]) => [lat, lng]);

function legDuration(pts: JourneyPoint[]) {
  return pts.length > 1 ? pts[pts.length - 1][2] - pts[0][2] : null;
}

const km = (v: number | null | undefined) => (v == null ? "—" : `${Number(v).toFixed(2)} km`);

type Side = "both" | "driver" | "rider";

const ROLE_LABEL: Record<JourneyRole, string> = { driver: "Driver", rider: "Rider" };

const outageText = (o: JourneyOutage) =>
  `${ROLE_LABEL[o.role]} · ${OUTAGE_LABEL[o.kind]} · ${formatSeconds(o.to - o.from)} (${formatClock(o.from)} – ${formatClock(o.to)})`;

// Dash styles per leg — the colour says whose line it is, the dash which leg.
const DASH = { search: "1 7", pickup: "8 8" } as const;

/** An outage stretch: a wide translucent band (the area) under the line. */
function outageLines(positions: LatLngTuple[], o: JourneyOutage, tooltip: string, weight = 5): JourneyLine[] {
  const color = outageColor(o.kind);
  return [
    { positions, color, weight: weight + 12, opacity: 0.25, tooltip },
    { positions, color, weight, dashArray: o.kind === "no_signal" ? "8 6" : undefined, tooltip },
  ];
}

function outageSummary(outages: JourneyOutage[], role: JourneyRole) {
  const mine = outages.filter((o) => o.role === role);
  if (!mine.length) return "None";
  return `${mine.length} · ${formatSeconds(mine.reduce((t, o) => t + (o.to - o.from), 0))}`;
}

/**
 * One side's lines: each leg cut at its outages. The normal runs keep the leg's own style; the
 * segments spanning an outage are returned separately so they can be drawn last, on top, in the
 * outage colour. `tripOverride` (the road-snapped driver trip) replaces the raw trip runs — snapped
 * points have no timestamps, so outage segments still come from the raw trace.
 */
function sideLines(
  legs: Array<{ points: JourneyPoint[]; style: Omit<JourneyLine, "positions" | "tooltip">; label: string }>,
  outages: JourneyOutage[],
  tripOverride?: { positions: LatLngTuple[]; faint: Omit<JourneyLine, "positions"> },
) {
  const base: JourneyLine[] = [];
  const gaps: JourneyLine[] = [];
  const drawn = new Set<JourneyOutage>();
  legs.forEach((leg, i) => {
    const isTrip = i === legs.length - 1;
    const segments = splitByOutages(leg.points, outages);
    if (isTrip && tripOverride) {
      base.push({ positions: toLatLng(leg.points), ...tripOverride.faint });
      base.push({ positions: tripOverride.positions, ...leg.style, tooltip: leg.label });
    }
    for (const seg of segments) {
      if (seg.outage) {
        drawn.add(seg.outage);
        gaps.push(...outageLines(seg.positions, seg.outage, outageText(seg.outage)));
      } else if (!(isTrip && tripOverride)) {
        base.push({ positions: seg.positions, ...leg.style, tooltip: leg.label });
      }
    }
  });
  const all = legs.flatMap((l) => l.points);
  // Outages with no stretch of their own: no location came back before the ride ended (or, live,
  // hasn't yet) — pinned where the line stops.
  const undrawn = outages.filter((o) => !drawn.has(o));
  const markers: OutageMarker[] = undrawn.flatMap((o) => {
    const at = outageAnchor(all, o);
    return at
      ? [{ lat: at[0], lng: at[1], color: outageColor(o.kind), tooltip: `${outageText(o)} — last known location` }]
      : [];
  });
  return { base, gaps, markers, undrawn };
}

/** A ride's recorded journey on a map: the driver's and the rider's paths, stops and signal outages. */
export function RideJourneyModal({ rideId, onClose }: { rideId: string | null; onClose: () => void }) {
  // Remount per ride (key on the caller side) so the toggles below start fresh.
  const { data, error } = useRidePath(rideId);
  const [snapped, setSnapped] = useState(true);
  const [side, setSide] = useState<Side>("both");

  const hasDriver = !!data && (data.pickupLeg.length > 0 || data.tripLeg.length > 0);
  const riderLegs = {
    search: data?.riderSearchLeg ?? [],
    pickup: data?.riderPickupLeg ?? [],
    trip: data?.riderTripLeg ?? [],
  };
  const hasRider = !!data && (riderLegs.search.length > 0 || riderLegs.pickup.length > 0 || riderLegs.trip.length > 0);
  const hasPath = hasDriver || hasRider;
  const showDriver = hasDriver && (side !== "rider" || !hasRider);
  const showRider = hasRider && (side !== "driver" || !hasDriver);
  const canSnap = !!data?.matchedTripLeg?.length;
  const showSnapped = snapped && canSnap && showDriver;
  const outages = data?.outages ?? [];

  const outagesFor = (role: JourneyRole) => outages.filter((o) => o.role === role);
  const driver =
    data && showDriver
      ? sideLines(
          [
            {
              points: data.pickupLeg,
              style: { color: JOURNEY_COLORS.pickupLeg, weight: 5, dashArray: DASH.pickup },
              label: "Driver · to pickup",
            },
            { points: data.tripLeg, style: { color: JOURNEY_COLORS.trip, weight: 6 }, label: "Driver · trip" },
          ],
          outagesFor("driver"),
          showSnapped
            ? { positions: toLatLng(data.matchedTripLeg!), faint: { color: JOURNEY_COLORS.tripFaint, weight: 3 } }
            : undefined,
        )
      : null;
  // Drawn after (on top of) the driver, thinner, so both stay visible where they overlap.
  const rider =
    data && showRider
      ? sideLines(
          [
            {
              points: riderLegs.search,
              style: { color: JOURNEY_COLORS.riderSearch, weight: 4, dashArray: DASH.search },
              label: "Rider · finding a driver",
            },
            {
              points: riderLegs.pickup,
              style: { color: JOURNEY_COLORS.riderPickupLeg, weight: 3, dashArray: DASH.pickup },
              label: "Rider · before pickup",
            },
            { points: riderLegs.trip, style: { color: JOURNEY_COLORS.rider, weight: 3 }, label: "Rider · trip" },
          ],
          outagesFor("rider"),
        )
      : null;
  // A rider outage that never closed (phone locked / no coverage until the ride ended) has no line
  // of its own — but during the trip the rider is in the car, so the driver's route over that time
  // shows where it was.
  const tripFrom = data?.tripLeg[0]?.[2];
  const tripTo = data?.tripLeg[data.tripLeg.length - 1]?.[2];
  const riderOutageOnDriverRoute: JourneyLine[] =
    data && rider && tripFrom != null && tripTo != null
      ? rider.undrawn.flatMap((o) => {
          const from = Math.max(o.from, tripFrom);
          const to = Math.min(o.to, tripTo);
          if (to <= from) return [];
          const positions = pointsDuring(data.tripLeg, from, to);
          if (positions.length < 2) return [];
          return outageLines(
            positions,
            o,
            `${outageText(o)} — rider was in the car; shown along the driver's route`,
            3,
          );
        })
      : [];
  const lines = [
    ...(driver?.base ?? []),
    ...(rider?.base ?? []),
    ...riderOutageOnDriverRoute,
    ...(driver?.gaps ?? []),
    ...(rider?.gaps ?? []),
  ];
  // Trip start/end markers follow the driver's trip when it's shown.
  const startEndLeg = showDriver ? data?.tripLeg : riderLegs.trip;
  const tripStart = startEndLeg?.length ? toLatLng([startEndLeg[0]])[0] : undefined;
  const tripEnd =
    startEndLeg && startEndLeg.length > 1 ? toLatLng([startEndLeg[startEndLeg.length - 1]])[0] : undefined;
  // Where the rider actually was when they booked — may differ from the pickup they chose.
  const bookedAt = showRider ? (riderLegs.search[0] ?? null) : null;
  const shownOutages = outages.filter((o) => (o.role === "driver" ? showDriver : showRider));

  const quotedMarkers = data
    ? [
        data.quoted.pickup.lat != null && {
          lat: data.quoted.pickup.lat,
          lng: data.quoted.pickup.lng!,
          label: "Pickup",
          detail: data.quoted.pickup.address,
          color: JOURNEY_COLORS.start,
        },
        ...data.quoted.stops.map((s, i) => ({
          lat: s.lat,
          lng: s.lng,
          label: `Stop ${i + 1}`,
          detail: s.address,
          color: JOURNEY_COLORS.quoted,
        })),
        data.quoted.dropoff.lat != null && {
          lat: data.quoted.dropoff.lat,
          lng: data.quoted.dropoff.lng!,
          label: "Destination",
          detail: data.quoted.dropoff.address,
          color: JOURNEY_COLORS.end,
        },
      ].filter(
        (m): m is { lat: number; lng: number; label: string; detail: string | null | undefined; color: string } =>
          !!m,
      )
    : [];

  const toggle = "flex overflow-hidden rounded-full border";
  const toggleButton = (active: boolean) =>
    cn(
      "px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
    );

  return (
    <Modal open={!!rideId} onClose={onClose} title={`Journey · ${rideId?.slice(0, 8) ?? ""}`} className="sm:max-w-5xl">
      {error ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : !data ? (
        <div className="h-[45vh] min-h-[260px] w-full animate-pulse rounded-lg bg-muted" />
      ) : !hasPath ? (
        <div className="flex h-48 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No journey recorded</p>
          <p>Rides before journey recording was enabled, or rides with no GPS pings, have no route.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {data.live && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                Live — ride in progress
              </span>
            )}
            {data.endReason && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                {END_REASON_LABEL[data.endReason] ?? data.endReason}
              </span>
            )}
            {hasDriver && hasRider && (
              <div className={cn(toggle, "ml-auto")}>
                {(
                  [
                    ["both", "Both"],
                    ["driver", "Driver"],
                    ["rider", "Rider"],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} onClick={() => setSide(value)} className={toggleButton(side === value)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className={cn(toggle, !(hasDriver && hasRider) && "ml-auto")}>
              {(
                [
                  [true, "Snapped to road"],
                  [false, "Raw GPS"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  disabled={(value && !canSnap) || !showDriver}
                  onClick={() => setSnapped(value)}
                  title={value && !canSnap ? "Road snapping unavailable (OSRM not configured or no match)" : undefined}
                  className={toggleButton(value ? showSnapped : !showSnapped)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[45vh] min-h-[260px] w-full">
            <RideJourneyMap
              key={data.rideId}
              lines={lines}
              tripStart={tripStart}
              tripEnd={tripEnd}
              quotedMarkers={
                bookedAt
                  ? [
                      ...quotedMarkers,
                      {
                        lat: bookedAt[0],
                        lng: bookedAt[1],
                        label: "Booked here",
                        detail: `Rider's location when booking · ${formatClock(bookedAt[2])}`,
                        color: JOURNEY_COLORS.riderSearch,
                      },
                    ]
                  : quotedMarkers
              }
              stops={showDriver ? findStops(data.tripLeg) : []}
              outageMarkers={[...(driver?.markers ?? []), ...(rider?.markers ?? [])]}
            />
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            {showDriver && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="w-14 font-semibold" style={{ color: JOURNEY_COLORS.trip }}>
                  Driver
                </span>
                <Legend color={JOURNEY_COLORS.pickupLeg} style="dashed" label="To pickup" />
                <Legend color={JOURNEY_COLORS.trip} label={showSnapped ? "Trip (snapped to road)" : "Trip (raw GPS)"} />
                {showSnapped && <Legend color={JOURNEY_COLORS.tripFaint} label="Raw GPS" />}
                <Legend color={JOURNEY_COLORS.stop} style="dot" label="Stopped ≥30s" />
              </div>
            )}
            {showRider && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="w-14 font-semibold" style={{ color: JOURNEY_COLORS.rider }}>
                  Rider
                </span>
                {riderLegs.search.length > 0 && (
                  <Legend color={JOURNEY_COLORS.riderSearch} style="dotted" label="Finding a driver" />
                )}
                <Legend color={JOURNEY_COLORS.riderPickupLeg} style="dashed" label="Before pickup" />
                <Legend color={JOURNEY_COLORS.rider} label="Trip" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="w-14 font-semibold text-foreground">Outages</span>
              <Legend color={JOURNEY_COLORS.offline} style="band" label="Connection lost (no internet)" />
              <Legend color={JOURNEY_COLORS.noSignal} style="band-dashed" label="No location (connected, no GPS fix)" />
              <Legend color={JOURNEY_COLORS.offline} style="ring" label="Last known location — no update until ride end" />
            </div>
            {data.matchedPartial && showSnapped && (
              <p className="text-amber-700 dark:text-amber-400">Some segments couldn&apos;t be snapped and show raw GPS.</p>
            )}
          </div>

          {(data.driverMockPoints > 0 || data.riderMockPoints > 0) && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Mock (fake) GPS detected —{" "}
              {[
                data.driverMockPoints > 0 && `driver: ${data.driverMockPoints} fixes`,
                data.riderMockPoints > 0 && `rider: ${data.riderMockPoints} fixes`,
              ]
                .filter(Boolean)
                .join(", ")}
              . That side&apos;s line{data.driverMockPoints > 0 ? " and the fare distance" : ""} can&apos;t be trusted.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Quoted distance" value={km(data.quoted.distanceKm)} />
            <Stat label="Actual (fare)" value={km(data.actualDistanceKm)} />
            <Stat label="Snapped route" value={km(data.matchedDistanceKm)} />
            <Stat
              label="Drive to pickup"
              value={legDuration(data.pickupLeg) != null ? formatSeconds(legDuration(data.pickupLeg)!) : "—"}
            />
            <Stat
              label="Trip duration"
              value={legDuration(data.tripLeg) != null ? formatSeconds(legDuration(data.tripLeg)!) : "—"}
            />
            <Stat label="Driver points (stored / raw)" value={`${data.pointCount} / ${data.rawPointCount}`} />
            <Stat
              label="Rider points (stored / raw)"
              value={hasRider ? `${data.riderPointCount} / ${data.riderRawPointCount}` : "Not shared"}
            />
            <Stat label="Driver gaps" value={outageSummary(outages, "driver")} />
            <Stat label="Rider gaps" value={hasRider ? outageSummary(outages, "rider") : "—"} />
          </div>

          {shownOutages.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Side</th>
                    <th className="px-3 py-1.5 font-medium">Type</th>
                    <th className="px-3 py-1.5 font-medium">From</th>
                    <th className="px-3 py-1.5 font-medium">To</th>
                    <th className="px-3 py-1.5 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {shownOutages.map((o, i) => (
                    <tr key={i} className="border-t">
                      <td
                        className="px-3 py-1.5 font-medium"
                        style={{ color: o.role === "driver" ? JOURNEY_COLORS.trip : JOURNEY_COLORS.rider }}
                      >
                        {ROLE_LABEL[o.role]}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block size-2.5 rounded-full" style={{ background: outageColor(o.kind) }} />
                          {OUTAGE_LABEL[o.kind]}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">{formatClock(o.from)}</td>
                      <td className="px-3 py-1.5 tabular-nums">{formatClock(o.to)}</td>
                      <td className="px-3 py-1.5 tabular-nums">{formatSeconds(o.to - o.from)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

type LegendStyle = "solid" | "dashed" | "dotted" | "dot" | "ring" | "band" | "band-dashed";

function Legend({ color, label, style = "solid" }: { color: string; label: string; style?: LegendStyle }) {
  let swatch;
  if (style === "dot") {
    swatch = <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />;
  } else if (style === "ring") {
    swatch = <span className="inline-block size-3 rounded-full bg-white" style={{ border: `2px dashed ${color}` }} />;
  } else if (style === "band" || style === "band-dashed") {
    swatch = (
      <span className="inline-flex h-3 w-6 items-center rounded-sm" style={{ background: `${color}40` }}>
        <span
          className="block w-full"
          style={{ borderTop: `3px ${style === "band" ? "solid" : "dashed"} ${color}` }}
        />
      </span>
    );
  } else {
    swatch = <span className="inline-block w-6" style={{ borderTop: `3px ${style} ${color}` }} />;
  }
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  );
}
