/** Backend DTOs for `/support-desk/rides/*`. Dates arrive as ISO strings. */

import type { PageMeta } from "@/types/ticket";

/** One row of a ride list — a ride with its rider, driver, vehicle and fare. */
export interface Ride {
  id: string;
  status: string;
  rider_user_id?: number | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  driver_id?: number | null;
  driver_name?: string | null;
  /** The driver's account was deleted; the ride still references the old id. */
  driver_missing?: boolean;
  driver_phone?: string | null;
  vehicle_number?: string | null;
  vehicle_type_name?: string | null;
  pickup_address?: string;
  dropoff_address?: string;
  distance_km?: string;
  /** The quoted fare. */
  fare_lkr?: string;
  /** What was actually charged, when the trip's tracked distance triggered a fare true-up. */
  final_fare_lkr?: string;
  route_deviation_flag?: "none" | "over" | "under" | "under_suspicious";
  actual_distance_km?: string;
  /** The driver started the trip with the pickup-OTP override instead of a verified code. */
  pickup_otp_overridden?: boolean;
  pickup_otp_override_reason?: string | null;
  /** The driver completed the trip with the destination override (rider went further than quoted). */
  destination_overridden?: boolean;
  destination_override_reason?: string | null;
  /** Either party ended the trip before the destination. */
  early_ended?: boolean;
  early_end_by?: "driver" | "rider" | null;
  early_end_reason?: string | null;
  /** The ride's recorded GPS journey was saved (at ride end). */
  has_journey?: boolean;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
  /** An admin marked this abandoned ride completed after support confirmed it happened. */
  admin_recovered_at?: string | null;
  admin_recovered_reason?: string | null;
  created_at: string;
}

/** Page info of the ride list; `summary` is only present for one driver's history. */
export interface RidesMeta extends PageMeta {
  /** Covers ALL of that driver's rides, whatever the status / date filter or page. */
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    faresLkr: number;
    distanceKm: number;
    driverName: string | null;
  } | null;
}

export interface RidesPage {
  data: Ride[];
  meta: RidesMeta;
}

export interface RideListParams {
  page: number;
  perPage?: number;
  /** One or more ride statuses, comma separated. */
  status?: string;
  driverId?: number;
  riderUserId?: number;
  /** YYYY-MM-DD, Sri Lanka days. */
  from?: string;
  to?: string;
}

// ── Journey (the recorded GPS path of one ride) ─────────────────────────────

/** lat, lng, epoch seconds */
export type JourneyPoint = [number, number, number];

export type JourneyRole = "driver" | "rider";

/**
 * A stretch where one side sent no location for 20 s or more. `offline`: that side's socket was
 * disconnected; `no_signal`: connected, but no GPS fix arrived (GPS off, app backgrounded).
 */
export interface JourneyOutage {
  role: JourneyRole;
  kind: "offline" | "no_signal";
  /** Epoch seconds: the last location before the gap. */
  from: number;
  /** Epoch seconds: the first location after it (or the ride's end). */
  to: number;
}

interface Place {
  lat: number | null;
  lng: number | null;
  address?: string | null;
}

/** `GET /support-desk/rides/:id/path` */
export interface RidePath {
  rideId: string;
  status: string;
  recorded: boolean;
  live: boolean;
  endReason: string | null;
  pointCount: number;
  rawPointCount: number;
  quoted: {
    pickup: Place;
    dropoff: Place;
    stops: Array<{ lat: number; lng: number; address?: string }>;
    distanceKm: number | null;
  };
  actualDistanceKm: number | null;
  pickupLeg: JourneyPoint[];
  tripLeg: JourneyPoint[];
  /** The rider's own phone GPS — empty for older rides / rider app builds. */
  riderSearchLeg: JourneyPoint[];
  riderPickupLeg: JourneyPoint[];
  riderTripLeg: JourneyPoint[];
  riderPointCount: number;
  riderRawPointCount: number;
  outages: JourneyOutage[];
  /** Fixes each phone flagged as coming from a mock-location (fake GPS) provider. */
  driverMockPoints: number;
  riderMockPoints: number;
  matchedTripLeg: [number, number][] | null;
  matchedDistanceKm: number | null;
  matchedPartial: boolean;
}
