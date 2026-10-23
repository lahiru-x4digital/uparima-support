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

/**
 * Whether the signed-in account is a super admin. For the few things no permission grants and
 * even an admin isn't given (bulk SMS); the backend enforces the same rule.
 */
export function useIsSuperAdmin(): boolean {
  return useAuth().user?.type === "super_admin";
}

/** An admin or super admin — not bound by the support-staff rules (e.g. deskApprovalBlocker). */
export function useIsAdmin(): boolean {
  const type = useAuth().user?.type;
  return type === "admin" || type === "super_admin";
}

/**
 * Can open drivers at all: any driver (`driver.view`), or only pending / incomplete ones
 * (`driver.view-pending`, enforced by the backend's SupportDeskDriverScopeGuard).
 */
export function useCanViewDrivers(): { any: boolean; pendingOnly: boolean } {
  const any = useCan("driver.view");
  const pending = useCan("driver.view-pending");
  return { any, pendingOnly: !any && pending };
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
