"use client";

// Leaflet touches `window` at import time — only ever load this through next/dynamic with
// { ssr: false } (see ride-journey-modal.tsx).
import "leaflet/dist/leaflet.css";
import "./ride-journey-map.css";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { JOURNEY_COLORS, formatSeconds, tilesFor, type JourneyStop } from "@/lib/ride-journey";

// `label` is the small always-visible tag ("Pickup", "Stop 1", "Destination"); `detail` (the
// address) opens in a popup on click.
export type JourneyMarker = { lat: number; lng: number; label: string; detail?: string | null; color: string };

// One drawn polyline. Order in the array is draw order — later lines sit on top (outage segments
// go last so they're never hidden under a route).
export type JourneyLine = {
  positions: LatLngTuple[];
  color: string;
  weight: number;
  dashArray?: string;
  opacity?: number;
  tooltip?: string;
};

// An outage with no segment to colour (still open on a live ride, or one that lasted until the
// ride ended) — pinned at the last known point.
export type OutageMarker = { lat: number; lng: number; color: string; tooltip: string };

export default function RideJourneyMap({
  lines,
  tripStart,
  tripEnd,
  quotedMarkers,
  stops,
  outageMarkers,
  stadiaKey,
}: {
  lines: JourneyLine[];
  tripStart?: LatLngTuple;
  tripEnd?: LatLngTuple;
  quotedMarkers: JourneyMarker[];
  stops: JourneyStop[];
  outageMarkers: OutageMarker[];
  stadiaKey: string | null;
}) {
  const tiles = tilesFor(stadiaKey);
  const all: LatLngTuple[] = [
    ...lines.flatMap((l) => l.positions),
    ...quotedMarkers.map((m) => [m.lat, m.lng] as LatLngTuple),
  ];
  if (all.length === 0) return null;
  const bounds: LatLngBoundsExpression = all.length === 1 ? [all[0], all[0]] : all;

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30], maxZoom: 17 }}
      scrollWheelZoom
      className="h-full w-full rounded-lg"
    >
      <TileLayer key={tiles.url} url={tiles.url} attribution={tiles.attribution} />

      {lines.map(
        (l, i) =>
          l.positions.length > 1 && (
            <Polyline
              key={`line-${i}`}
              positions={l.positions}
              pathOptions={{
                color: l.color,
                weight: l.weight,
                dashArray: l.dashArray,
                opacity: l.opacity ?? 1,
                lineCap: "round",
              }}
            >
              {l.tooltip && <Tooltip sticky>{l.tooltip}</Tooltip>}
            </Polyline>
          ),
      )}

      {outageMarkers.map((m, i) => (
        <CircleMarker
          key={`outage-${i}`}
          center={[m.lat, m.lng]}
          radius={7}
          pathOptions={{ color: m.color, weight: 3, fillColor: "#fff", fillOpacity: 1, dashArray: "3 3" }}
        >
          <Tooltip>{m.tooltip}</Tooltip>
        </CircleMarker>
      ))}

      {stops.map((s, i) => (
        <CircleMarker
          key={`stop-${i}`}
          center={[s.lat, s.lng]}
          radius={5}
          pathOptions={{ color: "#fff", weight: 2, fillColor: JOURNEY_COLORS.stop, fillOpacity: 1 }}
        >
          <Tooltip>Stopped ~{formatSeconds(s.seconds)}</Tooltip>
        </CircleMarker>
      ))}

      {quotedMarkers.map((m, i) => (
        <CircleMarker
          key={`q-${i}`}
          center={[m.lat, m.lng]}
          radius={8}
          pathOptions={{ color: m.color, weight: 3, fillColor: "#fff", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} className="journey-label">
            <span style={{ background: m.color }}>{m.label}</span>
          </Tooltip>
          <Popup>
            <strong>{m.label}</strong>
            {m.detail && <div className="mt-0.5 text-xs">{m.detail}</div>}
          </Popup>
        </CircleMarker>
      ))}

      {tripStart && (
        <CircleMarker
          center={tripStart}
          radius={6}
          pathOptions={{ color: "#fff", weight: 2, fillColor: JOURNEY_COLORS.start, fillOpacity: 1 }}
        >
          <Tooltip>Trip started here</Tooltip>
        </CircleMarker>
      )}
      {tripEnd && (
        <CircleMarker
          center={tripEnd}
          radius={6}
          pathOptions={{ color: "#fff", weight: 2, fillColor: JOURNEY_COLORS.end, fillOpacity: 1 }}
        >
          <Tooltip>Trip ended here</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
