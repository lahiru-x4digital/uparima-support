"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getTwoFactorStatus } from "@/lib/services/auth.service";
import { accountKeys } from "./query-keys";

/** Whether the signed-in account has two-factor sign-in on, and where its codes go. */
export function useTwoFactorStatus() {
  const { user } = useAuth();
  return useQuery({ queryKey: accountKeys.twoFactor, queryFn: getTwoFactorStatus, enabled: !!user });
}
