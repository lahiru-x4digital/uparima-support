import { cn } from "@/lib/utils";

type Tone = "green" | "red" | "amber" | "neutral";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
};

const STATUS_TONE: Record<string, Tone> = {
  approved: "green",
  active: "green",
  paid: "green",
  pending: "amber",
  rejected: "red",
  suspended: "red",
  failed: "red",
  deleted: "neutral",
  inactive: "neutral",
};

/** A coloured pill for a status string; unknown values fall back to neutral. */
export function StatusBadge({ value, label }: { value: string | null | undefined; label?: string }) {
  const tone = STATUS_TONE[(value ?? "").toLowerCase()] ?? "neutral";
  const text = label ?? (value ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {text}
    </span>
  );
}

/** A pill with an explicit tone, for flags that aren't a status string (online, incomplete, ...). */
export function TonePill({
  tone,
  children,
  title,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
