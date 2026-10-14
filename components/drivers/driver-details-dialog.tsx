"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, History, MoreHorizontal, Pencil, Sparkles, Star, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Kbd } from "@/components/shared/kbd";
import { Modal } from "@/components/shared/modal";
import { NoAccess } from "@/components/shared/page-shell";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { changedDriverFields, type DriverSectionKey } from "@/lib/driver-form-rules";
import { canAiValidateDriver, canApproveApplication, formatDriverDate } from "@/lib/driver-review";
import { useCan } from "@/lib/hooks/use-desk";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
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
import { driverToFormValues, type AiValidationResult, type DriverDetail, type DriverFormFiles, type DriverFormValues } from "@/types/driver";
import { DRIVER_TABS, DriverDetailBody, useDriverTab } from "./driver-detail-body";
import { DriverFlags } from "./driver-flags";
import { DiscardChangesModal, DriverForm } from "./driver-form";
import { DriverStatusStrip } from "./driver-status-strip";

type Mode = { kind: "view" } | { kind: "edit"; section?: DriverSectionKey };

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
  const canView = canViewDrivers || canRegister;
  const [mode, setMode] = useState<Mode>({ kind: "view" });
  // Refreshes on its own (the bot saves documents after this was loaded) — but never underneath an edit.
  const { data, isLoading, error, refetch } = useDriverDetail(driverId, {
    live: mode.kind === "edit" ? false : open ? "always" : "incomplete",
  });
  // Opening it shows what is saved now, not what was fetched when the panel first loaded.
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function close() {
    setMode({ kind: "view" });
    setDirty(false);
    onClose();
  }

  // Esc, the backdrop and the ✕ all come through here: never drop an unsaved edit silently.
  function requestClose() {
    if (mode.kind === "edit" && dirty) setConfirmDiscard(true);
    else close();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-7xl flex-col gap-3 overflow-hidden sm:max-w-7xl">
        {!canView ? (
          <NoAccess what="driver details" />
        ) : isLoading ? (
          <DialogSkeleton />
        ) : error || !data ? (
          <>
            <DialogTitle className="sr-only">Driver</DialogTitle>
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
              {error ? getErrorMessage(error) : "Driver not found."}
            </p>
          </>
        ) : (
          <DriverDialogBody
            driverId={driverId}
            data={data}
            mode={mode}
            setMode={setMode}
            onDirtyChange={setDirty}
            onDeleted={close}
          />
        )}
        <DiscardChangesModal
          open={confirmDiscard}
          onKeep={() => setConfirmDiscard(false)}
          onDiscard={() => {
            setConfirmDiscard(false);
            close();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DialogSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading driver">
      <DialogTitle className="sr-only">Loading driver</DialogTitle>
      <Skeleton className="h-6 w-72" />
      <Skeleton className="h-4 w-96" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-8 w-96" />
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}

// Only one dialog (this one) open: a plain-key shortcut must not fire under a nested modal.
const isTopmostDialog = () => document.querySelectorAll('[data-slot="dialog-content"]').length <= 1;

function DriverDialogBody({
  driverId,
  data,
  mode,
  setMode,
  onDirtyChange,
  onDeleted,
}: {
  driverId: string;
  data: DriverDetail;
  mode: Mode;
  setMode: (m: Mode) => void;
  onDirtyChange: (dirty: boolean) => void;
  onDeleted: () => void;
}) {
  const canRegister = useCan("driver.manual-register");
  const canUpdate = useCan("driver.update");
  const canApprove = useCan("driver.approve");
  const canSuspend = useCan("driver.suspend");
  const canDelete = useCan("driver.delete");
  const canRemoveDoc = useCan("driver.document-remove");
  const canSeeFees = useCan("driver-payment.view");
  const canSeeRides = useCan("ride.view");
  const canAiValidate = canRegister || canUpdate || canApprove;

  const approve = useApproveDriver();
  const suspend = useSuspendDriver();
  const restore = useRestoreDriver();
  const validate = useValidateDriverWithAi();
  const removeDocument = useRemoveDriverDocument();
  const deleteDriver = useDeleteDriverPermanently();
  const update = useUpdateDriver();

  const [tab, setTab] = useDriverTab();
  const [aiResult, setAiResult] = useState<AiValidationResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const { driver } = data;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "—";
  const busy = approve.isPending || suspend.isPending || restore.isPending;
  const showAiValidate = canAiValidate && canAiValidateDriver(driver);
  const owed = Number(driver.platformFeeOwedLkr ?? 0);

  const edit = useCallback((section?: DriverSectionKey) => setMode({ kind: "edit", section }), [setMode]);

  function runAiValidate() {
    setAiResult(null);
    validate.mutate(driverId, { onSuccess: (result) => setAiResult(result) });
  }

  async function handleEditSubmit(values: DriverFormValues, files: DriverFormFiles) {
    // Only what this edit changed — see changedDriverFields.
    const initial = driverToFormValues(driver, data.bankAccount);
    await update.mutateAsync({ id: driverId, values: changedDriverFields(initial, values), files });
    onDirtyChange(false);
    setMode({ kind: "view" });
  }

  const viewing = mode.kind === "view";
  useHotkeys(
    {
      e: () => canUpdate && isTopmostDialog() && edit(),
      ...Object.fromEntries(DRIVER_TABS.map((t, i) => [String(i + 1), () => isTopmostDialog() && setTab(t.key)])),
    },
    { enabled: viewing },
  );

  // The one decision this driver is waiting on, as the primary button.
  const primary =
    canApprove && canApproveApplication(driver) ? (
      <Button size="sm" disabled={busy} onClick={() => approve.mutate(driver.id)}>
        Approve
      </Button>
    ) : canApprove && driver.status === "suspended" ? (
      <Button size="sm" disabled={busy} onClick={() => approve.mutate(driver.id)}>
        Re-approve
      </Button>
    ) : canApprove && driver.status === "deleted" ? (
      <Button
        size="sm"
        disabled={busy}
        onClick={() => restore.mutate(driver.id)}
        title="Restores the account to Pending — review and Approve to reactivate"
      >
        Restore
      </Button>
    ) : null;

  const showSuspend = canSuspend && driver.status === "approved";

  const header = (
    <DialogHeader className="gap-1 pr-8">
      <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
        {viewing ? name : `Edit ${name}`}
        <StatusBadge value={driver.status} />
        <TonePill tone={driver.isOnline ? "green" : "neutral"}>{driver.isOnline ? "Online" : "Offline"}</TonePill>
        <DriverFlags driver={driver} />
      </DialogTitle>
      <DialogDescription className="flex flex-wrap items-center gap-x-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5 fill-current text-amber-500" />
          {driver.averageRating != null ? Number(driver.averageRating).toFixed(1) : "—"}
        </span>
        <span>· {Number(driver.totalRides).toLocaleString()} rides</span>
        <span>· Joined {formatDriverDate(driver.createdAt)}</span>
        <span>· Driver #{driver.id}</span>
        {owed > 0 && <span className="font-medium text-destructive">· Owes LKR {Math.round(owed).toLocaleString()}</span>}
      </DialogDescription>
    </DialogHeader>
  );

  if (mode.kind === "edit") {
    return (
      <>
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <DriverForm
            mode="edit"
            initialValues={driverToFormValues(driver, data.bankAccount)}
            existingDocs={data.document_urls}
            initialSection={mode.section}
            onDirtyChange={onDirtyChange}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              onDirtyChange(false);
              setMode({ kind: "view" });
            }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <div className="flex flex-wrap items-center gap-2">
        {primary}
        {canUpdate && (
          <Button size="sm" variant="outline" onClick={() => edit()}>
            <Pencil /> Edit <Kbd>E</Kbd>
          </Button>
        )}
        {showAiValidate && (
          <Button size="sm" variant="outline" disabled={validate.isPending} onClick={runAiValidate}>
            <Sparkles /> {validate.isPending ? "Validating…" : "AI Validate"}
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
        {(showSuspend || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="sm" variant="ghost" aria-label="More actions" title="More actions" className="ml-auto" />}
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {showSuspend && (
                <DropdownMenuItem variant="destructive" disabled={busy} onClick={() => suspend.mutate(driver.id)}>
                  <Ban /> Suspend driver
                </DropdownMenuItem>
              )}
              {showSuspend && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={busy || deleteDriver.isPending}
                  onClick={() => {
                    setDeleteText("");
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 /> Delete permanently…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <DriverStatusStrip
        driver={driver}
        aiResult={aiResult}
        canUpdate={canUpdate}
        onCompleteDetails={() => edit()}
        onOpenDocuments={() => setTab("documents")}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DriverDetailBody
          driverId={driverId}
          data={data}
          canSeeFees={canSeeFees}
          canRemoveDoc={canRemoveDoc}
          removingDocument={removeDocument.isPending}
          onRemoveDocument={(slot) => removeDocument.mutate({ id: driverId, slot })}
          tab={tab}
          onTabChange={setTab}
          onEditSection={canUpdate ? edit : undefined}
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
