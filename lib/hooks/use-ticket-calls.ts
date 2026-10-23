"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { listTicketCalls, logTicketCall, updateTicketCall } from "@/lib/services/ticket-calls.service";
import type { Driver } from "@/types/driver";
import type { TicketCall, TicketCallInput, TicketCallUpdate } from "@/types/ticket-call";
import { driverKeys, ticketCallKeys } from "./query-keys";

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

/**
 * A logged call counts as contact: mark the driver whose open ticket this is as contacted by
 * phone, by this caller, in every driver list already loaded (the Drivers list's statuses and
 * Pending Drivers), so the "Contacted" filter and "Contacted via …" line change at once. The
 * refetch that follows replaces it with what the backend computed.
 */
function markDriverContacted(drivers: Driver[], ticketId: string, call: TicketCall): Driver[] {
  return drivers.map((d) => {
    if (d.supportTicket?.id !== ticketId) return d;
    const contact = d.contact ?? { methods: [], agents: [], lastContactedAt: null };
    return {
      ...d,
      contact: {
        methods: contact.methods.includes("call") ? contact.methods : ["call", ...contact.methods],
        agents: contact.agents.some((a) => a.id === call.caller.id) ? contact.agents : [...contact.agents, call.caller],
        lastContactedAt:
          !contact.lastContactedAt || call.calledAt > contact.lastContactedAt ? call.calledAt : contact.lastContactedAt,
      },
      supportTicket: { ...d.supportTicket, calls: [...d.supportTicket.calls, call] },
    };
  });
}

/** Log a call on one ticket. Errors toast; the form keeps what was typed on failure. */
export function useLogTicketCall(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketCallInput) => logTicketCall(ticketId, input),
    onSuccess: (call) => {
      toast.success("Call logged");
      for (const key of [driverKeys.lists, driverKeys.pending]) {
        qc.setQueriesData<Driver[]>({ queryKey: key }, (old) =>
          Array.isArray(old) ? markDriverContacted(old, ticketId, call) : old,
        );
      }
    },
    onError: (error) => toast.error("Couldn't log the call", { description: getErrorMessage(error) }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ticketCallKeys.list(ticketId) });
      // Every driver query — the Drivers lists, Pending Drivers and the driver's own page — so
      // contact status is re-read from the backend wherever the driver shows.
      void qc.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}

/** Edit the outcome and/or note of a call the signed-in agent logged themselves. */
export function useUpdateTicketCall(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, ...input }: TicketCallUpdate & { callId: string }) => updateTicketCall(ticketId, callId, input),
    onSuccess: () => toast.success("Call updated"),
    onError: (error) => toast.error("Couldn't update the call", { description: getErrorMessage(error) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ticketCallKeys.list(ticketId) }),
  });
}
