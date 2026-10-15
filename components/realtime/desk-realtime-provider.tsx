"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { deskKeys, ticketKeys } from "@/lib/hooks/query-keys";
import { acquireDeskSocket, releaseDeskSocket } from "@/lib/realtime/desk-socket";
import type { AssignedEvent } from "@/types/ticket";

/** Window event the inbox listens for to open a ticket without a page change. */
export const OPEN_TICKET_EVENT = "desk:open-ticket";
/** Window event that switches the inbox to "Assigned to me" (every status, newest assignment first). */
export const SHOW_MINE_EVENT = "desk:show-mine";
/** Window event: a ticket was taken off me (`detail` = { ticketId, ticketNumber }). */
export const TICKET_TAKEN_EVENT = "desk:ticket-taken";

export function openTicketInInbox(ticketId: string) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_TICKET_EVENT, { detail: ticketId }));
}

/** Query string the inbox reads once on load to start on "Assigned to me". */
export const SHOW_MINE_PARAM = "mine";

/** Several routing events in one burst (a rebalance, an agent going offline) become one toast. */
const BATCH_MS = 1500;
const LISTED = 3;

type TakenEvent = { ticketId: string; ticketNumber: string };

/**
 * Routing events for the signed-in agent on every page: tickets routed to me (`support:assigned`,
 * sent only to my own socket room), ones taken back (`support:unassigned`), and queue changes.
 * Mounted once in the support layout. Bursts are batched into one toast each; after a dropped
 * connection the lists are refreshed, since events sent meanwhile are not replayed.
 */
export function DeskRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  // Read inside handlers, so changing page does not tear the socket down.
  const onInboxRef = useRef(pathname === "/inbox");
  const routerRef = useRef(router);
  useEffect(() => {
    onInboxRef.current = pathname === "/inbox";
    routerRef.current = router;
  });

  useEffect(() => {
    if (!user || !getToken()) return;
    const socket = acquireDeskSocket();

    const openTicket = (ticketId: string) => {
      if (onInboxRef.current) openTicketInInbox(ticketId);
      else routerRef.current.push(`/inbox?ticket=${encodeURIComponent(ticketId)}`);
    };
    const openMine = () => {
      if (onInboxRef.current) window.dispatchEvent(new Event(SHOW_MINE_EVENT));
      else routerRef.current.push(`/inbox?${SHOW_MINE_PARAM}=1`);
    };
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
      void qc.invalidateQueries({ queryKey: deskKeys.routing });
    };

    let assigned: AssignedEvent[] = [];
    let assignedTimer: ReturnType<typeof setTimeout> | null = null;
    const flushAssigned = () => {
      const batch = assigned;
      assigned = [];
      assignedTimer = null;
      if (batch.length === 1) {
        const e = batch[0];
        toast.info(`${e.ticketNumber} ${e.method === "manual" ? "assigned to you" : "routed to you"}`, {
          description: e.outOfShift ? `${e.subject} · outside your shift` : e.subject,
          duration: 12_000,
          action: { label: "Open", onClick: () => openTicket(e.ticketId) },
        });
      } else if (batch.length > 1) {
        const numbers = batch.slice(0, LISTED).map((e) => e.ticketNumber).join(", ");
        toast.info(`${batch.length} tickets assigned to you`, {
          description: batch.length > LISTED ? `${numbers} and ${batch.length - LISTED} more` : numbers,
          duration: 15_000,
          action: { label: "View", onClick: openMine },
        });
      }
    };
    const onAssigned = (e: AssignedEvent) => {
      refresh();
      assigned.push(e);
      assignedTimer ??= setTimeout(flushAssigned, BATCH_MS);
    };

    let taken: TakenEvent[] = [];
    let takenTimer: ReturnType<typeof setTimeout> | null = null;
    const flushTaken = () => {
      const batch = taken;
      taken = [];
      takenTimer = null;
      if (batch.length === 1) toast.message(`${batch[0].ticketNumber} moved to another agent`);
      else if (batch.length > 1) toast.message(`${batch.length} tickets moved to other agents`);
    };
    const onUnassigned = (e: TakenEvent) => {
      refresh();
      // Straight away, so an open conversation can warn before the agent types another reply.
      window.dispatchEvent(new CustomEvent<TakenEvent>(TICKET_TAKEN_EVENT, { detail: e }));
      taken.push(e);
      takenTimer ??= setTimeout(flushTaken, BATCH_MS);
    };

    const onQueueChanged = () => void qc.invalidateQueries({ queryKey: ticketKeys.all });

    socket.on("support:assigned", onAssigned);
    socket.on("support:unassigned", onUnassigned);
    socket.on("support:queue_changed", onQueueChanged);
    // Events sent while the connection was down are gone; catch up as soon as it is back.
    socket.io.on("reconnect", refresh);

    return () => {
      socket.off("support:assigned", onAssigned);
      socket.off("support:unassigned", onUnassigned);
      socket.off("support:queue_changed", onQueueChanged);
      socket.io.off("reconnect", refresh);
      if (assignedTimer) clearTimeout(assignedTimer);
      if (takenTimer) clearTimeout(takenTimer);
      releaseDeskSocket();
    };
  }, [user, qc]);

  return children;
}
