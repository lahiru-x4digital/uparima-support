"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/shared/modal";
import { MIN_APPROVAL_REASON_LENGTH, approvalIssues } from "@/lib/driver-review";
import { useApproveDriver, useOverrideDriverFlags } from "@/lib/hooks/use-drivers";
import type { Driver } from "@/types/driver";

type Mode = "approve" | "clear";
type Pending = { issues: string[]; mode: Mode; driverName: string };
type Callbacks = { onSuccess?: () => void; onSettled?: () => void };

const nameOf = (d: Pick<Driver, "firstName" | "lastName">) => [d.firstName, d.lastName].filter(Boolean).join(" ");

/**
 * Approve (or Re-approve) a driver, asking for a reason first when they have open document issues
 * (approvalIssues) — the backend refuses such an approval without one and stores it with the issues
 * and the approver (DriversService.approve). `clearFlags` clears an approved driver's AI document
 * flags the same way (admins). Render `modal` once in the component.
 */
export function useApproveWithReason() {
  const approveMutation = useApproveDriver();
  const overrideMutation = useOverrideDriverFlags();
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const ask = useCallback(
    (issues: string[], mode: Mode, driverName: string) =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        setReason("");
        setPending({ issues, mode, driverName });
      }),
    [],
  );

  const finish = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  };

  async function run(driver: Driver, callbacks?: Callbacks) {
    const issues = approvalIssues(driver);
    let given: string | undefined;
    if (issues.length > 0) {
      const r = await ask(issues, "approve", nameOf(driver));
      if (r === null) return;
      given = r;
    }
    approveMutation.mutate({ id: driver.id, reason: given }, callbacks);
  }

  async function clearFlags(driver: Driver, callbacks?: Callbacks) {
    const r = await ask(approvalIssues(driver), "clear", nameOf(driver));
    if (r === null) return;
    overrideMutation.mutate({ id: driver.id, reason: r }, callbacks);
  }

  const trimmed = reason.trim();
  const clearing = pending?.mode === "clear";
  const modal = (
    <Modal
      open={!!pending}
      onClose={() => finish(null)}
      title={clearing ? "Clear document flags" : "Approve with document issues"}
    >
      {pending && (
        <div className="space-y-4">
          <div className="text-sm">
            <p>
              {pending.driverName ? <strong>{pending.driverName}</strong> : "This driver"}{" "}
              {clearing ? "is flagged by the document check:" : "has open document issues:"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {pending.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
            <p className="mt-3 text-muted-foreground">
              {clearing
                ? "Clearing the flags lets the driver go online again. "
                : "Approving lets the driver go online despite these. "}
              Only do this if you have checked the documents yourself. Your name and reason are saved and shown on
              the driver&apos;s page.
            </p>
          </div>
          <Field label="Reason">
            <Textarea
              autoFocus
              rows={3}
              maxLength={500}
              placeholder="e.g. Checked the cover note — the policy runs to 05/10/2027; the AI read the cover note's own 30 days."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {trimmed.length > 0 && trimmed.length < MIN_APPROVAL_REASON_LENGTH && (
            <p className="text-xs text-red-600">Write a little more — at least {MIN_APPROVAL_REASON_LENGTH} characters.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => finish(null)}>
              Cancel
            </Button>
            <Button disabled={trimmed.length < MIN_APPROVAL_REASON_LENGTH} onClick={() => finish(trimmed)}>
              {clearing ? "Clear flags" : "Approve"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );

  return {
    run,
    clearFlags,
    modal,
    isPending: approveMutation.isPending || overrideMutation.isPending,
  };
}
