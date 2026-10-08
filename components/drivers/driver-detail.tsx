"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, History, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import type { AiValidationResult, DriverDocumentKey } from "@/types/driver";
import { DetailList } from "./detail-list";
import { DocumentPreviewModal } from "./document-preview-modal";
import { DriverDevicePermissionsCard } from "./driver-device-permissions-card";
import { DriverFlags } from "./driver-flags";
import { DriverSubscriptionCard } from "./driver-subscription-card";
import { DriverTermsCard } from "./driver-terms-card";

const DOC_LABELS: Record<string, string> = {
  profilePicture: "Profile Picture",
  licenseFront: "License (Front)",
  licenseBack: "License (Back)",
  insuranceCardFront: "Insurance Card (Front)",
  revenueLicenseImage: "Revenue License",
  vehicleFront: "Vehicle Photo (Front)",
};

// A Section 126(4) temporary permit is one certificate page — optionally folded, which is the only
// reason it ever has a second side — so calling its photos the "front" and "back" of a licence
// card misleads whoever is reviewing them.
const TEMPORARY_LICENSE_DOC_LABELS: Record<string, string> = {
  licenseFront: "Temporary Licence (Certificate)",
  licenseBack: "Temporary Licence (Other Side)",
};

function docLabel(slot: string, isTemporaryLicense: boolean): string {
  if (isTemporaryLicense && TEMPORARY_LICENSE_DOC_LABELS[slot]) return TEMPORARY_LICENSE_DOC_LABELS[slot];
  return DOC_LABELS[slot] ?? slot;
}

const formatDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
const formatDateTime = (s: string) => (s ? new Date(s).toLocaleString() : "—");
const lkr = (v: number | string | undefined) =>
  `LKR ${Number(v ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

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
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ slot: string; label: string } | null>(null);
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

  const { driver, vehicleMakeName, vehicleModelName, document_urls, transactions, bankAccount } = data;
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

      {/* The page fills the content area; a third column on wide screens keeps each card's labels
          and values close together. */}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <DriverSubscriptionCard driverId={id} />

        <Card>
          <CardHeader>
            <CardTitle>Personal &amp; Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                ["Preferred Display Name", driver.preferredDisplayName ?? "Not set"],
                ["NIC Number", driver.nicNumber ?? "—"],
                ["Mobile", driver.phone ?? "—"],
                ["Secondary Mobile", driver.secondaryMobile ?? "—"],
                ["Email", driver.email ?? "—"],
                ["Referral Code", driver.referralCode ?? "—"],
                ["Joined", formatDate(driver.createdAt)],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                ["Address Line 1", driver.addressLine1 ?? "—"],
                ["Address Line 2", driver.addressLine2 ?? "—"],
                ["Province", driver.province ?? "—"],
                ["District", driver.district ?? "—"],
                ["City", driver.city ?? "—"],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Info</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                ["Owns Vehicle", driver.ownsVehicle ? "Yes" : "No"],
                ["Make", vehicleMakeName ?? "—"],
                ["Model", vehicleModelName ?? "—"],
                ["Year", driver.vehicleYom ?? "—"],
                ["Color", driver.vehicleColor ?? "—"],
                ["Registration No.", driver.vehicleRegistrationNumber ?? "—"],
                ["Credit Balance", driver.creditBalance],
                ["Total Rides", driver.totalRides],
                [
                  "Platform fees owed",
                  <span key="owed" className="inline-flex items-center gap-2">
                    {lkr(driver.platformFeeOwedLkr)}
                    {canSeeFees && (
                      <Link href="/drivers/platform-fees" className="text-xs font-normal text-primary hover:underline">
                        View
                      </Link>
                    )}
                  </span>,
                ],
                ["Platform fees collected", lkr(driver.platformFeeTotalLkr)],
                ["Avg Rating", driver.averageRating != null ? Number(driver.averageRating).toFixed(1) : "—"],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License, Insurance &amp; Revenue License</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                ["License Type", driver.isTemporaryLicense ? "Temporary (Section 126(4))" : "Standard Card"],
                ["License No.", driver.licenseNumber ?? "—"],
                ["License Expiry", formatDate(driver.licenseExpiryDate)],
                ["Insurance Policy No.", driver.insurancePolicyNumber ?? "—"],
                ["Insurance Expiry", formatDate(driver.insuranceExpiryDate)],
                ["Revenue License Expiry", formatDate(driver.revenueLicenseExpiryDate)],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Account</CardTitle>
          </CardHeader>
          <CardContent>
            {bankAccount ? (
              <DetailList
                rows={[
                  ["Bank Name", bankAccount.bankName],
                  ["Account Holder", bankAccount.accountName],
                  ["Account Number", bankAccount.accountNumber],
                  ["Branch", bankAccount.branchName ?? "—"],
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No bank account added.</p>
            )}
          </CardContent>
        </Card>

        <DriverTermsCard driverId={id} />
        <DriverDevicePermissionsCard driverId={id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(document_urls).length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {(Object.entries(document_urls) as Array<[DriverDocumentKey, string]>).map(([slot, url]) => {
                const title = docLabel(slot, driver.isTemporaryLicense);
                return (
                  <div key={slot} className="overflow-hidden rounded-lg border">
                    <div className="group relative h-36 w-full">
                      <button
                        type="button"
                        onClick={() => setPreview({ label: title, url })}
                        className="block h-full w-full"
                        aria-label={`Preview ${title}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={title} className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                          <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium">
                            <Eye className="size-3.5" /> Preview
                          </span>
                        </span>
                      </button>
                      {canRemoveDoc && (
                        <button
                          type="button"
                          title="Remove document"
                          aria-label={`Remove ${title}`}
                          disabled={removeDocument.isPending}
                          onClick={() => setConfirmRemove({ slot, label: title })}
                          className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1.5 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background focus-visible:opacity-100 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="px-3 py-2 text-sm font-medium">{title}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <StatusBadge value={t.type} />
                    </TableCell>
                    <TableCell
                      className={`font-semibold ${t.type === "deduction" ? "text-destructive" : "text-emerald-600"}`}
                    >
                      {t.type === "deduction" ? "-" : "+"}
                      {t.credits}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.onepayReference ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} />

      {/* Gated behind a confirmation, not a plain click: this grid is mostly hover-to-preview, so a
          stray click must not take a document off the driver. */}
      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove document?">
        {confirmRemove && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Remove <span className="font-medium text-foreground">{confirmRemove.label}</span>? The driver will need
              to re-upload it before they can go online again.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={removeDocument.isPending}
                onClick={() =>
                  removeDocument.mutate({ id, slot: confirmRemove.slot }, { onSettled: () => setConfirmRemove(null) })
                }
              >
                {removeDocument.isPending ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
