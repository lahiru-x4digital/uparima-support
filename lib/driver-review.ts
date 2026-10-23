// When a driver application can be decided on. Pure — no React, no requests.
// The admin dashboard (uparima-classified-dashbord/lib/driver-review.ts) has the same file.

import type { Driver } from "@/types/driver";

type Reviewed = Pick<Driver, "status" | "missingFields" | "missingDocuments" | "reviewValid">;

/**
 * What an unfinished signup (status "incomplete", e.g. started on WhatsApp) still needs before it
 * can be reviewed. Null when it isn't one, or when the backend didn't say — nothing is assumed
 * about a signup whose gaps are unknown.
 */
export function signupGaps(driver: Reviewed): string[] | null {
  return driver.status === "incomplete" && Array.isArray(driver.missingFields) ? driver.missingFields : null;
}

/**
 * An unfinished signup with every required detail filled in. The backend moves a signup to
 * Pending on the save that completes it; this covers one that was filled in before it did.
 */
export function signupReadyForReview(driver: Reviewed): boolean {
  return signupGaps(driver)?.length === 0;
}

/** Approve is offered: waiting for a decision, rejected and being reconsidered, or a finished signup. */
export function canApproveApplication(driver: Reviewed): boolean {
  return driver.status === "pending" || driver.status === "rejected" || signupReadyForReview(driver);
}

/**
 * AI Validate is offered wherever Approve is, and for an approved driver with something to clear:
 * a flagged review (a pass lets them go online again) or a missing licence number (read off the
 * licence photo) — see the backend's RidesAdminService.validateDriverWithAi.
 */
export function canAiValidateDriver(driver: Reviewed): boolean {
  return (
    canApproveApplication(driver) ||
    (driver.status === "approved" && (driver.reviewValid === false || (driver.missingDocuments ?? []).length > 0))
  );
}

export type ExpiryStatus = "missing" | "expired" | "soon" | "ok";

/** Days counted from the start of today, so a document expiring today is "soon", not expired. */
export const EXPIRY_SOON_DAYS = 30;

/** Whether a document's expiry date is past, close, or fine. `date` is "YYYY-MM-DD" or an ISO timestamp. */
export function expiryStatus(date: string | null | undefined, now: Date = new Date()): { status: ExpiryStatus; days: number | null } {
  if (!date) return { status: "missing", days: null };
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  if (Number.isNaN(parsed.getTime())) return { status: "missing", days: null };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { status: "expired", days };
  if (days <= EXPIRY_SOON_DAYS) return { status: "soon", days };
  return { status: "ok", days };
}

/** One unambiguous date format for every driver view: "13 Oct 2026". */
export function formatDriverDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The issue a review records when the AI service itself couldn't run — the backend's
 * AUTOMATED_REVIEW_UNAVAILABLE_ISSUE (uparima-backend/src/modules/rides/drivers/desk-approval-policy.ts).
 */
export const AUTOMATED_REVIEW_UNAVAILABLE_ISSUE =
  "Automated review is temporarily unavailable — a staff member will review this application.";

/**
 * Why support staff can't approve this driver by hand, or null when they can — the backend's
 * deskApprovalBlocker, which refuses the request too. They approve only what the AI review passed,
 * or by hand when the AI couldn't run at all. Admins aren't bound by it.
 */
export function deskApprovalBlocker(driver: Pick<Driver, "reviewValid" | "reviewIssues">): string | null {
  if (driver.reviewValid === true) return null;
  const issues = driver.reviewIssues ?? [];
  if (driver.reviewValid === null || driver.reviewValid === undefined) {
    return "Run AI Validate first — a driver is approved only after their documents have been checked.";
  }
  if (issues.length > 0 && issues.every((i) => i === AUTOMATED_REVIEW_UNAVAILABLE_ISSUE)) return null;
  return "The AI review found problems with this driver's documents, so it can't be approved here. Fix them and run AI Validate again, or ask an admin.";
}
