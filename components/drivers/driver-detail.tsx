"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import {
  useApproveDriver,
  useDeleteDriverPermanently,
  useDriverDetail,
  useRemoveDriverDocument,
  useRestoreDriver,
  useSuspendDriver,
  useValidateDriverWithAi,
} from "@/lib/hooks/use-drivers";
import type { AiValidationResult } from "@/types/driver";
import { DriverDetailBody } from "./driver-detail-body";
import { DriverFlags } from "./driver-flags";

/** One driver: details, subscription, documents and credit history, with the actions you may take. */
export function DriverDetail({ id }: { id: string }) {
  const router = useRouter();
  // Hooks are called unconditionally (no `||` between them); the checks combine afterwards.
  const canViewDrivers = useCan("driver.view");
  const canRegister = useCan("driver.manual-register");
  const canUpdate = useCan("driver.update");
  const canApprove = useCan("driver.approve");
  const canSuspend = useCan("driver.suspend");
  const canDelete = useCan("driver.delete");
  const canRemoveDoc = useCan("driver.document-remove");
  const canSeeFees = useCan("driver-payment.view");
  const canSeeRides = useCan("ride.view");

  const { data, isLoading, error } = useDriverDetail(id);
  const approve = useApproveDriver();
  const suspend = useSuspendDriver();
  const restore = useRestoreDriver();
  const validate = useValidateDriverWithAi();
  const removeDocument = useRemoveDriverDocument();
  const deleteDriver = useDeleteDriverPermanently();

  const [aiResult, setAiResult] = useState<AiValidationResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const canView = canViewDrivers || canRegister;
  const canAiValidate = canRegister || canUpdate || canApprove;

  if (!canView) return <NoAccess what="driver details" />;

  if (isLoading) {
    return (
      <PageShell title="Driver" backHref="/drivers">
        <div className="flex justify-center p-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </PageShell>
    );
  }
  if (error || !data) {
    return (
      <PageShell title="Driver" backHref="/drivers">
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
          {error ? getErrorMessage(error) : "Driver not found."}
        </p>
      </PageShell>
    );
  }

  const { driver } = data;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "—";
  const busy = approve.isPending || suspend.isPending || restore.isPending;

  // Also offered for a rejected driver (after a correction a pass approves them), an approved
  // driver still carrying a flagged review (a pass clears the flag so they can go online again), or
  // an incomplete application (where it fills a blank license number from the license photo) — see
  // RidesAdminService.validateDriverWithAi.
  const showAiValidate =
    canAiValidate &&
    (driver.status === "pending" ||
      driver.status === "rejected" ||
      (driver.status === "approved" && (driver.reviewValid === false || driver.missingDocuments.length > 0)));

  function runAiValidate() {
    setAiResult(null);
    validate.mutate(id, {
      onSuccess: (result) => setAiResult(result),
    });
  }

  return (
    <PageShell
      title={
        <span className="flex flex-wrap items-center gap-2">
          {name}
          <StatusBadge value={driver.status} />
          <TonePill tone={driver.isOnline ? "green" : "neutral"}>{driver.isOnline ? "Online" : "Offline"}</TonePill>
          <DriverFlags driver={driver} />
        </span>
      }
      backHref="/drivers"
      actions={
        <>
          {canUpdate && (
            <Link href={`/drivers/${id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              <Pencil /> Edit
            </Link>
          )}
          {canSeeRides && (
            <Link href={`/rides?driverId=${id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              <History /> Ride history
            </Link>
          )}
          {showAiValidate && (
            <Button size="sm" variant="outline" disabled={validate.isPending} onClick={runAiValidate}>
              <Sparkles /> {validate.isPending ? "Validating…" : "AI Validate"}
            </Button>
          )}
          {canApprove && (driver.status === "pending" || driver.status === "rejected") && (
            <Button size="sm" disabled={busy} onClick={() => approve.mutate(driver.id)}>
              Approve
            </Button>
          )}
          {canSuspend && driver.status === "approved" && (
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => suspend.mutate(driver.id)}>
              Suspend
            </Button>
          )}
          {canApprove && driver.status === "suspended" && (
            <Button size="sm" disabled={busy} onClick={() => approve.mutate(driver.id)}>
              Re-approve
            </Button>
          )}
          {canApprove && driver.status === "deleted" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => restore.mutate(driver.id)}
              title="Restores the account to Pending — review and Approve to reactivate"
            >
              Restore
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || deleteDriver.isPending}
              onClick={() => {
                setDeleteText("");
                setConfirmDelete(true);
              }}
            >
              <Trash2 /> Delete driver
            </Button>
          )}
        </>
      }
    >
      {driver.missingDocuments.length > 0 && (
        <Card className="ring-amber-400/60">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400">Incomplete Application</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Missing: {driver.missingDocuments.join(", ")}. This driver registered (or was resubmitted) while
              &ldquo;Bypass Document Validation&rdquo; was on. Confirm the missing item(s) before approving.
            </p>
          </CardContent>
        </Card>
      )}

      {/* The live result of the "AI Validate" button takes priority over the stored verdict — both
          read the same reviewValid / reviewIssues columns once the page reloads, so showing both
          would only duplicate the information. */}
      {!aiResult && driver.reviewValid === false && (
        <Card className="ring-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Document Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{driver.reviewSummary}</p>
            {(driver.reviewIssues ?? []).length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {(driver.reviewIssues ?? []).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {aiResult && (
        <Card className={aiResult.valid ? "ring-emerald-500/40" : "ring-amber-400/60"}>
          <CardHeader>
            <CardTitle
              className={aiResult.valid ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}
            >
              {aiResult.valid ? "AI Validation Passed" : "AI Validation Found Issues"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{aiResult.summary}</p>
            {aiResult.filledLicenseNumber && (
              <p className="mt-2 text-sm">
                License number <span className="font-mono font-semibold">{aiResult.filledLicenseNumber}</span> was read
                from the license photo and saved. Please check it against the photo.
              </p>
            )}
            {aiResult.issues.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {aiResult.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            )}
            {aiResult.approved && (
              <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Driver was automatically approved.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <DriverDetailBody
        driverId={id}
        data={data}
        canSeeFees={canSeeFees}
        canRemoveDoc={canRemoveDoc}
        removingDocument={removeDocument.isPending}
        onRemoveDocument={(slot) => removeDocument.mutate({ id, slot })}
      />

      <Modal
        open={confirmDelete}
        onClose={() => !deleteDriver.isPending && setConfirmDelete(false)}
        title="Permanently delete driver?"
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            This permanently deletes <span className="font-medium text-foreground">{name}</span> (driver #{driver.id})
            and cannot be undone.
          </p>
          <div>
            <p className="font-medium">Deleted</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              <li>Driver profile, documents and photos, bank account</li>
              <li>
                Fee invoices, OnePay payments and saved cards, credit, discount and referral cash, cash-out requests
              </li>
              <li>Registration drafts, flags, their own referral and milestone records</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Kept</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              <li>The user account (classifieds, support tickets) — they can re-register as a driver</li>
              <li>Rides they drove, for riders&apos; history — shown without a driver</li>
            </ul>
          </div>
          <label className="block space-y-1">
            <span>
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </span>
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              disabled={deleteDriver.isPending}
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={deleteDriver.isPending} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteText !== "DELETE" || deleteDriver.isPending}
              onClick={() =>
                deleteDriver.mutate(id, {
                  onSuccess: () => router.push("/drivers"),
                  onError: () => setConfirmDelete(false),
                })
              }
            >
              {deleteDriver.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
