"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getRidePath, getStadiaKey, listRides } from "@/lib/services/rides.service";
import type { RideListParams } from "@/types/ride";
import { rideHistoryKeys } from "./query-keys";

/** One page of rides; the previous page stays on screen while the next loads. */
export function useRides(params: RideListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: rideHistoryKeys.list(params),
    queryFn: () => listRides(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

/**
 * The recorded journey of a ride; `rideId` null keeps it idle. A ride still in progress is read live,
 * so it is never treated as fresh.
 */
export function useRidePath(rideId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: rideHistoryKeys.path(rideId ?? ""),
    queryFn: () => getRidePath(rideId as string),
    enabled: !!user && !!rideId,
    staleTime: 0,
    retry: false,
  });
}

/** The map-tile key, fetched once per page load (the backend throttles it). Null → OpenStreetMap. */
export function useStadiaKey() {
  const { user } = useAuth();
  return useQuery({
    queryKey: rideHistoryKeys.stadiaKey,
    queryFn: () => getStadiaKey().catch(() => null),
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });
}
