"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/shared/file-upload";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import {
  useApproveWithdrawal,
  useDiscountSettings,
  useDiscountWithdrawals,
  useRejectWithdrawal,
  useUpdateDiscountSettings,
} from "@/lib/hooks/use-driver-payments";
import { driverLabel, formatDateTime, formatLkr } from "@/lib/format";
import { uploadRidesFile } from "@/lib/services/rides-upload.service";
import type { DiscountWithdrawalAdminRow, DiscountWithdrawalStatus } from "@/types/driver-payment";

const STATUS_TABS: Array<{ value: DiscountWithdrawalStatus | "all"; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_TONE = { pending: "amber", approved: "green", rejected: "red" } as const;

/** Driver requests to withdraw their promotion balance: review them, and set the minimum. */
export function WithdrawalsView() {
  const canView = useCan("driver-payment.view");
  const canReview = useCan("driver-payment.withdrawal-review");
  const canEditMinimum = useCan("driver-payment.adjust");
  const canOpenDriver = useCan("driver.view");

  const [status, setStatus] = useState<DiscountWithdrawalStatus | "all">("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useDiscountWithdrawals(status === "all" ? undefined : status, page);
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();

  const [approving, setApproving] = useState<DiscountWithdrawalAdminRow | null>(null);
  const [slipKey, setSlipKey] = useState("");
  const [rejecting, setRejecting] = useState<DiscountWithdrawalAdminRow | null>(null);
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

  if (!canView) return <NoAccess what="driver withdrawal requests" />;

  const meta = data?.meta;
  const busy = approve.isPending || reject.isPending;

  return (
    <PageShell
      title="Discount Withdrawal Requests"
      description="Driver-initiated requests to withdraw their discount balance (the company subsidy for area-promotion discounts already passed on to riders). Approving means you've paid the driver externally; rejecting refunds the amount back to their balance."
    >
      <MinimumWithdrawal canEdit={canEditMinimum} />

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
              <TableHead>Date</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Transferred To</TableHead>
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
                  No withdrawal requests.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell className="font-medium">
                    {canOpenDriver ? (
                      <Link href={`/drivers/${r.driverId}`} className="hover:underline">
                        {driverLabel(r.driverName, r.driverId)}
                      </Link>
                    ) : (
                      driverLabel(r.driverName, r.driverId)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.driverPhone ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{formatLkr(r.amountLkr)}</TableCell>
                  {/* Always the driver's CURRENT active account, whatever this request's status — for reference. */}
                  <TableCell className="text-xs text-muted-foreground">
                    {r.driverBankAccount ? (
                      <div>
                        <div>{r.driverBankAccount.bankName}</div>
                        <div>
                          {r.driverBankAccount.accountName} · {r.driverBankAccount.accountNumber}
                        </div>
                        {r.status === "pending" && (
                          <div className="italic">Refresh before approving to confirm this is current</div>
                        )}
                      </div>
                    ) : (
                      "No bank account on file"
                    )}
                  </TableCell>
                  {/* Only set once APPROVED — the frozen snapshot of what was actually paid, permanent even if the account above later changes. */}
                  <TableCell className="text-xs text-muted-foreground">
                    {r.bankName || r.accountNumber ? (
                      <div>
                        <div>{r.bankName ?? "—"}</div>
                        <div>
                          {r.accountName ? `${r.accountName} · ` : ""}
                          {r.accountNumber ?? ""}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <TonePill tone={STATUS_TONE[r.status]} className="capitalize">
                      {r.status}
                    </TonePill>
                    {r.status === "rejected" && r.rejectionReason && (
                      <p className="mt-1 text-xs text-muted-foreground" title={r.rejectionReason}>
                        {r.rejectionReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && canReview ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setApproving(r);
                            setSlipKey("");
                          }}
                        >
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
                    ) : r.status === "approved" && r.slipUrl ? (
                      <a
                        href={r.slipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View slip
                      </a>
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

      <Modal open={!!approving} onClose={() => !approve.isPending && setApproving(null)} title="Approve Withdrawal">
        {approving && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Approving {formatLkr(approving.amountLkr)} for{" "}
              <span className="font-medium text-foreground">{driverLabel(approving.driverName, approving.driverId)}</span>
              . You can optionally attach the bank-transfer slip as proof of payment — this cannot be undone.
            </p>
            {approving.driverBankAccount ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{approving.driverBankAccount.bankName}</div>
                <div>
                  {approving.driverBankAccount.accountName} · {approving.driverBankAccount.accountNumber}
                </div>
                {approving.driverBankAccount.branchName && <div>{approving.driverBankAccount.branchName}</div>}
                <div className="mt-1 italic">Refresh before approving to confirm this is current</div>
              </div>
            ) : (
              <p className="text-xs text-destructive">
                This driver has no bank account on file — confirm payment details before approving.
              </p>
            )}
            <div>
              <p className="mb-1.5 text-sm font-medium">
                Bank transfer slip <span className="font-normal text-muted-foreground">(optional)</span>
              </p>
              <FileUpload uploader={(file) => uploadRidesFile(file, "bankSlip")} onChange={setSlipKey} />
              {slipKey && <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">Slip uploaded.</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" disabled={approve.isPending} onClick={() => setApproving(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={approve.isPending}
                onClick={() =>
                  approve.mutate(
                    { id: approving.id, slipS3Key: slipKey || undefined },
                    { onSuccess: () => setApproving(null) },
                  )
                }
              >
                {approve.isPending ? "Approving…" : "Confirm Approval"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!rejecting} onClose={() => !reject.isPending && setRejecting(null)} title="Reject Withdrawal">
        {rejecting && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejecting {formatLkr(rejecting.amountLkr)} for{" "}
              <span className="font-medium text-foreground">{driverLabel(rejecting.driverName, rejecting.driverId)}</span>
              . The amount goes back to their balance.
            </p>
            <Field label="Reason (the driver sees this)">
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The bank account on file is closed — please add a new one."
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={reject.isPending} onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!reason.trim() || reject.isPending}
                onClick={() =>
                  reject.mutate({ id: rejecting.id, reason: reason.trim() }, { onSuccess: () => setRejecting(null) })
                }
              >
                {reject.isPending ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

/**
 * The smallest amount a driver may request. Enforced by the backend, so a change applies to every
 * driver immediately, with no app update. Read-only without driver-payment.adjust.
 */
function MinimumWithdrawal({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, error } = useDiscountSettings();
  const save = useUpdateDiscountSettings();
  // `null` = untouched: show the saved value instead of a copy of it held in state.
  const [draft, setDraft] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  const saved = data ? String(data.withdrawalMinimumLkr) : "";
  const shown = draft ?? saved;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(shown);
    if (shown.trim() === "" || !Number.isFinite(value) || value < 0) {
      setValidation("Enter an amount of 0 or more");
      return;
    }
    setValidation(null);
    save.mutate(value, { onSuccess: () => setDraft(null) });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <Field label="Minimum withdrawal (LKR)" className="w-48">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={shown}
          disabled={isLoading || save.isPending || !canEdit}
          onChange={(e) => {
            setDraft(e.target.value);
            setValidation(null);
          }}
        />
      </Field>
      {canEdit && (
        <Button type="submit" disabled={isLoading || save.isPending || draft === null}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      )}
      <p className="min-w-[16rem] flex-1 text-sm text-muted-foreground">
        Drivers can&apos;t request a withdrawal below this amount, or while their balance is under it. Applies
        immediately to all drivers — no app update needed. 0 removes the minimum. Requests already submitted are
        unaffected.
      </p>
      {(validation || error) && (
        <p className="text-sm text-destructive">{validation ?? getErrorMessage(error)}</p>
      )}
    </form>
  );
}
