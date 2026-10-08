"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import { useApproveDriver, usePendingDrivers, useRejectDriver } from "@/lib/hooks/use-drivers";
import type { Driver } from "@/types/driver";
import { DriverFlags } from "./driver-flags";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");
const fullName = (d: Driver) => [d.firstName, d.lastName].filter(Boolean).join(" ") || "—";

const matchesSearch = (d: Driver, term: string) =>
  [String(d.id), d.firstName, d.lastName, d.vehicleRegistrationNumber].filter(Boolean).join(" ").toLowerCase().includes(term);

/** Driver applications waiting for review: look at the documents, then approve or reject. */
export function PendingDriversList() {
  const canView = useCan("driver.view");
  const canApprove = useCan("driver.approve");

  const { data, isLoading, error, refetch } = usePendingDrivers();
  const drivers = data ?? [];
  const approve = useApproveDriver();
  const reject = useRejectDriver();

  const [term, setTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortValue>("newest");
  const [rejectTarget, setRejectTarget] = useState<Driver | null>(null);
  const [reason, setReason] = useState("");

  const needle = term.trim().toLowerCase();
  const filtered = drivers
    .filter((d) => {
      if (needle && !matchesSearch(d, needle)) return false;
      if (dateFrom && d.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && d.createdAt.slice(0, 10) > dateTo) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "name") return fullName(a).localeCompare(fullName(b));
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sort === "oldest" ? cmp : -cmp;
    });

  const { page, setPage, totalPages, total, pageItems } = useClientPagination(
    filtered,
    PAGE_SIZE,
    `${needle}|${dateFrom}|${dateTo}|${sort}`,
  );

  if (!canView && !canApprove) return <NoAccess what="the pending drivers queue" />;

  return (
    <PageShell
      title="Pending Drivers"
      description="Applications waiting for review."
      actions={<SearchBox placeholder="Search name, ID or reg. no." onSearch={setTerm} />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Submitted from
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          to
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
        </label>
        <NativeSelect
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
          containerClassName="w-44"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        {(dateFrom || dateTo || sort !== "newest") && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setSort("newest");
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear filters
          </button>
        )}
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
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Registration No.</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {drivers.length === 0
                      ? "All driver applications have been reviewed."
                      : "No pending drivers match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">#{d.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{fullName(d)}</span>
                        <DriverFlags driver={d} />
                      </div>
                    </TableCell>
                    <TableCell>{d.vehicleRegistrationNumber ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/drivers/${d.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                          View docs
                        </Link>
                        {canApprove && (
                          <>
                            <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(d.id)}>
                              <CheckCircle /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectTarget(d)}>
                              <XCircle /> Reject
                            </Button>
                          </>
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

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject driver">
        <div className="space-y-4">
          <Field label="Reason">
            <Textarea
              rows={3}
              placeholder="Explain why this application is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || reject.isPending}
              onClick={() => {
                if (!rejectTarget) return;
                reject.mutate(
                  { id: rejectTarget.id, reason: reason.trim() },
                  {
                    onSuccess: () => {
                      setRejectTarget(null);
                      setReason("");
                    },
                  },
                );
              }}
            >
              {reject.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
