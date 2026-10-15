"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import { useApproveDriver, useDrivers, useRestoreDriver, useSuspendDriver } from "@/lib/hooks/use-drivers";
import type { Driver } from "@/types/driver";
import { DriverFlags } from "./driver-flags";

const PAGE_SIZE = 20;
/** Too short a term would match half the drivers — the page is for finding one. */
const MIN_SEARCH_LENGTH = 3;

const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");
const fullName = (d: Driver) => [d.firstName, d.lastName].filter(Boolean).join(" ") || "—";

/** Find a driver by searching — the full list is never shown; with permission, add / approve / suspend / restore from the row. */
export function DriversSearch() {
  const canView = useCan("driver.view");
  const canRegister = useCan("driver.manual-register");
  const canApprove = useCan("driver.approve");
  const canSuspend = useCan("driver.suspend");

  const [term, setTerm] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<Driver | null>(null);

  const needle = term.trim().toLowerCase();
  const searching = needle.length >= MIN_SEARCH_LENGTH;

  // Nothing is fetched until there is something to search for.
  const { data, isLoading, error, refetch } = useDrivers("all", { search: needle, enabled: searching });
  const drivers = useMemo(() => data ?? [], [data]);
  const approve = useApproveDriver();
  const suspend = useSuspendDriver();
  const restore = useRestoreDriver();
  const busy = approve.isPending || suspend.isPending || restore.isPending;

  // The server matches and caps the results, so there is nothing left to filter here.
  const filtered = searching ? drivers : [];
  const { page, setPage, totalPages, total, pageItems } = useClientPagination(filtered, PAGE_SIZE, needle);

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
      {!searching ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          <Search className="size-6" />
          <p>Search for a driver by name, phone, email, NIC or registration number.</p>
          <p className="text-xs">Enter at least {MIN_SEARCH_LENGTH} characters.</p>
        </div>
      ) : error ? (
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
                    Searching…
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No driver matches your search.
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

      {searching && <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />}

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
