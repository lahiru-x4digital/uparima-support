"use client";

import { useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/lib/hooks/use-desk";
import { useComplaints } from "@/lib/hooks/use-complaints";
import { cn } from "@/lib/utils";
import type { Complaint, ComplaintReporter } from "@/types/complaint";

const PER_PAGE = 30;

const REPORTER_TABS: Array<{ key: ComplaintReporter; label: string }> = [
  { key: "all", label: "All" },
  { key: "rider", label: "By rider" },
  { key: "driver", label: "By driver" },
];

const LEVEL_TONE: Record<string, "red" | "amber" | "neutral"> = {
  critical: "red",
  urgent: "red",
  high: "red",
  medium: "amber",
  normal: "amber",
  low: "neutral",
};

/** Today / n days back as YYYY-MM-DD in Sri Lanka time — the backend's report days. */
const lkDay = (daysBack = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date(Date.now() - daysBack * 86_400_000));

const PRESETS = [
  { key: "today", label: "Today", from: () => lkDay(), to: () => lkDay() },
  { key: "yesterday", label: "Yesterday", from: () => lkDay(1), to: () => lkDay(1) },
  { key: "7d", label: "Last 7 days", from: () => lkDay(6), to: () => lkDay() },
  { key: "30d", label: "Last 30 days", from: () => lkDay(29), to: () => lkDay() },
];

const pretty = (v: string | null) => (v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const pillClass = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-ring hover:bg-accent",
  );

/**
 * Complaint Report: every complaint a rider made about a driver, or a driver about a rider, newest
 * first — incidents naming the other person plus support tickets filed on a ride. Read-only; open
 * the ticket or driver to act on it.
 */
export function ComplaintList() {
  const canView = useCan("incident.view");

  const [reporter, setReporter] = useState<ComplaintReporter>("all");
  const [from, setFrom] = useState(lkDay);
  const [to, setTo] = useState(lkDay);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<HistoryTarget | null>(null);

  const { data, isLoading, error, isFetching } = useComplaints({
    from,
    to,
    reporter,
    page,
    perPage: PER_PAGE,
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  if (!canView) return <NoAccess what="the complaint report" />;

  const complaints = data?.data ?? [];
  const meta = data?.meta;
  const t = meta?.totals;
  const activePreset = PRESETS.find((p) => p.from() === from && p.to() === to)?.key;

  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  return (
    <PageShell
      title="Complaint Report"
      description="Complaints riders made about drivers and drivers made about riders, newest first. Days are Sri Lanka time."
    >
      {t && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="All complaints" value={t.all} />
          <Stat label="By riders (about drivers)" value={t.byRiders} sub={`${t.driversComplainedAbout} drivers`} />
          <Stat label="By drivers (about riders)" value={t.byDrivers} sub={`${t.ridersComplainedAbout} riders`} />
          <Stat label="Still open" value={t.open} />
        </div>
      )}

      <div className="space-y-3 rounded-2xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Complained</span>
          {REPORTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => filter(setReporter)(tab.key)} aria-pressed={reporter === tab.key} className={pillClass(reporter === tab.key)}>
              {tab.label}
              {t && (
                <span className="ml-1.5 opacity-70">
                  {tab.key === "all" ? t.all : tab.key === "rider" ? t.byRiders : t.byDrivers}
                </span>
              )}
            </button>
          ))}
          <Input
            placeholder="Name, mobile, ticket or vehicle no."
            value={search}
            onChange={(e) => filter(setSearch)(e.target.value)}
            className="ml-auto w-64"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Date</span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setFrom(p.from());
                setTo(p.to());
                setPage(1);
              }}
              aria-pressed={activePreset === p.key}
              className={pillClass(activePreset === p.key)}
            >
              {p.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm font-medium">
            From
            <Input type="date" value={from} max={to} onChange={(e) => e.target.value && filter(setFrom)(e.target.value)} className="w-40" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            To
            <Input type="date" value={to} min={from} max={lkDay()} onChange={(e) => e.target.value && filter(setTo)(e.target.value)} className="w-40" />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}

      <div className={cn("rounded-2xl border bg-card p-2 transition-opacity", isFetching && !isLoading && "opacity-60")}>
        <ComplaintTable rows={complaints} loading={isLoading} onHistory={setHistory} />
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
      </div>

      <HistoryModal target={history} onClose={() => setHistory(null)} onHistory={setHistory} />
    </PageShell>
  );
}

/** Whose complaint history the history modal shows. */
type HistoryTarget = { role: "driver" | "rider"; id: number };

function ComplaintTable({
  rows,
  loading,
  onHistory,
}: {
  rows: Complaint[];
  loading: boolean;
  onHistory: (t: HistoryTarget) => void;
}) {
  return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Complained by</TableHead>
              <TableHead>Against</TableHead>
              <TableHead>Complaint</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ride / ticket</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">No complaints found.</TableCell>
              </TableRow>
            ) : (
              rows.map((c) => <ComplaintRow key={`${c.kind}-${c.id}`} c={c} onHistory={onHistory} />)
            )}
          </TableBody>
        </Table>
  );
}

