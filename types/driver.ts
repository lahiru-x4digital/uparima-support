import type { TicketCall } from "./ticket-call";

// "incomplete": a signup that was started but never submitted (e.g. WhatsApp "Drive").
export type DriverStatus = "incomplete" | "pending" | "approved" | "rejected" | "suspended" | "deleted";

export type VehicleLookup = { id: number; name: string };

export type Driver = {
  id: number;
  userId: number;
  phone: string | null;

  firstName: string | null;
  lastName: string | null;
  // Optional, driver-picked subset of firstName/lastName's words — shown to
  // riders and on the driver's own profile instead of the legal name when
  // set. See the backend's RidesDriver.preferredDisplayName.
  preferredDisplayName: string | null;
  nicNumber: string | null;
  profilePictureS3Key: string | null;
  referralCode: string | null;

  addressLine1: string | null;
  addressLine2: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  email: string | null;
  secondaryMobile: string | null;

  ownsVehicle: boolean;
  vehicleTypeId: number | null;
  vehicleMakeId: number | null;
  vehicleModelId: number | null;
  vehicleYom: number | null;
  vehicleColor: string | null;
  vehicleRegistrationNumber: string | null;

  // True if the driver currently holds the Department of Motor Traffic's
  // temporary permit (Section 126(4)) rather than the standard printed card
  // — see the backend's RidesDriver.isTemporaryLicense doc comment. When
  // true, licenseNumber holds the permit/certificate number (not the
  // standard card's letter-prefix format) and licenseFrontS3Key holds a
  // photo of the certificate's main page. licenseBackS3Key is optional here
  // and often empty — the permit is one page, but drivers who fold and
  // laminate theirs do have a real second side, which is captured and read
  // just like the main page when they supply it.
  isTemporaryLicense: boolean;
  licenseNumber: string | null;
  licenseFrontS3Key: string | null;
  licenseBackS3Key: string | null;
  licenseExpiryDate: string | null;

  insurancePolicyNumber: string | null;
  insuranceCardFrontS3Key: string | null;
  insuranceExpiryDate: string | null;

  revenueLicenseImageS3Key: string | null;
  revenueLicenseExpiryDate: string | null;
  vehicleFrontS3Key: string | null;

  // Populated by AI validation (background, at registration/resubmission,
  // or an admin's manual "AI Validate") — see the backend's
  // DriverReviewService/AiValidationService. reviewValid is null until the
  // first review completes. reviewIssues holds one human-readable string
  // per problem found across all documents (mismatch, blurry, wrong
  // document, expired, etc.), regardless of reviewValid.
  reviewValid: boolean | null;
  reviewIssues: string[] | null;
  reviewSummary: string | null;

  // Computed by the backend on every /rides/admin/drivers* response (not a
  // stored column) — human-readable labels for the two things
  // registration can skip when an admin turns on the "Bypass Document
  // Validation" setting (Rides -> System Settings): the required vehicle
  // photo and a license number. Empty when the driver has both.
  missingDocuments: string[];
  // Also computed by the backend: the required details an unfinished signup
  // (status "incomplete") still lacks before it can be reviewed. Empty for
  // every other status. Absent on a response from an older backend.
  missingFields?: string[];
  // Computed too: documents past their saved expiry date, as labels — "insurance (expired
  // 2026-09-25)". Absent on a response from an older backend.
  expiredDocuments?: string[];
  // The latest AI document check (RidesDriver.lastAiCheckAt): kept even when it failed on an approved
  // driver, whose reviewValid stays as it was so a possible false positive doesn't knock them
  // offline. Null until one runs.
  lastAiCheckAt?: string | null;
  lastAiCheckValid?: boolean | null;
  lastAiCheckSummary?: string | null;
  lastAiCheckIssues?: string[] | null;
  // How support staff have reached the driver (list endpoint only), manual work only — bot
  // messages don't count: "call" for a logged call, otherwise the channel of a ticket an agent
  // replied on ("whatsapp", "email", "app"). `agents` is who did it. Empty methods = not contacted.
  contact?: {
    methods: string[];
    agents: Array<{ id: number; name: string | null }>;
    lastContactedAt: string | null;
  };
  // The driver's open support ticket (list endpoint only): null = no open ticket; assignedAgent
  // null = open but nobody has it yet.
  supportTicket?: DriverSupportTicket | null;

  status: DriverStatus;
  creditBalance: number;
  // Platform fees collected from riders: still owed to the company, and the
  // lifetime total. Decimal columns, so they arrive as strings.
  platformFeeOwedLkr?: number | string;
  platformFeeTotalLkr?: number | string;
  averageRating: number | null;
  totalRides: number;
  isOnline: boolean;
  // Admin-only dispatch isolation switch (set from this dashboard, never
  // self-service in the driver app) — see the backend's RidesDriver.
  // isTestDriver doc comment. A test driver is NEVER offered a real
  // rider's ride, and vice versa.
  isTestDriver: boolean;
  createdAt: string;
  updatedAt: string;
};

