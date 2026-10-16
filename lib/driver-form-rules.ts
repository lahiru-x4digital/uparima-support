// Rules the driver form applies before anything is sent. Pure — no React, no requests.
// The dashboard (uparima-classified-dashbord/lib/driver-form-rules.ts) has the same file.

import type { DriverFormValues } from "@/types/driver";

/**
 * A licence number as it should be stored. The Support Portal takes any number as written (no
 * letter + digits format check — the backend's support-desk endpoints don't apply one either), so
 * this only trims, e.g. a number read off a photo.
 */
export function normalizeLicenseNumber(value: string): string {
  return value.trim();
}

// Fields the backend reads as a set: sending one without the others is refused or misjudged.
const TOGETHER: (keyof DriverFormValues)[][] = [
  // A payout account needs bank, holder and number at once.
  ["bankName", "bankAccountName", "bankAccountNumber", "bankBranch"],
  // The licence number is checked against the kind of licence it belongs to.
  ["licenseNumber", "isTemporaryLicense"],
];

/**
 * What an edit actually changed — the only fields worth sending.
 *
 * Sending the whole form back made the backend re-check values nobody touched: a driver whose
 * stored licence number predates today's format could not have a document replaced, because the
 * old number was re-submitted and refused. Untouched fields now stay out of the request.
 */
export function changedDriverFields(
  initial: DriverFormValues,
  values: DriverFormValues,
): Partial<DriverFormValues> {
  const changed = new Set<keyof DriverFormValues>();
  for (const key of Object.keys(values) as (keyof DriverFormValues)[]) {
    if (values[key] !== initial[key]) changed.add(key);
  }
  for (const group of TOGETHER) {
    if (group.some((key) => changed.has(key))) group.forEach((key) => changed.add(key));
  }
  return Object.fromEntries([...changed].map((key) => [key, values[key]])) as Partial<DriverFormValues>;
}

/** The edit form's sections, in the same groups (and order) as the driver details cards. */
export type DriverSectionKey = "personal" | "address" | "vehicle" | "license" | "insurance" | "revenue" | "bank";

export const DRIVER_SECTIONS: { key: DriverSectionKey; title: string }[] = [
  { key: "personal", title: "Personal & Contact" },
  { key: "address", title: "Address" },
  { key: "vehicle", title: "Vehicle" },
  { key: "license", title: "Licence" },
  { key: "insurance", title: "Insurance" },
  { key: "revenue", title: "Revenue Licence" },
  { key: "bank", title: "Bank Account" },
];

export function isDriverSectionKey(value: string | null | undefined): value is DriverSectionKey {
  return DRIVER_SECTIONS.some((s) => s.key === value);
}

/** Required for review, per section — the backend's REQUIRED_APPLICATION_FIELDS plus the mobile number. */
export const REQUIRED_BY_SECTION: Record<DriverSectionKey, (keyof DriverFormValues)[]> = {
  personal: ["phone", "firstName", "lastName", "nicNumber"],
  address: ["addressLine1", "province", "district", "city"],
  vehicle: ["vehicleTypeId", "vehicleMakeId", "vehicleModelId", "vehicleYom", "vehicleColor", "vehicleRegistrationNumber"],
  license: ["licenseNumber", "licenseExpiryDate"],
  insurance: ["insurancePolicyNumber", "insuranceExpiryDate"],
  revenue: ["revenueLicenseExpiryDate"],
  bank: [],
};

const BANK_REQUIRED: (keyof DriverFormValues)[] = ["bankName", "bankAccountName", "bankAccountNumber"];

export const FIELD_LABELS: Record<keyof DriverFormValues, string> = {
  phone: "Mobile number",
  firstName: "First name",
  lastName: "Last name",
  preferredDisplayName: "Display name",
  nicNumber: "NIC number",
  referralCode: "Referral code",
  addressLine1: "Address line 1",
  addressLine2: "Address line 2",
  province: "Province",
  district: "District",
  city: "City",
  email: "Email",
  secondaryMobile: "Secondary mobile",
  ownsVehicle: "Owns vehicle",
  vehicleTypeId: "Vehicle type",
  vehicleMakeId: "Make",
  vehicleModelId: "Model",
  vehicleYom: "Year",
  vehicleColor: "Colour",
  vehicleRegistrationNumber: "Registration number",
  isTemporaryLicense: "Temporary licence",
  licenseNumber: "Licence number",
  licenseExpiryDate: "Licence expiry",
  insurancePolicyNumber: "Insurance policy number",
  insuranceExpiryDate: "Insurance expiry",
  revenueLicenseExpiryDate: "Revenue licence expiry",
  bankName: "Bank name",
  bankAccountName: "Account holder",
  bankAccountNumber: "Account number",
  bankBranch: "Branch",
};

const SECTION_OF_FIELD = new Map<keyof DriverFormValues, DriverSectionKey>();
for (const [section, fields] of Object.entries(REQUIRED_BY_SECTION) as [DriverSectionKey, (keyof DriverFormValues)[]][]) {
  fields.forEach((f) => SECTION_OF_FIELD.set(f, section));
}
(["preferredDisplayName", "referralCode", "email", "secondaryMobile"] as const).forEach((f) => SECTION_OF_FIELD.set(f, "personal"));
SECTION_OF_FIELD.set("addressLine2", "address");
SECTION_OF_FIELD.set("ownsVehicle", "vehicle");
SECTION_OF_FIELD.set("isTemporaryLicense", "license");
(["bankName", "bankAccountName", "bankAccountNumber", "bankBranch"] as const).forEach((f) => SECTION_OF_FIELD.set(f, "bank"));

export function sectionOfField(field: keyof DriverFormValues): DriverSectionKey {
  return SECTION_OF_FIELD.get(field) ?? "personal";
}

const isBlank = (v: DriverFormValues[keyof DriverFormValues]) => String(v ?? "").trim() === "";

/**
 * Required fields still empty. The mobile number is skipped on an edit — it comes from the
 * driver's account and can't be changed in the form, so flagging it would only be noise.
 */
export function missingRequiredFields(values: DriverFormValues, mode: "create" | "edit"): (keyof DriverFormValues)[] {
  return Object.values(REQUIRED_BY_SECTION)
    .flat()
    .filter((f) => !(mode === "edit" && f === "phone") && isBlank(values[f]));
}

export type FieldProblems = Partial<Record<keyof DriverFormValues, string>>;

/** Bank details are optional but never half-filled; the backend refuses a partial account too. */
export function bankProblems(values: DriverFormValues): FieldProblems {
  const started = (["bankName", "bankAccountName", "bankAccountNumber", "bankBranch"] as const).some((f) => !isBlank(values[f]));
  if (!started) return {};
  return Object.fromEntries(
    BANK_REQUIRED.filter((f) => isBlank(values[f])).map((f) => [f, "Needed with the other bank details"]),
  );
}

/**
 * What stops an edit from being saved. A required field that is merely still empty does not —
 * a partial save is how an unfinished signup gets completed bit by bit, and the backend moves it
 * to Pending on the save that fills the last gap. Clearing a field that had a value does block:
 * an empty value is never sent, so the save would quietly keep the old one.
 */
export function editBlockingProblems(initial: DriverFormValues, values: DriverFormValues): FieldProblems {
  const problems: FieldProblems = { ...bankProblems(values) };
  for (const field of Object.values(REQUIRED_BY_SECTION).flat()) {
    if (!isBlank(initial[field]) && isBlank(values[field])) problems[field] = "Required — can't be cleared";
  }
  return problems;
}
