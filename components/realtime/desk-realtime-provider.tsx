"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/lib/env";
import { deskKeys, ticketKeys } from "@/lib/hooks/query-keys";
import type { AssignedEvent } from "@/types/ticket";

const SOCKET_ORIGIN = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Window event the inbox listens for to open a ticket without a page change. */
export const OPEN_TICKET_EVENT = "desk:open-ticket";

export function openTicketInInbox(ticketId: string) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_TICKET_EVENT, { detail: ticketId }));
}

/**
 * Routing events for the signed-in agent on every page: a ticket routed to me
 * (`support:assigned`, sent only to my own socket room), one taken back
 * (`support:unassigned`), and queue changes. Mounted once in the support layout.
 */
export function DeskRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const onInbox = pathname === "/inbox";

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;
    const socket = io(`${SOCKET_ORIGIN}/rides`, {
      transports: ["websocket"],
      auth: (send) => send({ token: getToken() }),
    });

    const open = (ticketId: string) => {
      if (onInbox) openTicketInInbox(ticketId);
      else router.push(`/inbox?ticket=${encodeURIComponent(ticketId)}`);
    };

    socket.on("support:assigned", (e: AssignedEvent) => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
      void qc.invalidateQueries({ queryKey: deskKeys.routing });
      const how = e.method === "manual" ? "assigned to you" : "routed to you";
      toast.info(`${e.ticketNumber} ${how}`, {
        description: e.outOfShift ? `${e.subject} · outside your shift` : e.subject,
        duration: 12_000,
        action: { label: "Open", onClick: () => open(e.ticketId) },
      });
    });
    socket.on("support:unassigned", (e: { ticketNumber: string }) => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
      void qc.invalidateQueries({ queryKey: deskKeys.routing });
      toast.message(`${e.ticketNumber} moved to another agent`);
    });
    socket.on("support:queue_changed", () => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
    });

    return () => {
      socket.off("support:assigned");
      socket.off("support:unassigned");
      socket.off("support:queue_changed");
      socket.disconnect();
    };
  }, [user, qc, router, onInbox]);

  return children;
}
