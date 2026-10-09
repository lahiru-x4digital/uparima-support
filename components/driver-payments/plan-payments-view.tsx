"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useApprovePlanPayment, usePlanPayments, useRejectPlanPayment } from "@/lib/hooks/use-driver-payments";
import { driverLabel, formatDateTime, formatLkr } from "@/lib/format";
import type { PlanPaymentRow, PlanPaymentStatus } from "@/types/driver-payment";

const STATUS_TABS: Array<{ value: PlanPaymentStatus | "all"; label: string }> = [
  { value: "under_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_TONE = { under_review: "amber", approved: "green", rejected: "red" } as const;
const STATUS_LABEL = { under_review: "Pending", approved: "Approved", rejected: "Rejected" } as const;

const REASON_MAX = 500;

const startsLabel = (row: PlanPaymentRow) =>
  row.applyMode === "now" ? "On approval" : row.applyMode === "after_current" ? "After current plan" : "—";

// Older payments have no recorded type, so fall back on the file's extension.
const isPdf = (row: PlanPaymentRow) =>
  row.receiptContentType
    ? row.receiptContentType === "application/pdf"
    : /\.pdf$/i.test((row.receiptUrl ?? "").split("?")[0]);

/**
 * Bank-transfer payments drivers submit from the app for a plan: check the slip against the bank
 * statement, then approve (which starts the plan) or reject (which tells the driver why).
 */
export function PlanPaymentsView() {
  const canView = useCan("driver-payment.view");
  const canReview = useCan("driver-payment.plan-payment-review");
  const canOpenDriver = useCan("driver.view");

  const [status, setStatus] = useState<PlanPaymentStatus | "all">("under_review");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = usePlanPayments(status === "all" ? undefined : status, page);
  const approve = useApprovePlanPayment();
  const reject = useRejectPlanPayment();

  const [approving, setApproving] = useState<PlanPaymentRow | null>(null);
  const [rejecting, setRejecting] = useState<PlanPaymentRow | null>(null);
  const [viewing, setViewing] = useState<PlanPaymentRow | null>(null);
  const [reason, setReason] = useState("");

  // The queue is paged by the backend, so search narrows the page that is showing.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.data ?? [];
    if (!q) return all;
    return all.filter(
      (r) => (r.driverName ?? "").toLowerCase().includes(q) || (r.driverPhone ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  if (!canView) return <NoAccess what="driver plan payments" />;

  const meta = data?.meta;
  const busy = approve.isPending || reject.isPending;

  return (
    <PageShell
      title="Plan Payments"
      description="Bank-transfer payments drivers send from the app for a plan. Check each slip against the bank statement before deciding: approving starts the driver's plan, rejecting tells them why so they can send a new slip."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by driver name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search by driver name or phone"
        />
        <div className="flex gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={status === tab.value ? "default" : "outline"}
              aria-pressed={status === tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}

      <div className="rounded-2xl border bg-card p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Slip</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  {status === "under_review" ? "No payments waiting for review." : "No plan payments."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {canOpenDriver ? (
                        <Link href={`/drivers/${r.driverId}`} className="hover:underline">
                          {driverLabel(r.driverName, r.driverId)}
                        </Link>
                      ) : (
                        driverLabel(r.driverName, r.driverId)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.driverPhone ?? "—"}</div>
                  </TableCell>
                  <TableCell>{r.planName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{formatLkr(r.amountLkr)}</div>
                    {Number(r.platformFeeLkr) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        incl. {formatLkr(r.platformFeeLkr)} platform fees
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{startsLabel(r)}</TableCell>
                  <TableCell>
                    {r.receiptUrl ? (
                      <button type="button" className="text-xs text-primary underline" onClick={() => setViewing(r)}>
                        {isPdf(r) ? "View PDF" : "View slip"}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <TonePill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</TonePill>
                    {r.status === "rejected" && r.rejectionReason && (
                      <p className="mt-1 max-w-56 text-xs text-muted-foreground" title={r.rejectionReason}>
                        {r.rejectionReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "under_review" && canReview ? (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" disabled={busy} onClick={() => setApproving(r)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => {
                            setRejecting(r);
                            setReason("");
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}

      <Modal open={!!approving} onClose={() => !approve.isPending && setApproving(null)} title="Approve plan payment">
        {approving && (
          <div className="space-y-4 p-0.5">
            <Summary row={approving} />
            {/* The slip itself, so the amount can be read without leaving the dialog. */}
            <SlipPreview key={approving.id} row={approving} />
            <p className="text-sm text-muted-foreground">
              Approve only after the bank statement shows {formatLkr(approving.amountLkr)} from this driver. Approving
              starts their plan{Number(approving.platformFeeLkr) > 0 ? " and clears the platform fees included" : ""};
              it can&apos;t be undone here.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={approve.isPending} onClick={() => setApproving(null)}>
                Cancel
              </Button>
              <Button
                disabled={approve.isPending}
                onClick={() => approve.mutate(approving.id, { onSettled: () => setApproving(null) })}
              >
                {approve.isPending ? "Approving…" : "Approve payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!rejecting} onClose={() => !reject.isPending && setRejecting(null)} title="Reject plan payment">
        {rejecting && (
          <div className="space-y-4 p-0.5">
            <Summary row={rejecting} />
            <SlipPreview key={rejecting.id} row={rejecting} />
            <Field label="Reason" hint="The driver sees this, so say what to fix — for example, the amount doesn't match.">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
                maxLength={REASON_MAX}
                rows={3}
                autoFocus
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={reject.isPending} onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={reject.isPending || reason.trim() === ""}
                onClick={() =>
                  reject.mutate({ id: rejecting.id, reason: reason.trim() }, { onSettled: () => setRejecting(null) })
                }
              >
                {reject.isPending ? "Rejecting…" : "Reject payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Payment slip — ${driverLabel(viewing.driverName, viewing.driverId)}` : undefined}
        className="sm:max-w-3xl"
      >
        {viewing && (
          <div className="space-y-4 p-0.5">
            <SlipPreview key={viewing.id} row={viewing} large />
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

/** The slip, shown on the page: a photo as an image, a PDF in a frame. */
function SlipPreview({ row, large = false }: { row: PlanPaymentRow; large?: boolean }) {
  // The signed link behind the slip only lasts half an hour.
  const [failed, setFailed] = useState(false);
  if (!row.receiptUrl) return null;
  if (failed) {
    return (
      <p className="rounded-lg border p-3 text-sm text-muted-foreground">
        The slip couldn&apos;t be loaded. Its link lasts 30 minutes — reload the page and try again.
      </p>
    );
  }
  if (isPdf(row)) {
    return (
      <div className="space-y-1.5">
        <iframe
          src={row.receiptUrl}
          title="Payment slip"
          referrerPolicy="no-referrer"
          className={`w-full rounded-lg border ${large ? "h-[70vh]" : "h-80"}`}
        />
        <p className="text-xs text-muted-foreground">
          PDF not showing here?{" "}
          {/* noopener + noreferrer: no way back into this page, and no hint of where it came from. */}
          <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Open it separately
          </a>
          .
        </p>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link, not a site asset
    <img
      src={row.receiptUrl}
      alt="Payment slip"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full rounded-lg border object-contain ${large ? "max-h-[70vh]" : "max-h-80"}`}
    />
  );
}

function Summary({ row }: { row: PlanPaymentRow }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
      <dt className="text-muted-foreground">Driver</dt>
      <dd className="font-medium">
        {driverLabel(row.driverName, row.driverId)}
        {row.driverPhone ? ` · ${row.driverPhone}` : ""}
      </dd>
      <dt className="text-muted-foreground">Plan</dt>
      <dd>{row.planName ?? "—"}</dd>
      <dt className="text-muted-foreground">Amount</dt>
      <dd className="font-semibold">{formatLkr(row.amountLkr)}</dd>
      <dt className="text-muted-foreground">Starts</dt>
      <dd>{startsLabel(row)}</dd>
    </dl>
  );
}
