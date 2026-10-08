"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, Route, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatLkr } from "@/lib/format";
import { useCan } from "@/lib/hooks/use-desk";
import { useRides } from "@/lib/hooks/use-rides";
import { cn } from "@/lib/utils";
import type { Ride } from "@/types/ride";
import { RideDetailsModal, type DetailRow } from "./ride-details-modal";
import { RideJourneyModal } from "./ride-journey-modal";
import { VehicleTag } from "./vehicle-tag";

// Rides still in progress can be viewed live before a journey row exists.
const LIVE_STATUSES = new Set(["matched", "rider_confirmed", "trip_started"]);

const DEVIATION_LABEL: Record<string, string> = {
  over: "Route longer",
  under: "Route shorter",
  under_suspicious: "Suspicious",
};
const DEVIATION_TONE = { over: "amber", under: "neutral", under_suspicious: "red" } as const;

// Status tabs → the ride statuses each covers. "In progress" has no status of its own; "Cancelled"
// includes idle auto-abandoned rides.
const STATUS_TABS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "all", label: "All", statuses: [] },
  { key: "matched", label: "Matched", statuses: ["matched"] },
  { key: "in_progress", label: "In progress", statuses: ["rider_confirmed", "trip_started"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "abandoned"] },
  { key: "no_show", label: "No-show", statuses: ["no_show"] },
];

const PER_PAGE = 20;

const pillClass = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-ring hover:bg-accent",
  );

// Flags worth surfacing in the detail view — each is a manual-review signal (an override, or a
// trip that ended somewhere other than the destination) and carries the reason the actor gave.
function detailRows(r: Ride): DetailRow[] {
  const rows: DetailRow[] = [
    { label: "Ride ID", value: <span className="font-mono text-xs">{r.id}</span> },
    { label: "Pickup", value: r.pickup_address ?? "—" },
    { label: "Dropoff", value: r.dropoff_address ?? "—" },
    {
      label: "Distance",
      value: (
        <>
          {r.distance_km ? `${parseFloat(r.distance_km).toFixed(1)} km quoted` : "—"}
          {r.actual_distance_km && ` · ${parseFloat(r.actual_distance_km).toFixed(1)} km actual`}
        </>
      ),
    },
    {
      label: "Fare",
      value: (
        <>
          {r.final_fare_lkr ? formatLkr(r.final_fare_lkr) : r.fare_lkr ? formatLkr(r.fare_lkr) : "—"}
          {r.final_fare_lkr && r.fare_lkr && (
            <span className="text-xs text-muted-foreground"> (quoted {formatLkr(r.fare_lkr)})</span>
          )}
        </>
      ),
    },
    { label: "Created", value: new Date(r.created_at).toLocaleString() },
  ];

  if (r.admin_recovered_at) {
    rows.push({
      label: "Recovered",
      value: (
        <>
          Marked as completed by an admin on {new Date(r.admin_recovered_at).toLocaleString()}
          {r.admin_recovered_reason && (
            <span className="block text-xs text-muted-foreground">{r.admin_recovered_reason}</span>
          )}
        </>
      ),
    });
  }
  if (r.cancel_reason) {
    rows.push({
      label: r.admin_recovered_at ? "Was abandoned" : "Ended",
      value: `${r.cancel_reason}${r.cancelled_by ? ` (${r.cancelled_by})` : ""}`,
    });
  }
  if (r.route_deviation_flag && r.route_deviation_flag !== "none") {
    rows.push({ label: "Route", value: DEVIATION_LABEL[r.route_deviation_flag] ?? r.route_deviation_flag });
  }
  if (r.pickup_otp_overridden) {
    rows.push({ label: "OTP override", value: r.pickup_otp_override_reason || "No reason given" });
  }
  if (r.destination_overridden) {
    rows.push({ label: "Dest. override", value: r.destination_override_reason || "No reason given" });
  }
  if (r.early_ended) {
    rows.push({
      label: "Ended early",
      value: `By ${r.early_end_by ?? "unknown"}${r.early_end_reason ? ` — ${r.early_end_reason}` : ""}`,
    });
  }
  return rows;
}

