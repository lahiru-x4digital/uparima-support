"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { driverFollowupKeys, driverNoteKeys, ticketKeys } from "@/lib/hooks/query-keys";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { acquireDeskSocket, releaseDeskSocket } from "@/lib/realtime/desk-socket";
import { topicLabel } from "@/components/inbox/meta";
import type { HandoffEvent } from "@/types/ticket";

const BASE_TITLE = "Uparima Support";

interface CriticalIncident {
  id?: string;
  description?: string;
}

/**
 * Live alerts for the signed-in agent: a driver asking the WhatsApp bot for a person
 * (`support:handoff`) refreshes the inbox and raises a toast and a tab-title badge; a
 * critical incident raises an urgent toast. Open it once, high in the tree. Shares the one desk
 * socket with the routing alerts (see desk-socket.ts).
 */
export function useSupportAlerts(enabled: boolean, onOpenTicket?: (ticketId: string) => void) {
  const qc = useQueryClient();
  const openRef = useRef(onOpenTicket);
  const { user } = useAuth();
  const meIdRef = useRef<number | null>(user?.id ?? null);
  useEffect(() => {
    openRef.current = onOpenTicket;
    meIdRef.current = user?.id ?? null;
  });

  useEffect(() => {
    if (!enabled || !getToken()) return;

    let unseen = 0;
    const clearBadge = () => {
      unseen = 0;
      document.title = BASE_TITLE;
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") clearBadge();
    };
    document.addEventListener("visibilitychange", onVisible);

    const socket = acquireDeskSocket();

    const onHandoff = (event: HandoffEvent) => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
      // Already routed to a colleague: theirs to handle, so no toast here.
      if (event.assignedToUserId != null && event.assignedToUserId !== meIdRef.current) return;
      const who = event.driverName ?? event.phone;
      const topic = topicLabel(event.topic);
      toast.info(`New request from ${who}${topic ? `: ${topic}` : ""}`, {
        description: `${event.ticketNumber} · ${event.contactPreference === "message" ? "wants a message" : "wants a call"}`,
        duration: 15_000,
        action: { label: "Open", onClick: () => openRef.current?.(event.ticketId) },
      });
      if (document.visibilityState !== "visible") {
        unseen += 1;
        document.title = `(${unseen}) ${BASE_TITLE}`;
      }
    };

    // A customer wrote, a ticket was opened, or another agent changed it: refresh like a chat would.
    const onTicketUpdated = () => void qc.invalidateQueries({ queryKey: ticketKeys.all });

    // A colleague added, edited or deleted a note on a driver: refresh that driver's notes.
    const onDriverNote = (event: { driverId: number }) =>
      void qc.invalidateQueries({ queryKey: driverNoteKeys.list(event.driverId) });

    // A follow-up was set, handed over or finished: refresh every follow-up list.
    const onDriverFollowup = () => void qc.invalidateQueries({ queryKey: driverFollowupKeys.all });

    const onCritical = (incident: CriticalIncident) => {
      toast.error("Critical safety incident reported", {
        description: incident.description?.slice(0, 140),
        duration: Infinity,
        closeButton: true,
      });
    };

    socket.on("support:handoff", onHandoff);
    socket.on("support:ticket_updated", onTicketUpdated);
    socket.on("support:driver_note", onDriverNote);
    socket.on("support:driver_followup", onDriverFollowup);
    socket.on("incident:critical", onCritical);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      socket.off("support:handoff", onHandoff);
      socket.off("support:ticket_updated", onTicketUpdated);
      socket.off("support:driver_note", onDriverNote);
      socket.off("support:driver_followup", onDriverFollowup);
      socket.off("incident:critical", onCritical);
      releaseDeskSocket();
      clearBadge();
    };
  }, [enabled, qc]);
}
