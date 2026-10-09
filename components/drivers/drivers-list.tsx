"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import {
  useApproveDriver,
  useDrivers,
  useRestoreDriver,
  useSuspendDriver,
  useVehicleTypes,
} from "@/lib/hooks/use-drivers";
import { SRI_LANKA_DISTRICTS_BY_PROVINCE, SRI_LANKA_PROVINCES } from "@/lib/sri-lanka-locations";
import { cn } from "@/lib/utils";
import type { Driver } from "@/types/driver";
import { DriverFlags } from "./driver-flags";

const STATUSES = ["all", "approved", "pending", "incomplete", "rejected", "suspended", "deleted"];
const ONLINE_OPTIONS = ["all", "online", "offline"] as const;
type OnlineFilter = (typeof ONLINE_OPTIONS)[number];
const PAGE_SIZE = 20;

const pillClass = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap capitalize transition-colors",
    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-ring hover:bg-accent",
  );
const filterSelectClass = (active: boolean) => cn(active && "border-primary");
const FILTER_SELECT_WIDTH = "w-48";
const GROUP_LABEL = "mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase";

// YYYY-MM-DD of a timestamp in Sri Lanka time, to compare against the date inputs.
const colomboDay = (s: string) => new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");
const fullName = (d: Driver) => [d.firstName, d.lastName].filter(Boolean).join(" ") || "—";

// The list endpoint returns every driver matching the status in one response, so search filters
// that full list rather than a page's worth of rows.
function matchesSearch(d: Driver, term: string) {
  return [String(d.id), d.firstName, d.lastName, d.phone, d.email, d.nicNumber, d.vehicleRegistrationNumber]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}