function Person({
  role,
  name,
  mobile,
  driverId,
  vehicle,
}: {
  role: "rider" | "driver";
  name: string | null;
  mobile: string | null;
  driverId: number | null;
  vehicle?: string | null;
}) {
  const label = name?.trim() || (role === "driver" ? "Unknown driver" : "Unknown rider");
  return (
    <div className="min-w-[140px]">
      <TonePill tone="neutral" className="mr-1.5 uppercase">{role}</TonePill>
      {driverId ? (
        <Link href={`/drivers/${driverId}`} className="font-medium text-primary hover:underline">{label}</Link>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      {mobile ? (
        <a href={`tel:${mobile}`} className="block text-xs text-muted-foreground tabular-nums hover:underline">{mobile}</a>
      ) : (
        <p className="text-xs text-muted-foreground">No mobile</p>
      )}
      {vehicle && <p className="text-xs text-muted-foreground">{vehicle}</p>}
    </div>
  );
}

/** The driver and rider a complaint involves, whichever side complained. */
function people(c: Complaint) {
  return {
    driverId: c.against === "driver" ? c.againstDriverId : c.reporterDriverId,
    riderUserId: c.against === "rider" ? c.againstRiderUserId : c.reporterType === "rider" ? c.reporterUserId : null,
  };
}

function ComplaintRow({ c, onHistory }: { c: Complaint; onHistory: (t: HistoryTarget) => void }) {
  const { driverId, riderUserId } = people(c);
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(c.createdAt)}</TableCell>
      <TableCell>
        <Person role={c.reporterType} name={c.reporterName} mobile={c.reporterMobile} driverId={c.reporterDriverId} />
      </TableCell>
      <TableCell>
        <Person role={c.against} name={c.againstName} mobile={c.againstMobile} driverId={c.againstDriverId} vehicle={c.againstVehicleNumber} />
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal">
        <p className="font-medium">{c.kind === "incident" ? "Incident" : "Ticket"} · {pretty(c.category)}</p>
        {c.subject && <p className="text-sm">{c.subject}</p>}
        {c.detail && <p className="line-clamp-2 text-xs text-muted-foreground" title={c.detail}>{c.detail}</p>}
        {c.source && <p className="mt-0.5 text-[10px] text-muted-foreground uppercase">via {c.source}</p>}
      </TableCell>
      <TableCell>
        <TonePill tone={LEVEL_TONE[c.level] ?? "neutral"}>{pretty(c.level)}</TonePill>
      </TableCell>
      <TableCell>
        <StatusBadge value={c.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {c.kind === "ticket" && c.ticketId && (
          <Link href={`/inbox?ticket=${c.ticketId}`} className="font-medium text-primary hover:underline">
            {c.ticketNumber ?? "Open ticket"}
          </Link>
        )}
        {c.rideId ? (
          <p className="font-mono text-xs text-muted-foreground" title={c.rideId}>Ride #{c.rideId.slice(0, 8)}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No ride</p>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {driverId && (
            <Button size="sm" variant="outline" onClick={() => onHistory({ role: "driver", id: driverId })}>
              <History className="size-3.5" />
              Driver history
            </Button>
          )}
          {riderUserId && (
            <Button size="sm" variant="outline" onClick={() => onHistory({ role: "rider", id: riderUserId })}>
              <History className="size-3.5" />
              Rider history
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Every complaint about or by one driver / rider, all time, newest first. */
function HistoryModal({
  target,
  onClose,
  onHistory,
}: {
  target: HistoryTarget | null;
  onClose: () => void;
  onHistory: (t: HistoryTarget) => void;
}) {
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={target ? `${target.role === "driver" ? "Driver" : "Rider"} complaint history` : undefined}
      className="sm:max-w-6xl"
    >
      {target && <HistoryList key={`${target.role}-${target.id}`} target={target} onHistory={onHistory} />}
    </Modal>
  );
}

function HistoryList({ target, onHistory }: { target: HistoryTarget; onHistory: (t: HistoryTarget) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, isFetching } = useComplaints({
    ...(target.role === "driver" ? { driverId: target.id } : { riderUserId: target.id }),
    page,
    perPage: 20,
  });
  const person = data?.meta.person;
  const t = data?.meta.totals;

  return (
    <div className="space-y-4 text-sm">
      {error && <p className="text-destructive">{getErrorMessage(error)}</p>}
      {person && t && (
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
          <div>
            <p className="text-base font-semibold">
              {person.role === "driver" ? (
                <Link href={`/drivers/${person.id}`} className="text-primary hover:underline">
                  {person.name?.trim() || `Driver #${person.id}`}
                </Link>
              ) : (
                person.name?.trim() || `Rider #${person.id}`
              )}
            </p>
            {person.mobile ? (
              <a href={`tel:${person.mobile}`} className="text-muted-foreground tabular-nums hover:underline">{person.mobile}</a>
            ) : (
              <p className="text-muted-foreground">No mobile</p>
            )}
            {person.vehicleNumber && <p className="text-muted-foreground">{person.vehicleNumber}</p>}
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Complaints against</p>
              <p className="text-xl font-bold text-destructive tabular-nums">{t.received}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Complaints made</p>
              <p className="text-xl font-bold tabular-nums">{t.made}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Still open</p>
              <p className="text-xl font-bold tabular-nums">{t.open}</p>
            </div>
          </div>
        </div>
      )}
      <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
        <ComplaintTable rows={data?.data ?? []} loading={isLoading} onHistory={onHistory} />
      </div>
      {data?.meta && (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />
      )}
    </div>
  );
}
