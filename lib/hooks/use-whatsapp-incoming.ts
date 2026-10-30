"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createIncomingTickets,
  getCreateAllStatus,
  listIncomingChats,
  startCreateAllTickets,
} from "@/lib/services/whatsapp-incoming.service";
import { summaryText } from "@/lib/whatsapp-incoming/filters";
import type { IncomingChatRef, IncomingFilter } from "@/types/whatsapp-incoming";
import { ticketKeys, whatsappIncomingKeys } from "./query-keys";

const refresh = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: whatsappIncomingKeys.all });
  void qc.invalidateQueries({ queryKey: ticketKeys.lists() });
  void qc.invalidateQueries({ queryKey: ["tickets", "count"] });
};

/** One page of incoming conversations. `enabled` keeps non-admins from asking at all. */
export function useIncomingChats(filter: IncomingFilter, page: number, perPage: number, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: whatsappIncomingKeys.list(filter, page),
    queryFn: () => listIncomingChats(filter, page, perPage),
    enabled: !!user && enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

/** Opens and routes a ticket for the ticked conversations. */
export function useCreateIncomingTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: IncomingChatRef[]) => createIncomingTickets(items),
    onSuccess: (summary) => {
      refresh(qc);
      (summary.failed > 0 ? toast.warning : toast.success)(summaryText(summary));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/** Starts the "every no-ticket chat" run; the page polls it with `getCreateAllStatus`. */
export function useStartCreateAll() {
  return useMutation({
    mutationFn: (filter: IncomingFilter) => startCreateAllTickets(filter),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export { getCreateAllStatus, refresh as refreshIncoming };
