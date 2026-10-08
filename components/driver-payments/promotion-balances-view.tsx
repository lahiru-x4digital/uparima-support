"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgePercent, CheckCircle2, Clock, Pencil, Wallet } from "lucide-react";
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
import { useAdjustPromotionBalance, usePromotionBalances } from "@/lib/hooks/use-driver-payments";
import { driverLabel, formatDate, formatLkr } from "@/lib/format";
import type { DriverPromotionBalanceRow } from "@/types/driver-payment";
import { AdjustBalanceModal } from "./adjust-balance-modal";
import { StatCard } from "./stat-card";

/** What drivers earned from area promotions, and how much of it they can still withdraw. */
export function PromotionBalancesView() {
  const canView = useCan("driver-payment.view");
  const canAdjust = useCan("driver-payment.adjust");
  const canReview = useCan("driver-payment.withdrawal-review");
  const canOpenDriver = useCan("driver.view");

  const { data, isLoading, error } = usePromotionBalances();
  const adjust = useAdjustPromotionBalance();

  const [search, setSearch] = useState("");
  const [withdrawableOnly, setWithdrawableOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<DriverPromotionBalanceRow | null>(null);

  if (!canView) return <NoAccess what="driver promotion balances" />;

  const q = search.trim().toLowerCase();
  const drivers = (data?.drivers ?? []).filter((d) => {
    if (withdrawableOnly && d.withdrawableLkr <= 0) return false;
    if (!q) return true;
    return d.driverName.toLowerCase().includes(q) || d.driverPhone.includes(q);
  });
  const totals = data?.totals;
  const columns = canAdjust ? 8 : 7;

  return (
    <PageShell
      title="Driver Promotion Balances"
      description="Credits drivers have earned from area promotions (the rider discount the company covers), and how much of it they can still withdraw. Earned = withdrawable + pending + paid out."
    >
      {totals && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={BadgePercent} label="Total earned" value={totals.earnedLkr} />
          <StatCard icon={Wallet} label="Withdrawable" value={totals.withdrawableLkr} tone="text-emerald-600" />
          <StatCard icon={Clock} label="Pending withdrawals" value={totals.pendingLkr} tone="text-amber-600" />
          <StatCard icon={CheckCircle2} label="Paid out" value={totals.paidLkr} tone="text-blue-600" />
        </div>
      )}

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Search" className="w-60">
              <Input placeholder="Driver name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            <label className="inline-flex cursor-pointer items-center gap-2.5 pb-1.5 text-sm font-medium select-none">
              <Switch checked={withdrawableOnly} onCheckedChange={setWithdrawableOnly} />
              Only drivers with a withdrawable balance
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
              <TableHead className="text-right">Total earned</TableHead>
              <TableHead className="text-right">Withdrawable</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Paid out</TableHead>
              <TableHead>Last credit</TableHead>
              <TableHead>Bank account</TableHead>
              {canAdjust && <TableHead />}
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
                    {d.driverPhone && <p className="text-xs text-muted-foreground">{d.driverPhone}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatLkr(d.earnedLkr)}
                    <p className="text-xs text-muted-foreground">
                      {d.creditedRides} {d.creditedRides === 1 ? "ride" : "rides"}
                    </p>
                    {d.adjustmentsLkr !== 0 && (
                      <p
                        className="text-xs text-violet-700 dark:text-violet-400"
                        title="Net of manual adjustments made by staff, included in the total"
                      >
                        incl. {d.adjustmentsLkr > 0 ? "+" : "−"}
                        {formatLkr(Math.abs(d.adjustmentsLkr))} adjusted
                      </p>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      d.withdrawableLkr > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {formatLkr(d.withdrawableLkr)}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.pendingLkr > 0 ? (
                      <>
                        <span className="text-amber-700 dark:text-amber-400">{formatLkr(d.pendingLkr)}</span>
                        {canReview && (
                          <p>
                            <Link
                              href="/drivers/discount-payments"
                              className="text-xs text-primary hover:underline"
                              title="A driver can't request again until this one is reviewed"
                            >
                              Review request
                            </Link>
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.paidLkr > 0 ? formatLkr(d.paidLkr) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(d.lastCreditAt)}</TableCell>
                  <TableCell>
                    {d.hasBankAccount ? (
                      <span className="text-emerald-700 dark:text-emerald-400">On file</span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  {canAdjust && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setAdjusting(d)}>
                        <Pencil /> Adjust
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canAdjust && adjusting && (
        <AdjustBalanceModal
          key={adjusting.driverId}
          title="Adjust promotion balance"
          driverName={driverLabel(adjusting.driverName, adjusting.driverId)}
          driverPhone={adjusting.driverPhone}
          currentLabel="Withdrawable now"
          current={adjusting.withdrawableLkr}
          afterLabel="Withdrawable after"
          defaultDirection="positive"
          positive={{ chip: "Add credit", preview: "Adjustment", submit: "Add credit" }}
          negative={{ chip: "Deduct", preview: "Adjustment", submit: "Deduct" }}
          positiveIsGood
          blockOverdraw
          overdrawNote={
            <>
              You can&apos;t deduct more than the withdrawable balance.
              {adjusting.pendingLkr > 0 &&
                ` ${formatLkr(adjusting.pendingLkr)} is in a pending withdrawal request — reject that request first to return it to the balance.`}
            </>
          }
          reasonLabel="Reason (recorded in the driver's credit history)"
          reasonPlaceholder="e.g. Missed promotion credit for a ride the app failed to record; confirmed with rider by phone."
          amountPlaceholder="e.g. 100"
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
