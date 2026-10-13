"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  addDriverFollowup,
  completeDriverFollowup,
  deleteDriverFollowup,
  listDriverFollowups,
  listMyFollowups,
  markFollowupSeen,
  takeDriverFollowup,
  updateDriverFollowup,
} from "@/lib/services/driver-followups.service";
import type { DriverFollowupInput } from "@/types/driver-followup";
import { driverFollowupKeys } from "./query-keys";

// A colleague's change arrives over the socket (support:driver_followup). New files from the
// driver don't emit anything, so this poll is also how the owner notices them.
const POLL_MS = 30_000;

export function useDriverFollowups(driverId: number | string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverFollowupKeys.list(driverId),
    queryFn: () => listDriverFollowups(driverId),
    enabled: !!user,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** The signed-in agent's open follow-ups across all drivers. */
export function useMyFollowups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverFollowupKeys.mine,
    queryFn: listMyFollowups,
    enabled: !!user,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** Set / edit / finish / hand over follow-ups. Errors toast; every change refreshes all follow-up lists. */
export function useDriverFollowupActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: driverFollowupKeys.all });
  const onError = (failure: string) => (error: unknown) => toast.error(failure, { description: getErrorMessage(error) });

  const add = useMutation({
    mutationFn: ({ driverId, input }: { driverId: number | string; input: DriverFollowupInput }) =>
      addDriverFollowup(driverId, input),
    onSuccess: () => toast.success("Follow-up set"),
    onError: onError("Couldn't set the follow-up"),
    onSettled: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DriverFollowupInput }) => updateDriverFollowup(id, input),
    onError: onError("Couldn't save the follow-up"),
    onSettled: refresh,
  });
  const seen = useMutation({
    mutationFn: (id: string) => markFollowupSeen(id),
    onError: onError("Couldn't update the follow-up"),
    onSettled: refresh,
  });
  const complete = useMutation({
    mutationFn: (id: string) => completeDriverFollowup(id),
    onSuccess: () => toast.success("Follow-up done"),
    onError: onError("Couldn't finish the follow-up"),
    onSettled: refresh,
  });
  const take = useMutation({
    mutationFn: (id: string) => takeDriverFollowup(id),
    onSuccess: () => toast.success("Follow-up is yours now"),
    onError: onError("Couldn't take over the follow-up"),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteDriverFollowup(id),
    onError: onError("Couldn't remove the follow-up"),
    onSettled: refresh,
  });
  return { add, update, seen, complete, take, remove };
}
