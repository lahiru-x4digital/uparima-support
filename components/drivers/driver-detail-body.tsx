"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DriverDetail, DriverDocumentKey } from "@/types/driver";
import { DetailList } from "./detail-list";
import { DocumentPreviewModal, type DocumentPreview } from "./document-preview-modal";
import { DriverDevicePermissionsCard } from "./driver-device-permissions-card";
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

/**
 * The card grid, documents and credit transactions shared by the standalone driver page and the
 * context-panel dialog — everything below the title bar/actions, which each caller owns itself.
 */
export function DriverDetailBody({
  driverId,
  data,
  canSeeFees,
  canRemoveDoc,
  onRemoveDocument,
  removingDocument,
}: {
  driverId: string;
  data: DriverDetail;
  canSeeFees: boolean;
  canRemoveDoc: boolean;
  onRemoveDocument: (slot: string) => void;
  removingDocument: boolean;
}) {
  const { driver, vehicleMakeName, vehicleModelName, document_urls, transactions, bankAccount } = data;
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ slot: string; label: string } | null>(null);

  return (
    <>
      {/* The page fills the content area; a third column on wide screens keeps each card's labels
          and values close together. */}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <DriverSubscriptionCard driverId={driverId} />

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

        <DriverTermsCard driverId={driverId} />
        <DriverDevicePermissionsCard driverId={driverId} />
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
                          disabled={removingDocument}
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
      <DriverDetailBodyRemoveConfirm
        confirmRemove={confirmRemove}
        removing={removingDocument}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={(slot) => {
          onRemoveDocument(slot);
          setConfirmRemove(null);
        }}
      />
    </>
  );
}

function DriverDetailBodyRemoveConfirm({
  confirmRemove,
  removing,
  onCancel,
  onConfirm,
}: {
  confirmRemove: { slot: string; label: string } | null;
  removing: boolean;
  onCancel: () => void;
  onConfirm: (slot: string) => void;
}) {
  return (
    <Modal open={!!confirmRemove} onClose={onCancel} title="Remove document?">
      {confirmRemove && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">{confirmRemove.label}</span>? The driver will need
            to re-upload it before they can go online again.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={removing} onClick={() => onConfirm(confirmRemove.slot)}>
              {removing ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
