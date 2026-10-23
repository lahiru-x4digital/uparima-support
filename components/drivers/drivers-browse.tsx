"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { deskApprovalBlocker } from "@/lib/driver-review";
import { useCan, useIsAdmin } from "@/lib/hooks/use-desk";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import { useApproveDriver, useDrivers, useRestoreDriver, useSuspendDriver } from "@/lib/hooks/use-drivers";
import { phoneMatches } from "@/lib/phone-search";
import type { Driver } from "@/types/driver";
import { DriverFlags } from "./driver-flags";
import { DriverFilterBar, GROUP_LABEL, pillClass, useDriverFilters } from "./driver-filters";
import { DriverCallsCell, DriverContactLine, DriverTicketCell } from "./driver-ticket-cells";

const STATUSES = ["all", "approved", "pending", "incomplete", "rejected", "suspended", "deleted"];
const PAGE_SIZE = 20;

const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");
const fullName = (d: Driver) => [d.firstName, d.lastName].filter(Boolean).join(" ") || "—";

// The list endpoint returns every driver matching the status in one response, so search filters
// that full list rather than a page's worth of rows.
function matchesSearch(d: Driver, term: string) {
  return (
    [String(d.id), d.firstName, d.lastName, d.phone, d.email, d.nicNumber, d.vehicleRegistrationNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term) || phoneMatches(d.phone, term)
  );
}

/** Every driver, filtered — for roles with `driver.browse`; with permission, add / approve / suspend / restore from the row. */
export function DriversBrowse() {
  const canRegister = useCan("driver.manual-register");
  const canApprove = useCan("driver.approve");
  const canSuspend = useCan("driver.suspend");
  const canSeeCalls = useCan("support-ticket.view");
  const canLogCalls = useCan("support-ticket.update");
  const isAdmin = useIsAdmin();

  const [status, setStatus] = useState("approved");
  const [term, setTerm] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<Driver | null>(null);

  const { data, isLoading, error, refetch } = useDrivers(status);
  const drivers = useMemo(() => data ?? [], [data]);
  const filters = useDriverFilters(drivers);
  const approve = useApproveDriver();
  const suspend = useSuspendDriver();
  const restore = useRestoreDriver();
  const busy = approve.isPending || suspend.isPending || restore.isPending;

  const needle = term.trim().toLowerCase();
  const filtered = drivers.filter((d) => (!needle || matchesSearch(d, needle)) && filters.matches(d));
  const { page, setPage, totalPages, total, pageItems } = useClientPagination(
    filtered,
    PAGE_SIZE,
    `${status}|${needle}|${filters.key}`,
  );
  const columns = canSeeCalls ? 11 : 10;

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
        </div>
        <DriverFilterBar filters={filters} withDates />
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
                <TableHead>Support Ticket</TableHead>
                {canSeeCalls && <TableHead>Calls</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns} className="text-muted-foreground">
                    No drivers match the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((d) => {
                  // Support staff approve only what the AI review passed (see deskApprovalBlocker).
                  const approvalBlocker = isAdmin ? null : deskApprovalBlocker(d);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{fullName(d)}</span>
                          <DriverFlags driver={d} />
                          <DriverContactLine driver={d} />
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
                      <TableCell className="text-sm">
                        <DriverTicketCell driver={d} />
                      </TableCell>
                      {canSeeCalls && (
                        <TableCell>
                          <DriverCallsCell driver={d} canLog={canLogCalls} />
                        </TableCell>
                      )}
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
                            <Button
                              size="sm"
                              disabled={busy || !!approvalBlocker}
                              title={approvalBlocker ?? undefined}
                              onClick={() => approve.mutate(d.id)}
                            >
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
                  );
                })
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