const driverLabel = (r: Pick<Ride, "driver_missing" | "driver_id" | "driver_name">) =>
  r.driver_missing ? `Removed driver #${r.driver_id}` : r.driver_name?.trim() || null;

function DriverCell({ ride, link }: { ride: Ride; link: boolean }) {
  if (ride.driver_missing) {
    return (
      <span
        className="text-muted-foreground italic"
        title="This driver's account no longer exists — the ride still references its original driver ID."
      >
        {driverLabel(ride)}
      </span>
    );
  }
  const name = ride.driver_name?.trim();
  if (link && ride.driver_id) {
    return (
      <Link href={`/drivers/${ride.driver_id}`} title="Open driver profile" className="hover:text-primary hover:underline">
        {name || `Driver #${ride.driver_id}`}
      </Link>
    );
  }
  return <>{name || "—"}</>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Ride history: every ride, or one driver's (`?driverId=` — the driver page's "Ride history" button),
 * with status and date filters, details for each ride, and its recorded journey on a map.
 */
export function RideHistory() {
  const driverIdParam = useSearchParams().get("driverId");
  // Keyed so switching driver starts from fresh filters and page 1.
  return <RideHistoryList key={driverIdParam ?? "all"} driverId={driverIdParam && /^\d+$/.test(driverIdParam) ? Number(driverIdParam) : null} />;
}

