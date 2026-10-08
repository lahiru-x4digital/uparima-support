import type { ReactNode } from "react";

/** Label on the left, value on the right, one row per entry — the body of the detail-page cards. */
export function DetailList({ rows }: { rows: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
