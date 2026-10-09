// Rules the driver form applies before anything is sent. Pure — no React, no requests.
// The dashboard (uparima-classified-dashbord/lib/driver-form-rules.ts) has the same file.

import type { DriverFormValues } from "@/types/driver";

/** The backend's rule for a standard licence card: one capital letter, then digits (B1234567). */
const LICENSE_NUMBER = /^[A-Z]\d+$/;

/**
 * A licence number as it should be stored. On a standard card that is capitals and digits only,
 * so "b 1234567" and "B-1234567" (as typed, or as read off a photo) become "B1234567". A temporary
 * licence's permit number has no fixed shape and is only trimmed.
 */
export function normalizeLicenseNumber(value: string, isTemporary: boolean): string {
  return isTemporary ? value.trim() : value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** What is wrong with a licence number, in words for the person filling the form; null when fine. */
export function licenseNumberProblem(value: string, isTemporary: boolean): string | null {
  if (isTemporary || value.trim() === "") return null; // "required" is the form's own check
  return LICENSE_NUMBER.test(value)
    ? null
    : "A licence number is one letter followed by digits, like B1234567. For a temporary licence, switch on “Temporary Driving Licence” in the Documents step.";
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
