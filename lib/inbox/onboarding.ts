// The inbox's "To onboard" view: chats from drivers who haven't finished onboarding, plus numbers
// we have no record of. Mirrors the backend's ONBOARDING_DRIVER_STATUSES (driver-application.ts),
// which does the real filtering for lists; this is for rows already in the browser.

/** Statuses of drivers still onboarding. Approved and suspended drivers (approved once) are done. */
export const ONBOARDING_DRIVER_STATUSES: readonly string[] = ["incomplete", "pending", "rejected", "deleted"];

/**
 * Whether a chat belongs under "To onboard". A driver counts by their status; with no driver
 * behind it, only a sender we know nothing about does (an existing rider or business doesn't).
 */
export function isToOnboard(driverStatus: string | null | undefined, unknownNumber: boolean): boolean {
  return driverStatus ? ONBOARDING_DRIVER_STATUSES.includes(driverStatus) : unknownNumber;
}
