"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getRide } from "@/lib/services/lookup.service";
import { getMe, listStaff } from "@/lib/services/support-desk.service";
import { deskKeys, rideKeys } from "./query-keys";

/** The signed-in agent and their permissions. */
export function useMe() {
  const { user } = useAuth();
  return useQuery({ queryKey: deskKeys.me, queryFn: getMe, enabled: !!user, staleTime: 5 * 60_000 });
}

/** Whether the agent holds a permission; admins get them all from the backend. */
export function useCan(permission: string): boolean {
  const { data } = useMe();
  // Until the profile loads, hide write controls rather than flash them.
  return !!data?.permissions.includes(permission);
}

export function useStaff() {
  const { user } = useAuth();
  return useQuery({ queryKey: deskKeys.staff, queryFn: listStaff, enabled: !!user, staleTime: 5 * 60_000 });
}

export function useRide(id: string | null) {
  return useQuery({
    queryKey: rideKeys.detail(id ?? ""),
    queryFn: () => getRide(id as string),
    enabled: !!id,
    staleTime: 60_000,
    retry: false,
  });
}
