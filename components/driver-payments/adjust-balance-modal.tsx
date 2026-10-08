"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import { cn } from "@/lib/utils";

const MIN_REASON_LENGTH = 10;

type Direction = "positive" | "negative";

type DirectionText = {
  /** The toggle chip. */
  chip: string;
  /** The preview row's label. */
  preview: string;
  /** The submit button. */
  submit: string;
};

/**
 * A manual change to one driver's balance — shared by the platform fee and promotion balance
 * screens, which differ only in wording and in which direction is the "good" one for the driver.
 * The change is saved to the driver's history with who made it and why. Mounted only while open
 * (the parent keys it per driver), so state starts fresh.
 *
 * `onSubmit` receives the SIGNED amount (positive adds to the balance, negative reduces it) and the
 * reason; it throws to show an error and keep the dialog open.
 */
export function AdjustBalanceModal({
  title,
  driverName,
  driverPhone,
  currentLabel,
  current,
  afterLabel,
  positive,
  negative,
  defaultDirection,
  defaultAmount = "",
  positiveIsGood,
  blockOverdraw,
  overdrawNote,
  creditNote,
  reasonLabel,
  reasonPlaceholder,
  amountPlaceholder,
  onSubmit,
  onClose,
}: {
  title: string;
  driverName: string;
  driverPhone: string;
  currentLabel: string;
  current: number;
  afterLabel: string;
  positive: DirectionText;
  negative: DirectionText;
  defaultDirection: Direction;
  defaultAmount?: string;
  /** Colours a positive change green (it helps the driver) rather than red. */
  positiveIsGood: boolean;
  /** Refuse a change that would take the balance below zero. */
  blockOverdraw?: boolean;
  /** Shown under the preview when the change would overdraw (with `blockOverdraw`). */
  overdrawNote?: ReactNode;
  /** Shown under the preview when the balance ends up below zero without being blocked. */
  creditNote?: (after: number) => ReactNode;
  reasonLabel: string;
  reasonPlaceholder: string;
  amountPlaceholder: string;
  onSubmit: (signedAmount: number, reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [amount, setAmount] = useState(defaultAmount);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNumber = Math.round(Number(amount) * 100) / 100;
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNumber) && amountNumber > 0;
  const signed = direction === "positive" ? amountNumber : -amountNumber;
  const after = Math.round((current + (amountValid ? signed : 0)) * 100) / 100;
  const overdraws = !!blockOverdraw && after < 0;
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const text = direction === "positive" ? positive : negative;
  const good = (direction === "positive") === positiveIsGood;

  async function submit() {
    if (!amountValid || overdraws || !reasonValid) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(signed, reason.trim());
    } catch (e) {
      setError(getErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={busy ? () => {} : onClose} title={title}>
      <div className="space-y-4">
        <div className="text-sm">
          <p className="font-medium">{driverName}</p>
          {driverPhone && <p className="text-xs text-muted-foreground">{driverPhone}</p>}
        </div>

        <div className="flex gap-2">
          {(
            [
              ["positive", positive.chip],
              ["negative", negative.chip],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                direction === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Field label="Amount (LKR)">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={amountPlaceholder}
            className="w-40"
          />
        </Field>

        <div className="rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{currentLabel}</span>
            <span>{formatLkr(current)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{text.preview}</span>
            <span className={good ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
              {amountValid ? `${signed > 0 ? "+" : "−"} ${formatLkr(Math.abs(signed))}` : "—"}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
            <span>{afterLabel}</span>
            <span className={overdraws ? "text-destructive" : ""}>{formatLkr(after)}</span>
          </div>
          {overdraws && overdrawNote && <p className="mt-1 text-xs text-destructive">{overdrawNote}</p>}
          {!blockOverdraw && after < 0 && creditNote && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{creditNote(after)}</p>
          )}
        </div>

        <Field label={reasonLabel}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={reasonPlaceholder}
          />
        </Field>
        {reason.trim().length > 0 && !reasonValid && (
          <p className="-mt-2 text-xs text-muted-foreground">At least {MIN_REASON_LENGTH} characters.</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={good ? "default" : "destructive"}
            disabled={busy || !amountValid || overdraws || !reasonValid}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : text.submit}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