/** A driver's open support ticket, as the Drivers list carries it. Calls are oldest first. */
export type DriverSupportTicket = {
  id: string;
  ticketNumber: string;
  assignedAgent: { id: number; name: string | null } | null;
  calls: Omit<TicketCall, "ticketId">[];
};

export type DriverDocumentKey =
  | "profilePicture"
  | "licenseFront"
  | "licenseBack"
  | "insuranceCardFront"
  | "revenueLicenseImage"
  | "vehicleFront";

export type DriverBankAccount = {
  id: number;
  driverId: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
};

export type DriverDetail = {
  driver: Driver;
  vehicleMakeName: string | null;
  vehicleModelName: string | null;
  document_urls: Partial<Record<DriverDocumentKey, string>>;
  transactions: Array<{
    id: number;
    type: string;
    credits: number;
    onepayReference?: string;
    createdAt: string;
  }>;
  bankAccount: DriverBankAccount | null;
};

export type DriverFormValues = {
  phone: string;
  firstName: string;
  lastName: string;
  preferredDisplayName: string;
  nicNumber: string;
  referralCode: string;

  addressLine1: string;
  addressLine2: string;
  province: string;
  district: string;
  city: string;
  email: string;
  secondaryMobile: string;

  ownsVehicle: boolean;
  vehicleTypeId: string;
  vehicleMakeId: string;
  vehicleModelId: string;
  vehicleYom: string;
  vehicleColor: string;
  vehicleRegistrationNumber: string;

  isTemporaryLicense: boolean;
  licenseNumber: string;
  licenseExpiryDate: string;

  insurancePolicyNumber: string;
  insuranceExpiryDate: string;

  revenueLicenseExpiryDate: string;

  // The driver's payout account (DriverDetail.bankAccount) — optional, but
  // bank, holder and number go together. All empty leaves it unchanged.
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
};

/**
 * A model typed in the Model box that isn't in the list is kept in `vehicleModelId` as
 * `new:<Name>` and sent as `vehicleModelName` — the backend reuses a model of that name under the
 * chosen type + make (any letter case) or creates it.
 */
export const NEW_VEHICLE_MODEL_PREFIX = "new:";

export const newVehicleModelName = (vehicleModelId: string): string | null =>
  vehicleModelId.startsWith(NEW_VEHICLE_MODEL_PREFIX) ? vehicleModelId.slice(NEW_VEHICLE_MODEL_PREFIX.length) : null;

/** "corolla axio" → "Corolla Axio". Only first letters are raised; the rest stays as typed ("CR-V"). */
export function capitalizeModelName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export const EMPTY_DRIVER_FORM: DriverFormValues = {
  phone: "",
  firstName: "",
  lastName: "",
  preferredDisplayName: "",
  nicNumber: "",
  referralCode: "",

  addressLine1: "",
  addressLine2: "",
  province: "",
  district: "",
  city: "",
  email: "",
  secondaryMobile: "",

  ownsVehicle: true,
  vehicleTypeId: "",
  vehicleMakeId: "",
  vehicleModelId: "",
  vehicleYom: "",
  vehicleColor: "",
  vehicleRegistrationNumber: "",

  isTemporaryLicense: false,
  licenseNumber: "",
  licenseExpiryDate: "",

  insurancePolicyNumber: "",
  insuranceExpiryDate: "",

  revenueLicenseExpiryDate: "",

  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankBranch: "",
};

export type DriverFormFiles = Partial<Record<DriverDocumentKey, File>>;

