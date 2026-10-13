import { TonePill } from "@/components/shared/status-badge";
import { expiryStatus, formatDriverDate } from "@/lib/driver-review";

/** An expiry date with a chip when it's past or close, so a lapsed document stands out at a glance. */
export function ExpiryValue({ date }: { date: string | null | undefined }) {
  const { status, days } = expiryStatus(date);
  if (status === "missing") return <span className="text-amber-700 dark:text-amber-400">Not set</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {formatDriverDate(date)}
      {status === "expired" && <TonePill tone="red">Expired</TonePill>}
      {status === "soon" && <TonePill tone="amber">{days === 0 ? "Expires today" : `${days}d left`}</TonePill>}
    </span>
  );
}
