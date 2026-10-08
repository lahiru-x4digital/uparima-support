"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/modal";
import { Pagination } from "@/components/shared/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api";
import { usePlatformFeeLedger } from "@/lib/hooks/use-driver-payments";
import { driverLabel, formatDateTime, formatLkr } from "@/lib/format";
import { PLATFORM_FEE_TRANSACTION_LABELS, type DriverPlatformFeeBalanceRow } from "@/types/driver-payment";

/** One driver's platform fee ledger — every fee charged and every payment, newest first. */
export function PlatformFeeHistoryModal({
  driver,
  onClose,
}: {
  driver: DriverPlatformFeeBalanceRow;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePlatformFeeLedger(driver.driverId, page);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Platform fee history — ${driverLabel(driver.driverName, driver.driverId)}`}
      className="sm:max-w-3xl"
    >
      <div className="space-y-3">
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No platform fee entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell>
                      {PLATFORM_FEE_TRANSACTION_LABELS[t.type] ?? t.type}
                      {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.rideId
                        ? `Ride ${t.rideId.slice(0, 8)}`
                        : t.onepayOrderId
                          ? t.onepayOrderId
                          : t.invoiceId != null
                            ? `Invoice #${t.invoiceId}`
                            : t.adminId != null
                              ? `Staff #${t.adminId}`
                              : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold whitespace-nowrap ${
                        t.amountLkr < 0 ? "text-emerald-700 dark:text-emerald-400" : ""
                      }`}
                      title={t.amountLkr < 0 ? "Reduces what the driver owes" : "Adds to what the driver owes"}
                    >
                      {t.amountLkr < 0 ? "−" : "+"} {formatLkr(Math.abs(t.amountLkr))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {meta && <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
      </div>
    </Modal>
  );
}
