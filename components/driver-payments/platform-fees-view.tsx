"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, History, Pencil, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useAdjustPlatformFeeBalance, usePlatformFeeBalances } from "@/lib/hooks/use-driver-payments";
import { driverLabel, formatDate, formatLkr } from "@/lib/format";
import type { DriverPlatformFeeBalanceRow } from "@/types/driver-payment";
import { AdjustBalanceModal } from "./adjust-balance-modal";
import { PlatformFeeHistoryModal } from "./platform-fee-history-modal";
import { StatCard } from "./stat-card";

/** Platform fees riders paid on top of fares, who still owes them, and each driver's ledger. */
export function PlatformFeesView() {
  const canView = useCan("driver-payment.view");
  const canAdjust = useCan("driver-payment.adjust");
  const canOpenDriver = useCan("driver.view");

  const { data, isLoading, error } = usePlatformFeeBalances();
  const adjust = useAdjustPlatformFeeBalance();

  const [search, setSearch] = useState("");
  const [owingOnly, setOwingOnly] = useState(true);
  const [adjusting, setAdjusting] = useState<DriverPlatformFeeBalanceRow | null>(null);
  const [viewing, setViewing] = useState<DriverPlatformFeeBalanceRow | null>(null);

  if (!canView) return <NoAccess what="driver platform fees" />;

  const q = search.trim().toLowerCase();
  const drivers = (data?.drivers ?? []).filter((d) => {
    if (owingOnly && d.owedLkr <= 0) return false;
    if (!q) return true;
    return d.driverName.toLowerCase().includes(q) || d.driverPhone.includes(q);
  });
  const totals = data?.totals;
  const columns = 7;

  return (
    <PageShell
      title="Driver Platform Fees"
      description="Platform fees riders paid on top of their fares. Drivers collect them with the fare and owe them to Uparima; the balance is added to a driver's next plan payment, or they can pay it on its own from the driver app."
    >
      {data && !data.enabled && (
        <p className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
          The platform fee is switched off, so no new fees are being charged. An admin turns it on in System Settings
          and sets the fee on each vehicle type in the Vehicle Catalog (admin dashboard).
        </p>
      )}

      {totals && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Receipt} label="Collected by drivers" value={totals.totalCollectedLkr} />
          <StatCard icon={CheckCircle2} label="Paid to Uparima" value={totals.totalPaidLkr} tone="text-emerald-600" />
          <StatCard icon={Wallet} label="Still owed" value={totals.owedLkr} tone="text-amber-600" />
        </div>
      )}

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Search" className="w-60">
              <Input placeholder="Driver name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            <label className="inline-flex cursor-pointer items-center gap-2.5 pb-1.5 text-sm font-medium select-none">
              <Switch checked={owingOnly} onCheckedChange={setOwingOnly} />
              Only drivers who owe fees
            </label>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}

      <div className="rounded-2xl border bg-card p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Owes now</TableHead>
              <TableHead>Last fee</TableHead>
              <TableHead>Last payment</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns} className="text-muted-foreground">
                  No drivers match.
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((d) => (
                <TableRow key={d.driverId}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {canOpenDriver ? (
                        <Link href={`/drivers/${d.driverId}`} className="font-medium hover:underline">
                          {driverLabel(d.driverName, d.driverId)}
                        </Link>
                      ) : (
                        <span className="font-medium">{driverLabel(d.driverName, d.driverId)}</span>
                      )}
                      {d.driverStatus !== "approved" && <StatusBadge value={d.driverStatus} />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[d.driverPhone, d.vehicleTypeName].filter(Boolean).join(" · ")}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatLkr(d.totalCollectedLkr)}
                    <p className="text-xs text-muted-foreground">
                      {d.feeRides} {d.feeRides === 1 ? "ride" : "rides"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    {d.totalPaidLkr > 0 ? formatLkr(d.totalPaidLkr) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      d.owedLkr > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                    }`}
                  >
                    {d.owedLkr < 0 ? (
                      <span
                        className="text-emerald-700 dark:text-emerald-400"
                        title="Paid more than owed — used up by their next fees"
                      >
                        {formatLkr(-d.owedLkr)} credit
                      </span>
                    ) : (
                      formatLkr(d.owedLkr)
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(d.lastFeeAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(d.lastPaymentAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setViewing(d)}>
                        <History /> History
                      </Button>
                      {canAdjust && (
                        <Button size="sm" variant="outline" onClick={() => setAdjusting(d)}>
                          <Pencil /> Record
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

      {viewing && <PlatformFeeHistoryModal key={viewing.driverId} driver={viewing} onClose={() => setViewing(null)} />}

      {canAdjust && adjusting && (
        <AdjustBalanceModal
          key={adjusting.driverId}
          title="Platform fees — record a change"
          driverName={driverLabel(adjusting.driverName, adjusting.driverId)}
          driverPhone={adjusting.driverPhone}
          currentLabel="Owes now"
          current={adjusting.owedLkr}
          afterLabel="Owes after"
          // Recording a payment (or waiving fees) is the usual change, so it comes first.
          defaultDirection="negative"
          defaultAmount={adjusting.owedLkr > 0 ? String(adjusting.owedLkr) : ""}
          positive={{ chip: "Add a charge", preview: "Charge added", submit: "Add charge" }}
          negative={{ chip: "Payment received / waive", preview: "Payment / waiver", submit: "Record payment" }}
          positiveIsGood={false}
          creditNote={(after) =>
            `This is more than the driver owes. The extra ${formatLkr(-after)} stays as a credit and is used up by their next platform fees.`
          }
          reasonLabel="Reason (recorded in the driver's platform fee history)"
          reasonPlaceholder="e.g. Paid LKR 500 in cash at the office on 6 Oct, receipt no. 1042."
          amountPlaceholder="e.g. 500"
          onSubmit={async (amountLkr, reason) => {
            await adjust.mutateAsync({ driverId: adjusting.driverId, amountLkr, reason });
            setAdjusting(null);
          }}
          onClose={() => setAdjusting(null)}
        />
      )}
    </PageShell>
  );
}
