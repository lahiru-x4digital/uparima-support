"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyValue } from "@/components/shared/copy-value";
import { Kbd } from "@/components/shared/kbd";
import { Modal } from "@/components/shared/modal";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DriverSectionKey } from "@/lib/driver-form-rules";
import { useDriverNotes } from "@/lib/hooks/use-driver-notes";
import { formatDriverDate } from "@/lib/driver-review";
import { cn } from "@/lib/utils";
import type { DriverDetail, DriverDocumentKey } from "@/types/driver";
import { DetailList } from "./detail-list";
import { DocumentPreviewModal } from "./document-preview-modal";
import { DriverDevicePermissionsCard } from "./driver-device-permissions-card";
import { DriverFollowup } from "./driver-followup";
import { DriverNotes } from "./driver-notes";
import { DriverSubscriptionCard } from "./driver-subscription-card";
import { DriverTermsCard } from "./driver-terms-card";
import { ExpiryValue } from "./expiry-value";

export const DRIVER_TABS = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Documents" },
  { key: "payments", label: "Payments & credit" },
  { key: "account", label: "Account" },
  { key: "notes", label: "Notes" },
] as const;
export type DriverTab = (typeof DRIVER_TABS)[number]["key"];

const TAB_STORAGE_KEY = "driver-detail-tab";

function readStoredTab(): DriverTab {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY);
    if (DRIVER_TABS.some((t) => t.key === v)) return v as DriverTab;
  } catch {
    // Storage blocked — fall through to the default.
  }
  return "overview";
}

/**
 * The tab an agent was last on, remembered across drivers: someone working through document
 * reviews shouldn't have to click "Documents" on every driver they open.
 */
export function useDriverTab() {
  const [tab, setTabState] = useState<DriverTab>(readStoredTab);
  function setTab(next: DriverTab) {
    setTabState(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // Not remembered — fine.
    }
  }
  return [tab, setTab] as const;
}

const DOC_LABELS: Record<DriverDocumentKey, string> = {
  profilePicture: "Profile Picture",
  licenseFront: "Licence (Front)",
  licenseBack: "Licence (Back)",
  insuranceCardFront: "Insurance Card (Front)",
  revenueLicenseImage: "Revenue Licence",
  vehicleFront: "Vehicle Photo (Front)",
};

// A Section 126(4) temporary permit is one certificate page — optionally folded, which is the only
// reason it ever has a second side — so calling its photos the "front" and "back" of a licence
// card misleads whoever is reviewing them.
const TEMPORARY_LICENSE_DOC_LABELS: Partial<Record<DriverDocumentKey, string>> = {
  licenseFront: "Temporary Licence (Certificate)",
  licenseBack: "Temporary Licence (Other Side)",
};

function docLabel(slot: DriverDocumentKey, isTemporaryLicense: boolean): string {
  return (isTemporaryLicense && TEMPORARY_LICENSE_DOC_LABELS[slot]) || DOC_LABELS[slot];
}

