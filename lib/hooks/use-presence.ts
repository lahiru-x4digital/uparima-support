"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getMyRouting, setMyPresence } from "@/lib/services/routing.service";
import type { MyRouting, Presence } from "@/types/routing";
import { deskKeys, ticketKeys } from "./query-keys";

/** My routing state; refreshed every minute so "in shift" follows the clock. */
export function useMyRouting() {
  const { user } = useAuth();
  return useQuery({
    queryKey: deskKeys.routing,
    queryFn: getMyRouting,
    enabled: !!user,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

/** Switches my presence, showing the new state straight away. */
export function useSetPresence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (presence: Presence) => setMyPresence(presence),
    onMutate: async (presence) => {
      await qc.cancelQueries({ queryKey: deskKeys.routing });
      const previous = qc.getQueryData<MyRouting>(deskKeys.routing);
      if (previous) qc.setQueryData<MyRouting>(deskKeys.routing, { ...previous, presence });
      return { previous };
    },
    onError: (error, _presence, context) => {
      if (context?.previous) qc.setQueryData(deskKeys.routing, context.previous);
      toast.error("Couldn't change your status", { description: getErrorMessage(error) });
    },
    onSuccess: (routing) => {
      qc.setQueryData(deskKeys.routing, routing);
      // Going online can pull queued tickets straight to me.
      if (routing.presence === "online") void qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}
