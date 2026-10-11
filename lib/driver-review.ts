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