const lkr = (v: number | string | undefined) =>
  `LKR ${Number(v ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

const TRANSACTIONS_SHOWN = 20;

/**
 * Everything below the title bar/actions, as tabs, shared by the standalone driver page and the
 * context-panel dialog. Each tab is sized to be read without scrolling on a laptop; the Payments
 * and Account tabs mount (and fetch) only when opened.
 */
export function DriverDetailBody({
  driverId,
  data,
  canSeeFees,
  canRemoveDoc,
  onRemoveDocument,
  removingDocument,
  tab: controlledTab,
  onTabChange,
  onEditSection,
}: {
  driverId: string;
  data: DriverDetail;
  canSeeFees: boolean;
  canRemoveDoc: boolean;
  onRemoveDocument: (slot: string) => void;
  removingDocument: boolean;
  /** Controlled tab (the dialog binds number keys to it); uncontrolled when omitted. */
  tab?: DriverTab;
  onTabChange?: (tab: DriverTab) => void;
  /** When given, each card gets a pencil that opens the edit form at that section. */
  onEditSection?: (section: DriverSectionKey) => void;
}) {
  const { driver, document_urls } = data;
  const [ownTab, setOwnTab] = useDriverTab();
  const tab = controlledTab ?? ownTab;
  const setTab = onTabChange ?? setOwnTab;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  // Counted on the tab, so a colleague's handoff note is noticed without opening it.
  const noteCount = useDriverNotes(driverId).data?.length ?? 0;
  const [confirmRemove, setConfirmRemove] = useState<{ slot: string; label: string } | null>(null);

  const docs = (Object.entries(document_urls) as Array<[DriverDocumentKey, string]>).map(([slot, url]) => ({
    slot,
    url,
    label: docLabel(slot, driver.isTemporaryLicense),
  }));
  const openPreview = (slot: DriverDocumentKey) => setPreviewIndex(docs.findIndex((d) => d.slot === slot));
  const missingDocCount = DOC_GROUPS.flatMap((g) => g.slots).filter(
    (s) => !document_urls[s] && !isOptionalSlot(s, driver.isTemporaryLicense),
  ).length;
  const docsNeedAttention = missingDocCount > 0 || driver.missingDocuments.length > 0 || driver.reviewValid === false;

  const editAction = (section: DriverSectionKey) =>
    onEditSection && (
      <CardAction>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Edit this section"
          title="Edit this section"
          onClick={() => onEditSection(section)}
        >
          <Pencil />
        </Button>
      </CardAction>
    );

  const preview = previewIndex != null ? docs[previewIndex] : null;

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as DriverTab)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {DRIVER_TABS.map((t, i) => (
            <TabsTrigger key={t.key} value={t.key} className="flex-none px-3">
              {t.label}
              {t.key === "documents" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] leading-4",
                    docsNeedAttention
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {docs.length}
                </span>
              )}
              {t.key === "notes" && noteCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] leading-4 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  {noteCount}
                </span>
              )}
              {onTabChange && <Kbd>{i + 1}</Kbd>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="pt-2">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card size="sm" className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Follow-up</CardTitle>
              </CardHeader>
              <CardContent>
                <DriverFollowup driverId={Number(driverId)} />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Personal &amp; Contact</CardTitle>
                {editAction("personal")}
              </CardHeader>
              <CardContent>
                <DetailList
                  rows={[
                    ["Mobile", <CopyValue key="m" value={driver.phone} href={driver.phone ? `tel:${driver.phone}` : undefined} />],
                    ["Secondary mobile", <CopyValue key="s" value={driver.secondaryMobile} href={driver.secondaryMobile ? `tel:${driver.secondaryMobile}` : undefined} />],
                    ["NIC", <CopyValue key="n" value={driver.nicNumber} />],
                    ["Email", <CopyValue key="e" value={driver.email} />],
                    ["Display name", driver.preferredDisplayName ?? "Not set"],
                    ["Joined", formatDriverDate(driver.createdAt)],
                  ]}
                />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Licence, Insurance &amp; Revenue</CardTitle>
                {editAction("license")}
              </CardHeader>
              <CardContent>
                <DetailList
                  rows={[
                    ["Licence", driver.isTemporaryLicense ? "Temporary (Section 126(4))" : "Standard card"],
                    ["Licence no.", <CopyValue key="l" value={driver.licenseNumber} />],
                    ["Licence expiry", <ExpiryValue key="le" date={driver.licenseExpiryDate} />],
                    ["Insurance policy", <CopyValue key="i" value={driver.insurancePolicyNumber} />],
                    ["Insurance expiry", <ExpiryValue key="ie" date={driver.insuranceExpiryDate} />],
                    ["Revenue licence expiry", <ExpiryValue key="re" date={driver.revenueLicenseExpiryDate} />],
                  ]}
                />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Vehicle</CardTitle>
                {editAction("vehicle")}
              </CardHeader>
              <CardContent>
                <DetailList
                  rows={[
                    ["Registration no.", <CopyValue key="r" value={driver.vehicleRegistrationNumber} />],
                    [
                      "Make / model",
                      [data.vehicleMakeName, data.vehicleModelName].filter(Boolean).join(" ") || "—",
                    ],
                    ["Year · colour", [driver.vehicleYom, driver.vehicleColor].filter(Boolean).join(" · ") || "—"],
                    ["Owns vehicle", driver.ownsVehicle ? "Yes" : "No"],
                  ]}
                />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Address</CardTitle>
                {editAction("address")}
              </CardHeader>
              <CardContent>
                <DetailList
                  rows={[
                    ["Address", [driver.addressLine1, driver.addressLine2].filter(Boolean).join(", ") || "—"],
                    ["City", driver.city ?? "—"],
                    ["District · province", [driver.district, driver.province].filter(Boolean).join(" · ") || "—"],
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-3 pt-2">
          {DOC_GROUPS.map((group) => (
            <Card key={group.title} size="sm">
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                {editAction(group.section)}
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex flex-wrap gap-3">
                  {group.slots.map((slot) => {
                    const url = document_urls[slot];
                    const label = docLabel(slot, driver.isTemporaryLicense);
                    return url ? (
                      <DocThumb
                        key={slot}
                        label={label}
                        url={url}
                        onPreview={() => openPreview(slot)}
                        onRemove={canRemoveDoc ? () => setConfirmRemove({ slot, label }) : undefined}
                        removing={removingDocument}
                      />
                    ) : (
                      <MissingDoc key={slot} label={label} optional={isOptionalSlot(slot, driver.isTemporaryLicense)} />
                    );
                  })}
                </div>
                <DetailList rows={group.rows(data)} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Credit balance" value={driver.creditBalance} />
            <Stat
              label="Platform fees owed"
              value={lkr(driver.platformFeeOwedLkr)}
              tone={Number(driver.platformFeeOwedLkr ?? 0) > 0 ? "red" : undefined}
              action={
                canSeeFees && (
                  <Link href="/drivers/platform-fees" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    View <ExternalLink className="size-3" />
                  </Link>
                )
              }
            />
            <Stat label="Fees collected" value={lkr(driver.platformFeeTotalLkr)} />
            <Stat label="Total rides" value={driver.totalRides} />
            <Stat label="Avg rating" value={driver.averageRating != null ? Number(driver.averageRating).toFixed(1) : "—"} />
          </div>
          <DriverSubscriptionCard driverId={driverId} />
          <Transactions transactions={data.transactions} />
        </TabsContent>

        <TabsContent value="account" className="pt-2">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Bank Account</CardTitle>
                {editAction("bank")}
              </CardHeader>
              <CardContent>
                {data.bankAccount ? (
                  <DetailList
                    rows={[
                      ["Bank", data.bankAccount.bankName],
                      ["Branch", data.bankAccount.branchName ?? "—"],
                      ["Account holder", data.bankAccount.accountName],
                      ["Account no.", <CopyValue key="a" value={data.bankAccount.accountNumber} />],
                    ]}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No bank account added.</p>
                )}
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Referral</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailList rows={[["Referral code", <CopyValue key="rc" value={driver.referralCode} />]]} />
              </CardContent>
            </Card>
            <DriverTermsCard driverId={driverId} />
            <DriverDevicePermissionsCard driverId={driverId} />
          </div>
        </TabsContent>
        <TabsContent value="notes" className="max-w-3xl pt-2">
          <DriverNotes driverId={driverId} />
        </TabsContent>
      </Tabs>

      <DocumentPreviewModal
        preview={preview}
        onClose={() => setPreviewIndex(null)}
        position={previewIndex != null && docs.length > 1 ? { index: previewIndex, total: docs.length } : undefined}
        onNavigate={(delta) =>
          setPreviewIndex((i) => (i == null ? i : (i + delta + docs.length) % docs.length))
        }
      />

      {/* Gated behind a confirmation, not a plain click: a stray click must not take a document off the driver. */}
      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove document?">
        {confirmRemove && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Remove <span className="font-medium text-foreground">{confirmRemove.label}</span>? The driver will need to
              re-upload it before they can go online again.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={removingDocument}
                onClick={() => {
                  onRemoveDocument(confirmRemove.slot);
                  setConfirmRemove(null);
                }}
              >
                {removingDocument ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

type DocGroup = {
  title: string;
  section: DriverSectionKey;
  slots: DriverDocumentKey[];
  rows: (data: DriverDetail) => Array<[string, ReactNode]>;
};

// Each document beside the details it proves, so a reviewer compares them without scrolling.
const DOC_GROUPS: DocGroup[] = [
  {
    title: "Driving Licence",
    section: "license",
    slots: ["licenseFront", "licenseBack"],
    rows: ({ driver }) => [
      ["Type", driver.isTemporaryLicense ? "Temporary (Section 126(4))" : "Standard card"],
      ["Licence no.", <CopyValue key="l" value={driver.licenseNumber} />],
      ["Expiry", <ExpiryValue key="e" date={driver.licenseExpiryDate} />],
      ["Name", [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "—"],
      ["NIC", <CopyValue key="n" value={driver.nicNumber} />],
    ],
  },
  {
    title: "Insurance",
    section: "insurance",
    slots: ["insuranceCardFront"],
    rows: ({ driver }) => [
      ["Policy no.", <CopyValue key="p" value={driver.insurancePolicyNumber} />],
      ["Expiry", <ExpiryValue key="e" date={driver.insuranceExpiryDate} />],
      ["Registration no.", driver.vehicleRegistrationNumber ?? "—"],
    ],
  },
  {
    title: "Revenue Licence",
    section: "revenue",
    slots: ["revenueLicenseImage"],
    rows: ({ driver }) => [
      ["Expiry", <ExpiryValue key="e" date={driver.revenueLicenseExpiryDate} />],
      ["Registration no.", driver.vehicleRegistrationNumber ?? "—"],
    ],
  },
  {
    title: "Vehicle",
    section: "vehicle",
    slots: ["vehicleFront"],
    rows: ({ driver, vehicleMakeName, vehicleModelName }) => [
      ["Registration no.", <CopyValue key="r" value={driver.vehicleRegistrationNumber} />],
      ["Make / model", [vehicleMakeName, vehicleModelName].filter(Boolean).join(" ") || "—"],
      ["Colour", driver.vehicleColor ?? "—"],
    ],
  },
  {
    title: "Profile Picture",
    section: "personal",
    slots: ["profilePicture"],
    rows: ({ driver }) => [
      ["Name", [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "—"],
      ["Display name", driver.preferredDisplayName ?? "Not set"],
    ],
  },
];

function isOptionalSlot(slot: DriverDocumentKey, isTemporaryLicense: boolean) {
  return slot === "licenseBack" && isTemporaryLicense;
}

function DocThumb({
  label,
  url,
  onPreview,
  onRemove,
  removing,
}: {
  label: string;
  url: string;
  onPreview: () => void;
  onRemove?: () => void;
  removing: boolean;
}) {
  return (
    <figure className="w-40 overflow-hidden rounded-lg border">
      <div className="relative h-28">
        <button type="button" onClick={onPreview} className="block size-full" aria-label={`Preview ${label}`} title="Preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="size-full object-cover transition-opacity hover:opacity-90" />
        </button>
        {onRemove && (
          <button
            type="button"
            title="Remove document"
            aria-label={`Remove ${label}`}
            disabled={removing}
            onClick={onRemove}
            className="absolute top-1 right-1 rounded-full bg-background/90 p-1.5 text-destructive opacity-70 shadow-sm transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <figcaption className="truncate px-2 py-1 text-xs font-medium" title={label}>
        {label}
      </figcaption>
    </figure>
  );
}

function MissingDoc({ label, optional }: { label: string; optional: boolean }) {
  return (
    <div
      className={cn(
        "flex h-34 w-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-2 text-center text-xs",
        optional ? "text-muted-foreground" : "border-amber-400/70 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
      )}
    >
      <ImageOff className="size-4" />
      <span className="font-medium">{label}</span>
      <span>{optional ? "Optional — not uploaded" : "Not uploaded"}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  action,
}: {
  label: string;
  value: ReactNode;
  tone?: "red";
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-base font-semibold tabular-nums", tone === "red" && "text-destructive")}>{value}</p>
      {action}
    </div>
  );
}

function Transactions({ transactions }: { transactions: DriverDetail["transactions"] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? transactions : transactions.slice(0, TRANSACTIONS_SHOWN);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Credit Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <>
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
                {shown.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <StatusBadge value={t.type} />
                    </TableCell>
                    <TableCell className={cn("font-semibold", t.type === "deduction" ? "text-destructive" : "text-emerald-600")}>
                      {t.type === "deduction" ? "-" : "+"}
                      {t.credits}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.onepayReference ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length > TRANSACTIONS_SHOWN && (
              <div className="border-t p-2 text-center">
                <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show latest only" : `Show all ${transactions.length}`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
