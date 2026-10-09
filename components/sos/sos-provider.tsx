"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";
import { env } from "@/lib/env";
import { useCan } from "@/lib/hooks/use-desk";
import { useAcknowledgeSos, useActiveSos, useUpsertActiveSos } from "@/lib/hooks/use-sos";
import { sosKeys } from "@/lib/hooks/query-keys";
import { sosCallerName } from "@/lib/sos";
import { startAlarm, stopAlarm, unlockAlarm } from "@/lib/sos-alarm-sound";
import type { SosAlert } from "@/types/sos";
import { SosAlarmOverlay } from "./sos-alarm-overlay";

// The rides gateway is the `/rides` Socket.IO namespace on the same server as the REST API. The
// backend puts a support account in the SOS room when it connects, if it holds sos.view.
const SOCKET_ORIGIN = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1\/?$/, "");
const BASE_TITLE = "Uparima Support";

interface SosContextValue {
  /** Open + acknowledged, newest first. Empty for an agent who may not read SOS. */
  activeAlerts: SosAlert[];
  /** Open only — these keep the alarm ringing. */
  ringing: SosAlert[];
  /** May this agent acknowledge / resolve? Only responders get the siren and the blocking overlay. */
  canRespond: boolean;
  soundEnabled: boolean;
  enableSound: () => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  acknowledging: boolean;
}

const SosContext = createContext<SosContextValue | null>(null);

export function useSos() {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error("useSos must be used inside <SosProvider>");
  return ctx;
}

/**
 * Live SOS for the signed-in agent. With sos.view: the active alerts stay current over the socket
 * (and a slow poll as a backstop), a new alert raises a toast, and the tab title flashes while one
 * is unanswered. With sos.respond as well: a siren plays and a full-screen alarm covers the portal
 * until every open alert has been acknowledged by someone. Open it once, high in the tree.
 */
export function SosProvider({ children }: { children: React.ReactNode }) {
  const canView = useCan("sos.view");
  const canRespond = useCan("sos.respond");
  const qc = useQueryClient();
  const upsert = useUpsertActiveSos();
  const acknowledgeMutation = useAcknowledgeSos();
  const { data } = useActiveSos(canView);
  const [soundEnabled, setSoundEnabled] = useState(false);
  // Read inside the socket handler without reconnecting the socket when it changes.
  const canRespondRef = useRef(canRespond);
  useEffect(() => {
    canRespondRef.current = canRespond;
  });

  const activeAlerts = useMemo(() => (canView ? (data ?? []) : []), [canView, data]);
  const ringing = useMemo(() => activeAlerts.filter((a) => a.status === "open"), [activeAlerts]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canView || !getToken()) return;
    // A function, so a reconnect after the access token was refreshed sends the new one.
    const socket = io(`${SOCKET_ORIGIN}/rides`, { transports: ["websocket"], auth: (send) => send({ token: getToken() }) });
    socket.on("connect", () => void qc.invalidateQueries({ queryKey: sosKeys.active }));
    socket.on("sos:triggered", (alert: SosAlert) => {
      upsert(alert);
      // An agent who can respond already gets the full-screen alarm; a toast on top would only sit
      // over the page's action buttons. Everyone else has no alarm, so the toast is how they find out.
      if (!canRespondRef.current) {
        toast.error(`SOS from ${alert.triggered_by_role}: ${sosCallerName(alert)}`, { duration: 15_000, closeButton: true });
      }
    });
    socket.on("sos:updated", (alert: SosAlert) => upsert(alert));
    // The server drops a socket whose token has expired and socket.io never reconnects after that,
    // so retry with a fresh token.
    let retry: ReturnType<typeof setTimeout> | null = null;
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") retry = setTimeout(() => socket.connect(), 5000);
    });
    return () => {
      if (retry) clearTimeout(retry);
      socket.removeAllListeners();
      socket.disconnect();
    };
    // `upsert` is a new function each render; the socket must not reconnect for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, qc]);

  // ── Sound unlock: a browser keeps audio suspended until the page has been interacted with ──────
  useEffect(() => {
    if (!canRespond) return;
    const arm = () => {
      void unlockAlarm().then((ok) => {
        setSoundEnabled(ok);
        if (ok) {
          window.removeEventListener("pointerdown", arm);
          window.removeEventListener("keydown", arm);
        }
      });
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [canRespond]);

  // ── Siren + flashing tab title while anything is unanswered ────────────────
  useEffect(() => {
    if (!ringing.length) {
      stopAlarm();
      return;
    }
    if (canRespond && soundEnabled) startAlarm();
    let on = false;
    const timer = setInterval(() => {
      on = !on;
      document.title = on ? `🚨 SOS (${ringing.length}) — ${BASE_TITLE}` : BASE_TITLE;
    }, 800);
    return () => {
      clearInterval(timer);
      document.title = BASE_TITLE;
    };
  }, [ringing.length, canRespond, soundEnabled]);

  useEffect(() => () => stopAlarm(), []);

  const value = useMemo<SosContextValue>(
    () => ({
      activeAlerts,
      ringing,
      canRespond,
      soundEnabled,
      enableSound: async () => setSoundEnabled(await unlockAlarm()),
      acknowledge: async (id) => {
        await acknowledgeMutation.mutateAsync(id).catch(() => undefined);
      },
      acknowledging: acknowledgeMutation.isPending,
    }),
    [activeAlerts, ringing, canRespond, soundEnabled, acknowledgeMutation],
  );

  return (
    <SosContext.Provider value={value}>
      {children}
      {canRespond && <SosAlarmOverlay />}
    </SosContext.Provider>
  );
}
