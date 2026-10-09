/** "LKR 1,250.00" */
export function formatLkr(value: number | string): string {
  return `LKR ${Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
}

/** "8 Oct 2026", or "—" for a missing date. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-LK", { dateStyle: "medium" });
}

/** "8 Oct 2026, 6:30 pm" */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });
}

/** A driver's name, or "Driver #12" when the account has none. */
export function driverLabel(name: string | null | undefined, driverId: number): string {
  return name?.trim() || `Driver #${driverId}`;
}
