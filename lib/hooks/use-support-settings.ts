"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRoutingSettings, updateRoutingSettings } from "@/lib/services/support-settings.service";
import type { RoutingSettings } from "@/types/support-settings";
import { settingsKeys } from "./query-keys";

export function useRoutingSettings() {
  return useQuery({ queryKey: settingsKeys.routing, queryFn: getRoutingSettings });
}

export function useSaveRoutingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: RoutingSettings) => updateRoutingSettings(settings),
    onSuccess: (view) => {
      qc.setQueryData(settingsKeys.routing, view);
      // Assignment rules change what the queue and the board show.
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
