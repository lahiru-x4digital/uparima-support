"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/shared/modal";
import { NoAccess } from "@/components/shared/page-shell";
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
  useUpdateDriver,
  useValidateDriverWithAi,
} from "@/lib/hooks/use-drivers";
import { driverToFormValues, type AiValidationResult, type DriverFormFiles, type DriverFormValues } from "@/types/driver";
import { DriverDetailBody } from "./driver-detail-body";
import { DriverFlags } from "./driver-flags";
import { DriverForm } from "./driver-form";

/**
 * Full driver details — and, with the right permissions, every action the
 * standalone `/drivers/[id]` page offers — as a dialog, so a support agent
 * working a ticket never has to leave it. Same `useCan` gates and the same
 * backend endpoints as the full page; this component just doesn't navigate.
 */
export function DriverDetailsDialog({
  driverId,
  open,
  onClose,
}: {
  driverId: string;
  open: boolean;
  onClose: () => void;
}) {
  const canViewDrivers = useCan("driver.view");
  const canRegister = useCan("driver.manual-register");
  const canUpdate = useCan("driver.update");
  const canApprove = useCan("driver.approve");
  const canSuspend = useCan("driver.suspend");
  const canDelete = useCan("driver.delete");
  const canRemoveDoc = useCan("driver.document-remove");
  const canSeeFees = useCan("driver-payment.view");
  const canSeeRides = useCan("ride.view");

  const { data, isLoading, error } = useDriverDetail(driverId);
  const approve = useApproveDriver();
  const suspend = useSuspendDriver();
  const restore = useRestoreDriver();
  const validate = useValidateDriverWithAi();
  const removeDocument = useRemoveDriverDocument();
  const deleteDriver = useDeleteDriverPermanently();
  const update = useUpdateDriver();

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [aiResult, setAiResult] = useState<AiValidationResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const canView = canViewDrivers || canRegister;
  const canAiValidate = canRegister || canUpdate || canApprove;

  function close() {
    setMode("view");
    setAiResult(null);
    onClose();
  }

  async function handleEditSubmit(values: DriverFormValues, files: DriverFormFiles) {
    await update.mutateAsync({ id: driverId, values, files });
    setMode("view");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-7xl flex-col gap-3 overflow-hidden sm:max-w-7xl">
        {!canView ? (
          <NoAccess what="driver details" />
        ) : isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error || !data ? (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
            {error ? getErrorMessage(error) : "Driver not found."}
          </p>
        ) : (
          <DriverDialogBody
            driverId={driverId}
            data={data}
            mode={mode}
            setMode={setMode}
            canUpdate={canUpdate}
            canApprove={canApprove}
            canSuspend={canSuspend}
            canDelete={canDelete}
            canSeeFees={canSeeFees}
            canSeeRides={canSeeRides}
            canRemoveDoc={canRemoveDoc}
            canAiValidate={canAiValidate}
            approve={approve}
            suspend={suspend}
            restore={restore}
            validate={validate}
            removeDocument={removeDocument}
            deleteDriver={deleteDriver}
            aiResult={aiResult}
            setAiResult={setAiResult}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            deleteText={deleteText}
            setDeleteText={setDeleteText}
            onEditSubmit={handleEditSubmit}
            onDeleted={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Split out so the loading/error/no-access branches above stay simple early returns
// without each needing the full set of mutation hooks in scope.
function DriverDialogBody({
  driverId,
  data,
  mode,
  setMode,
  canUpdate,
  canApprove,
  canSuspend,
  canDelete,
  canSeeFees,
  canSeeRides,
  canRemoveDoc,
  canAiValidate,
  approve,
  suspend,
  restore,
  validate,
  removeDocument,
  deleteDriver,
  aiResult,
  setAiResult,
  confirmDelete,
  setConfirmDelete,
  deleteText,
  setDeleteText,
  onEditSubmit,
  onDeleted,
}: {
  driverId: string;
  data: NonNullable<ReturnType<typeof useDriverDetail>["data"]>;
  mode: "view" | "edit";
  setMode: (m: "view" | "edit") => void;
  canUpdate: boolean;
  canApprove: boolean;
  canSuspend: boolean;
  canDelete: boolean;
  canSeeFees: boolean;
  canSeeRides: boolean;
  canRemoveDoc: boolean;
  canAiValidate: boolean;
  approve: ReturnType<typeof useApproveDriver>;
  suspend: ReturnType<typeof useSuspendDriver>;
  restore: ReturnType<typeof useRestoreDriver>;
  validate: ReturnType<typeof useValidateDriverWithAi>;
  removeDocument: ReturnType<typeof useRemoveDriverDocument>;
  deleteDriver: ReturnType<typeof useDeleteDriverPermanently>;
  aiResult: AiValidationResult | null;
  setAiResult: (r: AiValidationResult | null) => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  deleteText: string;
  setDeleteText: (v: string) => void;
  onEditSubmit: (values: DriverFormValues, files: DriverFormFiles) => Promise<void>;
  onDeleted: () => void;
}) {
  const { driver, document_urls } = data;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "—";
  const busy = approve.isPending || suspend.isPending || restore.isPending;

  const showAiValidate =
    canAiValidate &&
    (driver.status === "pending" ||
      driver.status === "rejected" ||
      (driver.status === "approved" && (driver.reviewValid === false || driver.missingDocuments.length > 0)));

  function runAiValidate() {
    setAiResult(null);
    validate.mutate(driverId, { onSuccess: (result) => setAiResult(result) });
  }

  if (mode === "edit") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-base">Edit {name}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DriverForm
            mode="edit"
            initialValues={driverToFormValues(driver, data.bankAccount)}
            existingDocs={document_urls}
            onSubmit={onEditSubmit}
            onCancel={() => setMode("view")}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader className="pr-8">
        <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
          {name}
          <StatusBadge value={driver.status} />
          <TonePill tone={driver.isOnline ? "green" : "neutral"}>{driver.isOnline ? "Online" : "Offline"}</TonePill>
          <DriverFlags driver={driver} />
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-2">
        {canUpdate && (
          <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
            <Pencil /> Edit
          </Button>
        )}
        {canSeeRides && (
          <Link
            href={`/rides?driverId=${driverId}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
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
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
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
                  License number <span className="font-mono font-semibold">{aiResult.filledLicenseNumber}</span> was
                  read from the license photo and saved. Please check it against the photo.
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
          driverId={driverId}
          data={data}
          canSeeFees={canSeeFees}
          canRemoveDoc={canRemoveDoc}
          removingDocument={removeDocument.isPending}
          onRemoveDocument={(slot) => removeDocument.mutate({ id: driverId, slot })}
        />
      </div>

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
                deleteDriver.mutate(driverId, {
                  onSuccess: onDeleted,
                  onError: () => setConfirmDelete(false),
                })
              }
            >
              {deleteDriver.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
