"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Car, ExternalLink, MapPin, Phone, Siren, VolumeX } from "lucide-react";
import { elapsedSince, mapsViewUrl, sosCallerName, sosRoleLabel } from "@/lib/sos";
import type { SosAlert } from "@/types/sos";
import { useSos } from "./sos-provider";

/**
 * A full-screen alarm that is deliberately not dismissible (no Escape, no backdrop click, unlike
 * the portal's dialogs): it goes away only once every open SOS has been acknowledged by someone, in
 * this tab or another. Shown to agents who may respond; others get a toast and the sidebar badge.
 */
export function SosAlarmOverlay() {
  const { ringing, acknowledge, acknowledging, soundEnabled, enableSound } = useSos();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ringing.length) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ringing.length]);

  if (!ringing.length) return null;

  const ack = async (id: string, thenOpen = false) => {
    await acknowledge(id);
    if (thenOpen) router.push(`/sos/${id}`);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sos-alarm-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-red-950/85 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex items-center gap-4 text-white">
          <span className="relative flex size-14 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-red-600 shadow-lg">
              <Siren className="size-7" />
            </span>
          </span>
          <div>
            <h2 id="sos-alarm-title" className="text-2xl font-extrabold tracking-tight">
              SOS — Emergency {ringing.length > 1 && `(${ringing.length})`}
            </h2>
            <p className="text-sm text-red-100">
              A {ringing.length > 1 ? "few people" : sosRoleLabel(ringing[0]).toLowerCase()} on an active ride pressed
              SOS. Acknowledge to silence the alarm for everyone.
            </p>
          </div>
        </div>

        {!soundEnabled && (
          <button
            type="button"
            onClick={() => void enableSound()}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300"
          >
            <VolumeX className="size-4" /> Sound is blocked by the browser — click to enable the alarm
          </button>
        )}

        <div className="space-y-3">
          {ringing.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              now={now}
              busy={acknowledging}
              onAck={() => void ack(a.id)}
              onOpen={() => void ack(a.id, true)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  alert: a,
  now,
  busy,
  onAck,
  onOpen,
}: {
  alert: SosAlert;
  now: number;
  busy: boolean;
  onAck: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl ring-4 ring-red-500/60">
      <div className="flex items-center justify-between gap-3 bg-red-600 px-5 py-3 text-white">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wider text-red-100 uppercase">{sosRoleLabel(a)} raised SOS</div>
          <div className="truncate text-lg font-bold">{sosCallerName(a)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-red-100">Raised</div>
          <div className="font-mono text-sm font-semibold">{elapsedSince(a.created_at, now)}</div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Party label="Rider" name={a.rider_name} phone={a.rider_phone} highlight={a.triggered_by_role === "rider"} />
        <Party label="Driver" name={a.driver_name} phone={a.driver_phone} highlight={a.triggered_by_role === "driver"}>
          {a.vehicle_number && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
              <Car className="size-3.5" />
              <span className="font-mono font-semibold">{a.vehicle_number}</span>
              {a.vehicle_type_name && <span>· {a.vehicle_type_name}</span>}
            </div>
          )}
        </Party>

        <div className="space-y-1.5 rounded-lg bg-neutral-50 p-3 text-sm sm:col-span-2">
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-neutral-500 uppercase">From</span>
            <span>{a.pickup_address ?? "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-neutral-500 uppercase">To</span>
            <span>{a.dropoff_address ?? "—"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-neutral-600">
            <span>
              Ride status: <b>{(a.ride_status ?? a.ride_status_at_trigger).replace(/_/g, " ")}</b>
            </span>
            {a.lat != null && a.lng != null ? (
              <a
                href={mapsViewUrl(a.lat, a.lng)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"
              >
                <MapPin className="size-3.5" /> Location when SOS was pressed
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-neutral-400">No GPS fix with alert</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onOpen}
          disabled={busy}
          className="h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
        >
          Acknowledge &amp; open details
        </button>
        <button
          type="button"
          onClick={onAck}
          disabled={busy}
          autoFocus
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-bold text-white shadow hover:bg-red-500 focus:ring-4 focus:ring-red-300 focus:outline-none disabled:opacity-50"
        >
          <BellRing className="size-4" />
          {busy ? "Acknowledging…" : "Acknowledge & silence"}
        </button>
      </div>
    </div>
  );
}

function Party({
  label,
  name,
  phone,
  highlight,
  children,
}: {
  label: string;
  name: string | null;
  phone: string | null;
  highlight: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-red-300 bg-red-50" : "border-neutral-200"}`}>
      <div className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
        {label} {highlight && <span className="text-red-600">· raised SOS</span>}
      </div>
      <div className="mt-0.5 font-semibold">{name || "—"}</div>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-500"
        >
          <Phone className="size-3.5" /> {phone}
        </a>
      ) : (
        <div className="mt-1 text-xs text-neutral-400">No phone on record</div>
      )}
      {children}
    </div>
  );
}
