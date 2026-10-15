"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getMyApprovals, getMyCompletedTickets, getMyPerformance } from "@/lib/services/performance.service";
import { performanceKeys } from "./query-keys";

const REFRESH_MS = 60_000;

/** My own numbers for a period; refreshes each minute so "open" and "overdue" stay current. */
export function useMyPerformance(from: string, to: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: performanceKeys.mine(from, to),
    queryFn: () => getMyPerformance(from, to),
    enabled: !!user,
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });
}

/** The drivers I'm credited with approving, with how I took part. */
export function useMyApprovals(from: string, to: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: performanceKeys.approvals(from, to),
    queryFn: () => getMyApprovals(from, to),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

/** The tickets I completed, a page at a time. */
export function useMyCompletedTickets(from: string, to: string, page: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: performanceKeys.completed(from, to, page),
    queryFn: () => getMyCompletedTickets(from, to, page),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}
