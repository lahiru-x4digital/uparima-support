"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { listTicketCalls, logTicketCall } from "@/lib/services/ticket-calls.service";
import type { TicketCallInput } from "@/types/ticket-call";
import { ticketCallKeys } from "./query-keys";

// A colleague's call is picked up on the next refetch (focus or this poll).
const POLL_MS = 60_000;

export function useTicketCalls(ticketId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ticketCallKeys.list(ticketId),
    queryFn: () => listTicketCalls(ticketId),
    enabled: !!user,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** Log a call on one ticket. Errors toast; the form keeps what was typed on failure. */
export function useLogTicketCall(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketCallInput) => logTicketCall(ticketId, input),
    onSuccess: () => toast.success("Call logged"),
    onError: (error) => toast.error("Couldn't log the call", { description: getErrorMessage(error) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ticketCallKeys.list(ticketId) }),
  });
}
