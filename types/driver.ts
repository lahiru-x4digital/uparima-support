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
