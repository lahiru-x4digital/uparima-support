import { cn } from "@/lib/utils";
import type { SosStatus } from "@/types/sos";

const TONES: Record<SosStatus, string> = {
  open: "bg-red-600 text-white",
  acknowledged: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
};

const LABELS: Record<SosStatus, string> = {
  open: "Open",
  acknowledged: "Responding",
  resolved: "Resolved",
  cancelled: "Cancelled by user",
};

export function SosStatusBadge({ status }: { status: SosStatus }) {
  return (
    <span
      className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", TONES[status] ?? TONES.cancelled)}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