/** Every driver, filtered; with permission, add / approve / suspend / restore from the row. */
export function DriversList() {
  const canView = useCan("driver.view");
  const canRegister = useCan("driver.manual-register");
  const canApprove = useCan("driver.approve");
  const canSuspend = useCan("driver.suspend");

  const [status, setStatus] = useState("approved");
  const [term, setTerm] = useState("");
  const [online, setOnline] = useState<OnlineFilter>("all");
  const [vehicleTypeId, setVehicleTypeId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [province, setProvince] = useState("all");
  const [district, setDistrict] = useState("all");
  const [division, setDivision] = useState("all");
  const [suspendTarget, setSuspendTarget] = useState<Driver | null>(null);

  const { data, isLoading, error, refetch } = useDrivers(status);
  const drivers = useMemo(() => data ?? [], [data]);
  const vehicleTypes = useVehicleTypes().data ?? [];
  const approve = useApproveDriver();
  const suspend = useSuspendDriver();
  const restore = useRestoreDriver();
  const busy = approve.isPending || suspend.isPending || restore.isPending;

  const districtOptions = province !== "all" ? (SRI_LANKA_DISTRICTS_BY_PROVINCE[province] ?? []) : [];
  const divisionOptions = useMemo(() => {
    const cities = drivers
      .filter((d) => (province === "all" || d.province === province) && (district === "all" || d.district === district))
      .map((d) => d.city)
      .filter((c): c is string => !!c);
    return Array.from(new Set(cities)).sort();
  }, [drivers, province, district]);

  const needle = term.trim().toLowerCase();
  const filtered = drivers.filter((d) => {
    if (needle && !matchesSearch(d, needle)) return false;
    if (online !== "all" && d.isOnline !== (online === "online")) return false;
    if (vehicleTypeId !== "all" && String(d.vehicleTypeId) !== vehicleTypeId) return false;
    if (dateFrom || dateTo) {
      const day = colomboDay(d.createdAt);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    if (province !== "all" && d.province !== province) return false;
    if (district !== "all" && d.district !== district) return false;
    if (division !== "all" && d.city !== division) return false;
    return true;
  });
  const { page, setPage, totalPages, total, pageItems } = useClientPagination(
    filtered,
    PAGE_SIZE,
    `${status}|${needle}|${online}|${vehicleTypeId}|${dateFrom}|${dateTo}|${province}|${district}|${division}`,
  );

  const hasFilters =
    online !== "all" || dateFrom || dateTo || vehicleTypeId !== "all" || province !== "all" || district !== "all" || division !== "all";

  if (!canView) return <NoAccess what="the drivers list" />;

  return (
    <PageShell
      title="Drivers"
      actions={
        <>
          <SearchBox placeholder="Search name, phone, email, NIC or reg. no." onSearch={setTerm} className="sm:w-96" />
          {canRegister && (
            <Link href="/drivers/add" className={buttonVariants()}>
              <UserPlus /> Add Driver
            </Link>
          )}
        </>
      }
    >
      <div className="space-y-3 rounded-2xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={GROUP_LABEL}>Status</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className={pillClass(status === s)}>
              {s}
            </button>
          ))}

          <span className="mx-2 hidden h-6 w-px bg-border sm:block" />

          <span className={GROUP_LABEL}>Online</span>
          {ONLINE_OPTIONS.map((o) => (
            <button key={o} onClick={() => setOnline(o)} aria-pressed={online === o} className={pillClass(online === o)}>
              {o}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <NativeSelect
            aria-label="Vehicle type"
            value={vehicleTypeId}
            onChange={(e) => setVehicleTypeId(e.target.value)}
            containerClassName={FILTER_SELECT_WIDTH}
            className={filterSelectClass(vehicleTypeId !== "all")}
          >
            <option value="all">All vehicle types</option>
            {vehicleTypes.map((vt) => (
              <option key={vt.id} value={String(vt.id)}>
                {vt.name}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            aria-label="Province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict("all");
              setDivision("all");
            }}
            containerClassName={FILTER_SELECT_WIDTH}
            className={filterSelectClass(province !== "all")}
          >
            <option value="all">All provinces</option>
            {SRI_LANKA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            aria-label="District"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setDivision("all");
            }}
            disabled={province === "all"}
            containerClassName={FILTER_SELECT_WIDTH}
            className={filterSelectClass(district !== "all")}
          >
            <option value="all">All districts</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            aria-label="Division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            containerClassName={FILTER_SELECT_WIDTH}
            className={filterSelectClass(division !== "all")}
          >
            <option value="all">All divisions</option>
            {divisionOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>

          <span className="mx-2 hidden h-6 w-px bg-border sm:block" />

          <label className="flex items-center gap-2 text-sm font-medium">
            Registered from
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            to
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
          </label>
          {hasFilters && (
            <button
              onClick={() => {
                setOnline("all");
                setVehicleTypeId("all");
                setDateFrom("");
                setDateTo("");
                setProvince("all");
                setDistrict("all");
                setDivision("all");
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm">
          <p className="text-destructive">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registration No.</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Rides</TableHead>
                <TableHead>Online</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No drivers match the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{fullName(d)}</span>
                        <DriverFlags driver={d} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={d.status} />
                    </TableCell>
                    <TableCell>{d.vehicleRegistrationNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{d.creditBalance}</TableCell>
                    <TableCell>{d.averageRating != null ? Number(d.averageRating).toFixed(1) : "—"}</TableCell>
                    <TableCell>{d.totalRides}</TableCell>
                    <TableCell>
                      <TonePill tone={d.isOnline ? "green" : "neutral"}>{d.isOnline ? "Online" : "Offline"}</TonePill>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/drivers/${d.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                          View
                        </Link>
                        {canSuspend && d.status === "approved" && (
                          <Button size="sm" variant="destructive" onClick={() => setSuspendTarget(d)}>
                            Suspend
                          </Button>
                        )}
                        {canApprove && (d.status === "suspended" || d.status === "rejected") && (
                          <Button size="sm" disabled={busy} onClick={() => approve.mutate(d.id)}>
                            {d.status === "suspended" ? "Re-approve" : "Approve"}
                          </Button>
                        )}
                        {canApprove && d.status === "deleted" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => restore.mutate(d.id)}
                            title="Restores the account to Pending — review and Approve to reactivate"
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />

      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title="Suspend driver?">
        <p className="mb-4 text-sm text-muted-foreground">
          {suspendTarget ? `${fullName(suspendTarget)} (driver #${suspendTarget.id})` : "This driver"} will be suspended
          and cannot accept rides.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSuspendTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={suspend.isPending}
            onClick={() => {
              if (!suspendTarget) return;
              suspend.mutate(suspendTarget.id, { onSuccess: () => setSuspendTarget(null) });
            }}
          >
            {suspend.isPending ? "Suspending…" : "Suspend"}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
