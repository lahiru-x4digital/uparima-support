"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { useAdjustDriverSubscription, useDriverSubscription } from "@/lib/hooks/use-drivers";
import { useCan } from "@/lib/hooks/use-desk";
import { DetailList } from "./detail-list";

const DAY = 86_400_000;

const SOURCE_LABELS: Record<string, string> = {
  trial: "Free trial",
  admin_grant: "Admin grant",
  referral: "Referral reward",
  referral_milestone: "Referral milestone",
  purchase: "Purchase",
  fee_invoice: "Bank transfer",
  onepay: "Card payment",
};

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");

// Date input value (yyyy-mm-dd, local) for a timestamp.
function toDateInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// A picked calendar day means "end of that day" (local), so the driver keeps the whole day.
const endOfDay = (value: string) => new Date(`${value}T23:59:59`);

/** The driver's current plan, and — with driver.subscription-adjust — a way to add or remove days. */
export function DriverSubscriptionCard({ driverId }: { driverId: string }) {
  const canAdjust = useCan("driver.subscription-adjust");
  const { data: info, error: loadError } = useDriverSubscription(driverId);
  const adjust = useAdjustDriverSubscription();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"adjust_days" | "set_date">("adjust_days");
  const [days, setDays] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  // "Now" is read when the dialog opens, so the preview doesn't drift while it is open.
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // The new date is in the past: the plan would end immediately, so ask once more.
  const [confirmEnd, setConfirmEnd] = useState(false);

  const current = info?.current ?? null;
  const busy = adjust.isPending;

  // Resulting expiry for the live preview; null while the input is incomplete.
  let preview: Date | null = null;
  if (mode === "adjust_days") {
    const n = Number(days);
    if (days !== "" && Number.isInteger(n) && n !== 0) {
      preview = new Date((current?.expiresAt ? new Date(current.expiresAt).getTime() : now) + n * DAY);
    }
  } else if (date) {
    preview = endOfDay(date);
  }
  const previewDays = preview ? Math.ceil((preview.getTime() - now) / DAY) : null;
  const canSubmit = !!preview && reason.trim().length >= 3 && !busy;

  function openDialog() {
    setNow(Date.now());
    setMode("adjust_days");
    setDays("");
    setDate(current?.expiresAt ? toDateInput(new Date(current.expiresAt)) : "");
    setReason("");
    setError(null);
    setConfirmEnd(false);
    setOpen(true);
  }

  async function save() {
    if (!preview) return;
    setError(null);
    try {
      await adjust.mutateAsync({
        id: driverId,
        body:
          mode === "adjust_days"
            ? { mode, days: Number(days), reason: reason.trim() }
            : { mode, expiresAt: preview.toISOString(), reason: reason.trim() },
      });
      setOpen(false);
    } catch (e) {
      setError(getErrorMessage(e));
      setConfirmEnd(false);
    }
  }

  function submit() {
    if (!preview) return;
    if (preview.getTime() <= now && !confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    void save();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Subscription / Free Plan</CardTitle>
          {info && canAdjust && (
            <CardAction>
              <Button size="sm" variant="outline" onClick={openDialog}>
                <CalendarClock /> Adjust days
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {loadError && <p className="text-sm text-destructive">{getErrorMessage(loadError)}</p>}
          {!info && !loadError && <p className="text-sm text-muted-foreground">Loading…</p>}
          {info && !current && <p className="text-sm text-muted-foreground">No active plan.</p>}
          {current && (
            <DetailList
              rows={[
                [
                  "Type",
                  <span key="type">
                    {SOURCE_LABELS[current.source] ?? current.source}{" "}
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                      {current.isFree ? "Free" : "Paid"}
                    </span>
                  </span>,
                ],
                ["Started", fmt(current.startsAt)],
                ["Expires", fmt(current.expiresAt)],
                ["Remaining", `${current.remainingDays} day(s)`],
              ]}
            />
          )}
          {info && info.upcoming.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Queued next:{" "}
              {info.upcoming
                .map((u) => `${SOURCE_LABELS[u.source] ?? u.source} (${fmt(u.startsAt)} → ${fmt(u.expiresAt)})`)
                .join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Adjust subscription days">
        <div className="space-y-4 text-sm">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "adjust_days" ? "default" : "outline"}
              onClick={() => setMode("adjust_days")}
              disabled={busy}
            >
              Add / remove days
            </Button>
            <Button
              size="sm"
              variant={mode === "set_date" ? "default" : "outline"}
              onClick={() => setMode("set_date")}
              disabled={busy}
            >
              Set expiry date
            </Button>
          </div>

          {mode === "adjust_days" ? (
            <Field label="Days (negative to remove)">
              <Input
                type="number"
                step={1}
                min={-365}
                max={365}
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  setConfirmEnd(false);
                }}
                disabled={busy}
                autoFocus
              />
            </Field>
          ) : (
            <Field label="New expiry date">
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setConfirmEnd(false);
                }}
                disabled={busy}
              />
            </Field>
          )}

          <Field label="Reason (recorded in audit log)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} />
          </Field>

          {preview && (
            <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
              New expiry: <span className="font-medium text-foreground">{preview.toLocaleDateString()}</span>
              {previewDays !== null && previewDays > 0 ? ` (${previewDays} day(s) remaining)` : " (ends immediately)"}
              {!current && previewDays !== null && previewDays > 0 && " — a new admin-granted period will be created."}
            </p>
          )}

          {confirmEnd && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
              The new date is in the past, so the driver&apos;s current period will end immediately. Press
              &ldquo;End plan&rdquo; to confirm.
            </p>
          )}

          {error && <p className="text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={confirmEnd ? "destructive" : "default"}
              onClick={submit}
              disabled={!canSubmit}
            >
              {busy ? "Saving…" : confirmEnd ? "End plan" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
