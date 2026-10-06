"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { ticketKeys } from "@/lib/hooks/query-keys";
import { getToken } from "@/lib/auth";
import { env } from "@/lib/env";
import { topicLabel } from "@/components/inbox/meta";
import type { HandoffEvent } from "@/types/ticket";

// The rides gateway is the `/rides` Socket.IO namespace on the same server as the REST
// API, one level up from the `/api/v1` prefix. Staff accounts join `support-desk:alerts`
// on connect, so there is nothing to subscribe to.
const SOCKET_ORIGIN = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1\/?$/, "");
const BASE_TITLE = "Uparima Support";

interface CriticalIncident {
  id?: string;
  description?: string;
}

/**
 * Live alerts for the signed-in agent: a driver asking the WhatsApp bot for a person
 * (`support:handoff`) refreshes the inbox and raises a toast and a tab-title badge; a
 * critical incident raises an urgent toast. Open it once, high in the tree.
 */
export function useSupportAlerts(enabled: boolean, onOpenTicket?: (ticketId: string) => void) {
  const qc = useQueryClient();
  const openRef = useRef(onOpenTicket);
  useEffect(() => {
    openRef.current = onOpenTicket;
  });

  useEffect(() => {
    const token = getToken();
    if (!enabled || !token) return;

    let unseen = 0;
    const clearBadge = () => {
      unseen = 0;
      document.title = BASE_TITLE;
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") clearBadge();
    };
    document.addEventListener("visibilitychange", onVisible);

    // A function, so a reconnect after the access token was refreshed sends the new one.
    const socket = io(`${SOCKET_ORIGIN}/rides`, {
      transports: ["websocket"],
      auth: (send) => send({ token: getToken() }),
    });

    socket.on("support:handoff", (event: HandoffEvent) => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
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
    });

    socket.on("incident:critical", (incident: CriticalIncident) => {
      toast.error("Critical safety incident reported", {
        description: incident.description?.slice(0, 140),
        duration: Infinity,
        closeButton: true,
      });
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      socket.off("support:handoff");
      socket.off("incident:critical");
      socket.disconnect();
      clearBadge();
    };
  }, [enabled, qc]);
}
