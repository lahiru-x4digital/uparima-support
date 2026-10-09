"use client";

import { useState } from "react";
import { BellRing, Car, CheckCircle2, ExternalLink, Loader2, MapPin, Phone, Route, Siren, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { RideJourneyModal } from "@/components/rides/ride-journey-modal";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useAcknowledgeSos, useResolveSos, useSosAlert } from "@/lib/hooks/use-sos";
import { durationBetween, elapsedSince, mapsViewUrl, sosCallerName, sosRoleLabel } from "@/lib/sos";
import { cn } from "@/lib/utils";
import { SOS_ACTIVE } from "@/types/sos";
import { SosStatusBadge } from "./sos-status-badge";

// Same freshness thresholds as the dashboard's Ongoing Rides page.
function locationFreshness(updatedAt?: number | null) {
  if (!updatedAt) return { label: "No location yet", dot: "bg-muted-foreground/40" };
  const age = (Date.now() - updatedAt) / 1000;
  if (age < 30) return { label: "Live", dot: "bg-emerald-500" };
  if (age < 90) return { label: `${Math.round(age)}s ago`, dot: "bg-amber-500" };
  return { label: "Stale", dot: "bg-red-500" };
}

/** One SOS alert: who, where, the ride, the timeline — and, with sos.respond, acknowledge and resolve. */
export function SosAlertDetail({ id }: { id: string }) {
  const canView = useCan("sos.view");
  const canRespond = useCan("sos.respond");
  const canSeeRide = useCan("ride.view");

  const { data: alert, error, isLoading } = useSosAlert(id);
  const acknowledge = useAcknowledgeSos();
  const resolve = useResolveSos();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [note, setNote] = useState("");
  const [journey, setJourney] = useState(false);

  if (!canView) return <NoAccess what="SOS alerts" />;

  if (isLoading) {
    return (
      <PageShell title="SOS alert" backHref="/sos">
        <div className="flex justify-center p-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </PageShell>
    );
  }
  if (error || !alert) {
    return (
      <PageShell title="SOS alert" backHref="/sos">
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
          {error ? getErrorMessage(error) : "Alert not found."}
        </p>
      </PageShell>
    );
  }

  const isActive = SOS_ACTIVE.includes(alert.status);
  const fresh = locationFreshness(alert.driver_location_updated_at);
  const busy = acknowledge.isPending || resolve.isPending;

  return (
    <PageShell
      title={`SOS from ${sosRoleLabel(alert).toLowerCase()} · ${sosCallerName(alert)}`}
      backHref="/sos"
      description={`Raised ${new Date(alert.created_at).toLocaleString()} (${elapsedSince(alert.created_at)})`}
      actions={
        <>
          <SosStatusBadge status={alert.status} />
          {isActive && canRespond && alert.status === "open" && (
            <Button variant="destructive" disabled={busy} onClick={() => acknowledge.mutate(id)}>
              <BellRing /> Acknowledge
            </Button>
          )}
          {isActive && canRespond && (
            <Button disabled={busy} onClick={() => setResolveOpen(true)}>
              <CheckCircle2 /> Resolve
            </Button>
          )}
        </>
      }
    >
      {isActive && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 text-sm",
            alert.status === "open"
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
          )}
        >
          <Siren className="size-5 shrink-0" />
          {alert.status === "open"
            ? "Nobody has responded yet. Call the person who raised it first."
            : `${alert.acknowledged_by_name ?? "Someone"} is responding.`}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Rider</CardTitle>
          </CardHeader>
          <CardContent>
            <PartyBody name={alert.rider_name} phone={alert.rider_phone} raisedSos={alert.triggered_by_role === "rider"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <PartyBody name={alert.driver_name} phone={alert.driver_phone} raisedSos={alert.triggered_by_role === "driver"} />
            {alert.vehicle_number && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Car className="size-4" />
                <span className="font-mono font-semibold text-foreground">{alert.vehicle_number}</span>
                {alert.vehicle_type_name && <span>· {alert.vehicle_type_name}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase">Vehicle (live)</div>
              {alert.driver_lat != null && alert.driver_lng != null ? (
                <a
                  href={mapsViewUrl(alert.driver_lat, alert.driver_lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  <span className={`size-2 rounded-full ${fresh.dot}`} />
                  {fresh.label} — open in Maps <ExternalLink className="size-3" />
                </a>
              ) : (
                <div className="mt-1 text-muted-foreground">No live location</div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase">Where SOS was pressed</div>
              {alert.lat != null && alert.lng != null ? (
                <a
                  href={mapsViewUrl(alert.lat, alert.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  <MapPin className="size-3.5" /> {Number(alert.lat).toFixed(5)}, {Number(alert.lng).toFixed(5)}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <div className="mt-1 text-muted-foreground">No GPS fix sent with the alert</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ride</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Pickup">{alert.pickup_address ?? "—"}</Row>
            <Row label="Drop-off">{alert.dropoff_address ?? "—"}</Row>
            <Row label="Status now">{(alert.ride_status ?? "—").replace(/_/g, " ")}</Row>
            <Row label="Status at SOS">{alert.ride_status_at_trigger.replace(/_/g, " ")}</Row>
            <Row label="Ride ID">
              <span className="font-mono text-xs">{alert.ride_id}</span>
            </Row>
            {canSeeRide && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setJourney(true)}>
                <Route /> View the ride&apos;s journey
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-5 text-sm">
              <TimelineItem
                icon={<Siren className="size-3.5" />}
                tone="bg-red-600"
                title={`SOS raised by ${sosRoleLabel(alert).toLowerCase()}`}
                at={alert.created_at}
              />
              {alert.acknowledged_at && (
                <TimelineItem
                  icon={<BellRing className="size-3.5" />}
                  tone="bg-amber-500"
                  title={`Acknowledged by ${alert.acknowledged_by_name ?? "staff"}`}
                  at={alert.acknowledged_at}
                  sub={`Response time ${durationBetween(alert.created_at, alert.acknowledged_at)}`}
                />
              )}
              {alert.cancelled_at && (
                <TimelineItem
                  icon={<XCircle className="size-3.5" />}
                  tone="bg-neutral-500"
                  title={`Cancelled by ${sosRoleLabel(alert).toLowerCase()} ("I'm safe")`}
                  at={alert.cancelled_at}
                />
              )}
              {alert.resolved_at && (
                <TimelineItem
                  icon={<CheckCircle2 className="size-3.5" />}
                  tone="bg-emerald-600"
                  title={`Resolved by ${alert.resolved_by_name ?? "staff"}`}
                  at={alert.resolved_at}
                  sub={alert.resolution_note ?? undefined}
                />
              )}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Modal open={resolveOpen} onClose={() => !resolve.isPending && setResolveOpen(false)} title="Resolve SOS alert">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Record what happened and the action taken. This closes the alert for everyone.
          </p>
          <Field label="Resolution note *">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="e.g. Called rider — vehicle broke down, arranged replacement ride. Rider safe."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" disabled={resolve.isPending} onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!note.trim() || resolve.isPending}
              onClick={() =>
                resolve.mutate(
                  { id, note: note.trim() },
                  {
                    onSuccess: () => {
                      setResolveOpen(false);
                      setNote("");
                    },
                  },
                )
              }
            >
              {resolve.isPending ? "Saving…" : "Resolve"}
            </Button>
          </div>
        </div>
      </Modal>

      {canSeeRide && journey && <RideJourneyModal rideId={alert.ride_id} onClose={() => setJourney(false)} />}
    </PageShell>
  );
}

function PartyBody({ name, phone, raisedSos }: { name: string | null; phone: string | null; raisedSos: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold">{name || "—"}</span>
        {raisedSos && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">
            Raised SOS
          </span>
        )}
      </div>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-500"
        >
          <Phone className="size-3.5" /> Call {phone}
        </a>
      ) : (
        <div className="mt-1 text-sm text-muted-foreground">No phone on record</div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function TimelineItem({
  icon,
  tone,
  title,
  at,
  sub,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  at: string;
  sub?: string;
}) {
  return (
    <li className="relative">
      <span className={`absolute -left-8 flex size-6 items-center justify-center rounded-full text-white ${tone}`}>{icon}</span>
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{new Date(at).toLocaleString()}</div>
      {sub && <div className="mt-1 text-sm whitespace-pre-line">{sub}</div>}
    </li>
  );
}
