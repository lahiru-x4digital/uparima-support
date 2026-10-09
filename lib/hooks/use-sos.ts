"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { acknowledgeSos, getSos, listActiveSos, listSos, resolveSos } from "@/lib/services/sos.service";
import { SOS_ACTIVE, type SosAlert } from "@/types/sos";
import { sosKeys } from "./query-keys";

// Backstop for a silently dropped socket: the alarm must not depend on it alone.
const ACTIVE_POLL_MS = 20_000;
// An open alert's detail page refreshes itself (vehicle position, other agents' actions).
const DETAIL_POLL_MS = 5_000;

/** Open + acknowledged alerts — what rings, badges the sidebar and fills the Active tab. */
export function useActiveSos(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: sosKeys.active,
    queryFn: listActiveSos,
    enabled: enabled && !!user,
    refetchInterval: ACTIVE_POLL_MS,
  });
}

export function useSosList(status: string, page: number, perPage = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: sosKeys.list(status, page),
    queryFn: () => listSos({ status: status || undefined, page, perPage }),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useSosAlert(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: sosKeys.detail(id),
    queryFn: () => getSos(id),
    enabled: !!user,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || SOS_ACTIVE.includes(status) ? DETAIL_POLL_MS : false;
    },
  });
}

/** Merges a fresh copy of one alert into the active list (or drops it once it is over). */
export function useUpsertActiveSos() {
  const qc = useQueryClient();
  return (alert: SosAlert) => {
    qc.setQueryData<SosAlert[]>(sosKeys.active, (prev = []) => {
      const rest = prev.filter((a) => a.id !== alert.id);
      return SOS_ACTIVE.includes(alert.status)
        ? [...rest, alert].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        : rest;
    });
    void qc.invalidateQueries({ queryKey: ["sos", "list"] });
    void qc.invalidateQueries({ queryKey: sosKeys.detail(alert.id) });
  };
}

export function useAcknowledgeSos() {
  const upsert = useUpsertActiveSos();
  return useMutation({
    mutationFn: (id: string) => acknowledgeSos(id),
    onSuccess: (alert) => upsert(alert),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useResolveSos() {
  const upsert = useUpsertActiveSos();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => resolveSos(id, note),
    onSuccess: (alert) => {
      upsert(alert);
      toast.success("SOS alert resolved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
