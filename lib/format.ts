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

/** "Just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export function timeAgo(value: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(value);
}

/** "NP" for "Nimal Perera"; "?" when there's no name. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** A driver's name, or "Driver #12" when the account has none. */
export function driverLabel(name: string | null | undefined, driverId: number): string {
  return name?.trim() || `Driver #${driverId}`;
}
