"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { DriverDetailsDialog } from "@/components/drivers/driver-details-dialog";
import { ContextPanel } from "@/components/inbox/context-panel";
import { DriverForm } from "@/components/drivers/driver-form";
import { deskKeys, driverKeys, driverNoteKeys } from "@/lib/hooks/query-keys";
import type { DriverNote } from "@/types/driver-note";
import type { Conversation } from "@/types/inbox";
import type { DeskProfile } from "@/types/ticket";
import type { Driver, DriverDetail } from "@/types/driver";

// Placeholder "photos" so the documents tab has something to show offline.
const photo = (label: string, hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="100%" height="100%" fill="hsl(${hue},45%,80%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="32" text-anchor="middle" fill="#333">${label}</text></svg>`,
  )}`;

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

const base: Driver = {
  id: 1042,
  userId: 5531,
  phone: "+94771234567",
  firstName: "Nimal",
  lastName: "Perera",
  preferredDisplayName: "Nimal",
  nicNumber: "901234567V",
  profilePictureS3Key: "x",
  referralCode: "NIMAL42",
  addressLine1: "12 Temple Road",
  addressLine2: null,
  province: "Western",
  district: "Colombo",
  city: "Dehiwala",
  email: "nimal@example.com",
  secondaryMobile: null,
  ownsVehicle: true,
  vehicleTypeId: 1,
  vehicleMakeId: 2,
  vehicleModelId: 3,
  vehicleYom: 2018,
  vehicleColor: "White",
  vehicleRegistrationNumber: "CAB-1234",
  isTemporaryLicense: false,
  licenseNumber: "B1234567",
  licenseFrontS3Key: "x",
  licenseBackS3Key: "x",
  licenseExpiryDate: daysFromNow(400),
  insurancePolicyNumber: "POL-778812",
  insuranceCardFrontS3Key: "x",
  insuranceExpiryDate: daysFromNow(12),
  revenueLicenseImageS3Key: "x",
  revenueLicenseExpiryDate: daysFromNow(-20),
  vehicleFrontS3Key: "x",
  reviewValid: false,
  reviewIssues: ["Revenue licence has expired", "Insurance card photo is blurry"],
  reviewSummary: "Two documents need attention.",
  missingDocuments: [],
  missingFields: [],
  status: "approved",
  creditBalance: 150,
  platformFeeOwedLkr: "2350.00",
  platformFeeTotalLkr: "48210.50",
  averageRating: 4.7,
  totalRides: 1284,
  isOnline: true,
  isTestDriver: false,
  createdAt: "2024-03-04T08:00:00Z",
  updatedAt: "2026-10-01T08:00:00Z",
};

const docs = {
  profilePicture: photo("Profile", 200),
  licenseFront: photo("Licence front", 30),
  licenseBack: photo("Licence back", 40),
  insuranceCardFront: photo("Insurance card", 120),
  revenueLicenseImage: photo("Revenue licence", 280),
  vehicleFront: photo("Vehicle front", 0),
};

const SCENARIOS: Record<string, { label: string; detail: DriverDetail }> = {
  approved: {
    label: "Approved driver (expiring docs, AI issues)",
    detail: {
      driver: base,
      vehicleMakeName: "Toyota",
      vehicleModelName: "Axio",
      document_urls: docs,
      bankAccount: { id: 1, driverId: 1042, bankName: "Commercial Bank", accountName: "N Perera", accountNumber: "8001234567", branchName: "Dehiwala" },
      transactions: Array.from({ length: 26 }, (_, i) => ({
        id: i + 1,
        type: i % 3 === 0 ? "deduction" : "purchase",
        credits: 10 + i,
        onepayReference: `OP-${100200 + i}`,
        createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
      })),
    },
  },
  incomplete: {
    label: "Unfinished signup (gaps, missing docs)",
    detail: {
      driver: {
        ...base,
        id: 2077,
        firstName: "Kasun",
        lastName: null,
        nicNumber: null,
        status: "incomplete",
        isOnline: false,
        addressLine1: null,
        city: null,
        vehicleColor: null,
        licenseNumber: null,
        insurancePolicyNumber: null,
        insuranceExpiryDate: null,
        reviewValid: null,
        reviewIssues: null,
        reviewSummary: null,
        missingFields: ["last name", "NIC number", "address line 1", "city", "vehicle color", "license number", "insurance policy number", "insurance expiry date"],
        missingDocuments: ["Vehicle photo"],
        platformFeeOwedLkr: "0",
        totalRides: 0,
        averageRating: null,
      },
      vehicleMakeName: "Toyota",
      vehicleModelName: "Axio",
      document_urls: { licenseFront: docs.licenseFront, profilePicture: docs.profilePicture },
      bankAccount: null,
      transactions: [],
    },
  },
};

const ME: DeskProfile = {
  id: 1,
  name: "Preview Agent",
  email: "agent@example.com",
  type: "support",
  roles: ["support"],
  permissions: [
    "driver.view", "driver.update", "driver.approve", "driver.suspend", "driver.delete",
    "driver.document-remove", "driver-payment.view", "ride.view", "driver.manual-register",
  ],
};

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const NOTES: DriverNote[] = [
  {
    id: "n2",
    driverId: 1042,
    content: "Called at 3pm — he'll upload the new revenue licence tonight. If it isn't there by tomorrow, suspend until it is.",
    ticket: { id: "t1", ticketNumber: "TKT-MG7Q2ABC" },
    author: { id: 2, name: "Sachini Fernando" },
    createdAt: ago(25),
    updatedAt: ago(25),
    edited: false,
  },
  {
    id: "n1",
    driverId: 1042,
    content: "Disputed the platform fee for ride #88123. Finance confirmed the charge is correct; explained to the driver.",
    ticket: null,
    author: { id: 3, name: "Kavindu Silva" },
    createdAt: ago(60 * 26),
    updatedAt: ago(60 * 20),
    edited: true,
  },
];

const conversation = (over: Partial<Conversation> & { driver: NonNullable<Extract<Conversation["submitter"], { kind: "driver" }>> }): Conversation => {
  const { driver, ...rest } = over;
  return {
    id: "t-preview",
    ticketNumber: "TKT-MG7Q2ABC",
    customerName: driver.name,
    role: "driver",
    phone: driver.phone ?? "",
    email: null,
    channel: "whatsapp",
    product: "drivers",
    status: "pending",
    incompleteDriver: driver.status === "incomplete",
    priority: "normal",
    assignedToUserId: 2,
    assignedTo: "Sachini Fernando",
    lastAt: "10:42",
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    subject: "Can't go online",
    preview: "I can't go online since yesterday",
    rideId: null,
    unread: false,
    needsContact: false,
    contactPreference: "call",
    contactedAt: null,
    topic: null,
    language: "en",
    slaDueAt: new Date(Date.now() + 40 * 60_000).toISOString(),
    canReply: true,
    isCurrentSession: true,
    submitter: driver,
    messages: [],
    attachments: [],
    previousTickets: [],
    routing: null,
    ...rest,
  } as Conversation;
};

const PANEL_SCENARIOS: Record<string, { label: string; conversation: Conversation }> = {
  approved: {
    label: "Approved driver, notes, owes fees",
    conversation: conversation({
      driver: {
        kind: "driver", driverId: 1042, name: "Nimal Perera", phone: "+94771234567", status: "approved",
        vehicleRegistrationNumber: "CAB-1234", suspensionReason: null, averageRating: 4.7, totalRides: 1284,
        creditBalance: 0, platformFeeOwedLkr: 2350,
      },
    }),
  },
  suspended: {
    label: "Suspended driver",
    conversation: conversation({
      driver: {
        kind: "driver", driverId: 3011, name: "Dami Ya", phone: "94786195244", status: "suspended",
        vehicleRegistrationNumber: "BFA-7801", suspensionReason: "unpaid_platform_fees", averageRating: 3.9, totalRides: 212,
        creditBalance: 0, platformFeeOwedLkr: 0,
      },
      email: "dami@example.com",
    }),
  },
  incomplete: {
    label: "Unfinished signup (Dami Ya)",
    conversation: conversation({
      driver: {
        kind: "driver", driverId: 2077, name: "Dami Ya", phone: "94786195244", status: "incomplete",
        vehicleRegistrationNumber: null, suspensionReason: null, averageRating: 0, totalRides: 0,
        creditBalance: 0, platformFeeOwedLkr: 0,
      },
    }),
  },
};

export function DriverPreview() {
  const qc = useQueryClient();
  // Seed the cache once, before anything reads it. With nobody signed in the queries never fetch,
  // so the components render exactly this data. Saving / approving will fail (no API) — expected.
  useState(() => {
    qc.setQueryData(deskKeys.me, ME);
    qc.setQueryData(driverNoteKeys.list("approved"), NOTES);
    qc.setQueryData(driverNoteKeys.list("incomplete"), []);
    qc.setQueryData(driverNoteKeys.list(1042), NOTES);
    qc.setQueryData(driverNoteKeys.list(3011), []);
    qc.setQueryData(driverNoteKeys.list(2077), []);
    qc.setQueryData(driverKeys.detail("2077"), { ...SCENARIOS.incomplete.detail, driver: { ...SCENARIOS.incomplete.detail.driver, firstName: "Dami", lastName: null } });
    for (const [id, s] of Object.entries(SCENARIOS)) qc.setQueryData(driverKeys.detail(id), s.detail);
    qc.setQueryData(driverKeys.vehicleTypes, [{ id: 1, name: "Car" }, { id: 4, name: "Bike" }]);
    qc.setQueryData(driverKeys.vehicleMakes("1"), [{ id: 2, name: "Toyota" }, { id: 5, name: "Suzuki" }]);
    qc.setQueryData(driverKeys.vehicleModels("1", "2"), [{ id: 3, name: "Axio" }, { id: 6, name: "Prius" }]);
    qc.setQueryData(driverKeys.provinces, ["Western Province", "Central Province"]);
    qc.setQueryData(driverKeys.provinceDistricts("Western"), ["Colombo District", "Gampaha District"]);
    qc.setQueryData(driverKeys.districtCities("Western", "Colombo"), ["Colombo", "Dehiwala", "Maharagama"]);
    return null;
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<keyof typeof PANEL_SCENARIOS>("incomplete");
  const [creating, setCreating] = useState(false);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Driver UI preview</h1>
      <p className="text-sm text-muted-foreground">
        Dev only, mock data, no sign-in. Saving, approving and AI calls hit no backend and will show an error toast.
      </p>
      <div className="flex flex-col gap-2">
        {Object.entries(SCENARIOS).map(([id, s]) => (
          <Button key={id} variant="outline" className="justify-start" onClick={() => setOpenId(id)}>
            Open dialog — {s.label}
          </Button>
        ))}
        <Button variant="outline" className="justify-start" onClick={() => setCreating(true)}>
          Open create-driver wizard
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Inbox details panel (320px, as in the inbox)</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PANEL_SCENARIOS).map(([id, s]) => (
            <Button key={id} size="sm" variant={panelId === id ? "default" : "outline"} onClick={() => setPanelId(id)}>
              {s.label}
            </Button>
          ))}
        </div>
        <div className="h-[760px] w-[320px] overflow-hidden rounded-lg border">
          <ContextPanel
            key={panelId}
            conversation={PANEL_SCENARIOS[panelId].conversation}
            staff={[{ id: 2, name: "Sachini Fernando" }, { id: 3, name: "Kavindu Silva" }]}
            canUpdate
            onAssign={() => {}}
            onPriority={() => {}}
            onClose={() => {}}
          />
        </div>
      </section>

      {openId && <DriverDetailsDialog driverId={openId} open onClose={() => setOpenId(null)} />}

      <Modal open={creating} onClose={() => setCreating(false)} title="Add driver" className="sm:max-w-3xl">
        <DriverForm
          mode="create"
          onSubmit={async () => {
            throw new Error("Preview only — nothing is saved.");
          }}
          onSaveDraft={async () => {
            throw new Error("Preview only — the draft would be saved as an unfinished signup.");
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </main>
  );
}
