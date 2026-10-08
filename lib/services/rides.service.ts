import { apiGet, apiGetPage } from "@/lib/api";
import type { RideListParams, RidePath, RidesPage } from "@/types/ride";

// Ride history and ride paths — the backend's `/support-desk/rides/*` (needs ride.view).

/**
 * One page of rides, newest first. With `driverId` it is that driver's history, and `meta.summary`
 * carries their totals. Status, dates and paging are all applied by the server.
 */
export async function listRides(params: RideListParams): Promise<RidesPage> {
  // The meta of a driver's history carries the extra `summary`; apiGetPage types it as plain page info.
  return (await apiGetPage<RidesPage["data"][number]>("/support-desk/rides", { params })) as RidesPage;
}

/** The recorded journey of one ride (read live while the ride is in progress). */
export const getRidePath = (rideId: string) => apiGet<RidePath>(`/support-desk/rides/${rideId}/path`);

/**
 * The map-tile key. It lives on the backend, behind the rides map-config route (any signed-in
 * account, throttled to a few calls a minute — so fetch it once). Null → the map uses plain
 * OpenStreetMap tiles.
 */
export const getStadiaKey = () =>
  apiGet<{ stadiaApiKey: string }>("/rides/riders/map-config").then((r) => r.stadiaApiKey || null);