function RideHistoryList({ driverId }: { driverId: number | null }) {
  const canView = useCan("ride.view");
  const canOpenDriver = useCan("driver.view");

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [journeyRideId, setJourneyRideId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ride | null>(null);

  const statuses = STATUS_TABS.find((t) => t.key === status)?.statuses ?? [];
  const { data, isLoading, error, isFetching } = useRides({
    page,
    perPage: PER_PAGE,
    ...(driverId ? { driverId } : {}),
    ...(statuses.length ? { status: statuses.join(",") } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  });

  if (!canView) return <NoAccess what="ride history" />;

  const rides = data?.data ?? [];
  const meta = data?.meta;
  const summary = driverId ? (meta?.summary ?? null) : null;
  const driverName = summary?.driverName ?? rides.find((r) => r.driver_name?.trim())?.driver_name?.trim();
  const hasFilters = status !== "all" || !!dateFrom || !!dateTo;

  // Any filter change goes back to page 1.
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  return (
    <PageShell
      title={driverId ? `Ride history — ${driverName ?? `Driver #${driverId}`}` : "Rides"}
      backHref={driverId && canOpenDriver ? `/drivers/${driverId}` : undefined}
    >
      {driverId && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent px-3 py-2 text-sm text-accent-foreground">
          <span>
            Showing every ride of driver <span className="font-semibold">{driverName ?? `#${driverId}`}</span>
          </span>
          {canOpenDriver && (
            <Link href={`/drivers/${driverId}`} className="text-primary hover:underline">
              Open driver
            </Link>
          )}
          <Link href="/rides" className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" /> All drivers
          </Link>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Total rides" value={summary.total.toLocaleString()} />
          <Stat label="Completed" value={summary.completed.toLocaleString()} />
          <Stat label="Cancelled / no-show" value={summary.cancelled.toLocaleString()} />
          <Stat label="Fares (completed)" value={formatLkr(summary.faresLkr)} />
          <Stat label="Distance (completed)" value={`${summary.distanceKm.toFixed(1)} km`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Status</span>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => filter(setStatus)(tab.key)}
            aria-pressed={status === tab.key}
            className={pillClass(status === tab.key)}
          >
            {tab.label}
          </button>
        ))}

        <span className="mx-2 hidden h-6 w-px bg-border sm:block" />

        <label className="flex items-center gap-2 text-sm font-medium">
          Created from
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => filter(setDateFrom)(e.target.value)}
            className={cn("w-auto", dateFrom && "border-primary")}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          to
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => filter(setDateTo)(e.target.value)}
            className={cn("w-auto", dateTo && "border-primary")}
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}

      <div className={cn("rounded-2xl border bg-card p-2 transition-opacity", isFetching && !isLoading && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Dropoff</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Fare</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  {hasFilters ? "No rides match your filters." : "No rides found."}
                </TableCell>
              </TableRow>
            ) : (
              rides.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.rider_name?.trim() || (r.rider_user_id ? `Rider #${r.rider_user_id}` : "—")}
                    {r.rider_phone && <p className="text-xs text-muted-foreground">{r.rider_phone}</p>}
                  </TableCell>
                  <TableCell>
                    <DriverCell ride={r} link={canOpenDriver} />
                    {r.driver_phone && <p className="text-xs text-muted-foreground">{r.driver_phone}</p>}
                    <VehicleTag type={r.vehicle_type_name} number={r.vehicle_number} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} />
                    <div className="mt-1 flex flex-col items-start gap-1">
                      {r.admin_recovered_at && (
                        <TonePill tone="neutral" title={r.admin_recovered_reason ?? undefined} className="text-[10px]">
                          Recovered by admin
                        </TonePill>
                      )}
                      {r.pickup_otp_overridden && (
                        <TonePill tone="amber" title={r.pickup_otp_override_reason ?? undefined} className="text-[10px]">
                          OTP overridden
                        </TonePill>
                      )}
                      {r.destination_overridden && (
                        <TonePill tone="amber" title={r.destination_override_reason ?? undefined} className="text-[10px]">
                          Destination overridden
                        </TonePill>
                      )}
                      {r.early_ended && r.early_end_by === "rider" && (
                        <TonePill tone="amber" title={r.early_end_reason ?? undefined} className="text-[10px]">
                          Ended early by rider
                        </TonePill>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate" title={r.pickup_address}>
                    {r.pickup_address ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate" title={r.dropoff_address}>
                    {r.dropoff_address ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.distance_km ? `${parseFloat(r.distance_km).toFixed(1)} km` : "—"}
                    {r.actual_distance_km && (
                      <div className="text-xs text-muted-foreground">
                        actual: {parseFloat(r.actual_distance_km).toFixed(1)} km
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.final_fare_lkr ? (
                      <>
                        <span>{formatLkr(r.final_fare_lkr)}</span>
                        {r.fare_lkr && (
                          <div className="text-xs font-normal text-muted-foreground line-through">{formatLkr(r.fare_lkr)}</div>
                        )}
                      </>
                    ) : r.fare_lkr ? (
                      formatLkr(r.fare_lkr)
                    ) : (
                      "—"
                    )}
                    {r.route_deviation_flag && r.route_deviation_flag !== "none" && (
                      <div className="mt-1">
                        <TonePill tone={DEVIATION_TONE[r.route_deviation_flag]} className="text-[10px]">
                          {DEVIATION_LABEL[r.route_deviation_flag] ?? r.route_deviation_flag}
                        </TonePill>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button size="icon-sm" variant="outline" title="View details" aria-label="View details" onClick={() => setSelected(r)}>
                        <Eye />
                      </Button>
                      {(r.has_journey || LIVE_STATUSES.has(r.status)) && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title={r.has_journey ? "View journey" : "View live journey"}
                          aria-label={r.has_journey ? "View journey" : "View live journey"}
                          onClick={() => setJourneyRideId(r.id)}
                        >
                          <Route />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
      </div>

      <RideJourneyModal key={journeyRideId ?? "none"} rideId={journeyRideId} onClose={() => setJourneyRideId(null)} />

      <RideDetailsModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Ride Details"
        status={selected?.status}
        rider={{ name: selected?.rider_name, phone: selected?.rider_phone }}
        driver={{
          name: selected ? driverLabel(selected) : null,
          phone: selected?.driver_phone,
          vehicle: { type: selected?.vehicle_type_name, number: selected?.vehicle_number },
        }}
        rows={selected ? detailRows(selected) : []}
        footer={
          selected && (selected.has_journey || LIVE_STATUSES.has(selected.status)) ? (
            <button
              onClick={() => {
                setJourneyRideId(selected.id);
                setSelected(null);
              }}
              className={buttonVariants({ size: "sm" })}
            >
              {selected.has_journey ? "View journey" : "View live journey"}
            </button>
          ) : null
        }
      />
    </PageShell>
  );
}