export function driverToFormValues(d: Driver, bankAccount?: DriverBankAccount | null): DriverFormValues {
  return {
    phone: d.phone ?? "",
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    preferredDisplayName: d.preferredDisplayName ?? "",
    nicNumber: d.nicNumber ?? "",
    referralCode: d.referralCode ?? "",

    addressLine1: d.addressLine1 ?? "",
    addressLine2: d.addressLine2 ?? "",
    province: d.province ?? "",
    district: d.district ?? "",
    city: d.city ?? "",
    email: d.email ?? "",
    secondaryMobile: d.secondaryMobile ?? "",

    ownsVehicle: d.ownsVehicle,
    vehicleTypeId: d.vehicleTypeId != null ? String(d.vehicleTypeId) : "",
    vehicleMakeId: d.vehicleMakeId != null ? String(d.vehicleMakeId) : "",
    vehicleModelId: d.vehicleModelId != null ? String(d.vehicleModelId) : "",
    vehicleYom: d.vehicleYom != null ? String(d.vehicleYom) : "",
    vehicleColor: d.vehicleColor ?? "",
    vehicleRegistrationNumber: d.vehicleRegistrationNumber ?? "",

    isTemporaryLicense: d.isTemporaryLicense,
    licenseNumber: d.licenseNumber ?? "",
    licenseExpiryDate: d.licenseExpiryDate ?? "",

    insurancePolicyNumber: d.insurancePolicyNumber ?? "",
    insuranceExpiryDate: d.insuranceExpiryDate ?? "",

    revenueLicenseExpiryDate: d.revenueLicenseExpiryDate ?? "",

    bankName: bankAccount?.bankName ?? "",
    bankAccountName: bankAccount?.accountName ?? "",
    bankAccountNumber: bankAccount?.accountNumber ?? "",
    bankBranch: bankAccount?.branchName ?? "",
  };
}

// ── Payloads of the driver endpoints (`/support-desk/drivers/*`) ─────────────

/**
 * One of a driver's documents that matches a document already on file under another driver — the
 * detail behind the "possible reused/shared document" warning. Mirrors
 * RidesAdminService.getDriverDuplicateDocuments in uparima-backend.
 */
export type DuplicateDocumentMatch = {
  slot: string;
  documentType: string;
  label: string;
  /** "shared-number": both carry the same document number. "unreadable-number": near-identical images, number unreadable. */
  reason: "shared-number" | "unreadable-number";
  /** How different the two images are (0 = identical); lower is a closer match. */
  distance: number;
  sharedIdentifiers: string[];
  otherDriver: {
    id: number;
    name: string | null;
    phone: string | null;
    nicNumber: string | null;
    status: string;
  };
  ownImageUrl: string | null;
  otherImageUrl: string;
};

/** Add Driver's response: the new driver plus its AI review (null when the review couldn't start). */
export type CreatedDriver = Driver & { aiValidation: AiValidationResult | null };

export type AiValidationResult = {
  valid: boolean;
  issues: string[];
  summary: string;
  approved: boolean;
  // Set when the driver's license number was blank and AI Validate read it
  // off the license photo and saved it.
  filledLicenseNumber?: string | null;
};

// Mirrors the backend's DocumentExtractionResult (ai-validation.service.ts).
export type DocumentExtractionResult = {
  readable: boolean;
  issues: string[];
  fields: Record<string, string | null>;
  suspectedSynthetic?: boolean;
  syntheticReason?: string | null;
};

export type SubscriptionPeriod = {
  id: number;
  source: string;
  status: string;
  isFree: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  remainingDays: number;
};

export type DriverSubscriptionInfo = {
  current: SubscriptionPeriod | null;
  upcoming: SubscriptionPeriod[];
  history: SubscriptionPeriod[];
};

export type AdjustSubscriptionBody =
  | { mode: "set_date"; expiresAt: string; reason: string }
  | { mode: "adjust_days"; days: number; reason: string };

// The OS permission statuses a driver's app last reported — one snapshot per
// driver, overwritten on every report. Null for a driver who has never
// reported, i.e. an app build older than the feature.
export type DriverDevicePermissions = {
  // Permission key -> status, e.g. { location: "whileInUse" }. An open map: a
  // newer app build can report a key this portal predates, and the card still
  // shows it.
  permissions: Record<string, string>;
  platform: string | null;
  appVersion: string | null;
  osVersion: string | null;
  deviceManufacturer: string | null;
  deviceModel: string | null;
  updatedAt: string;
};

export type DriverTermsStatus = {
  // Whether drivers are being asked at all right now (the switch).
  enabled: boolean;
  // Null while no driver terms have been published.
  currentVersion: number | null;
  acceptedCurrent: boolean;
  lastAccepted: {
    version: number;
    acceptedAt: string;
    language: string;
    source: string;
    appVersion: string | null;
    platform: string | null;
  } | null;
};
