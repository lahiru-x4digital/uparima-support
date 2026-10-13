"use client";

import { useMyRouting, useSetPresence } from "@/lib/hooks/use-presence";
import { cn } from "@/lib/utils";
import type { Presence, Shift } from "@/types/routing";

const OPTIONS: { value: Presence; label: string; dot: string; hint: string }[] = [
  { value: "online", label: "Online", dot: "bg-emerald-400", hint: "You get new tickets" },
  { value: "away", label: "Away", dot: "bg-amber-400", hint: "No new tickets for now" },
  { value: "offline", label: "Offline", dot: "bg-sidebar-foreground/40", hint: "No new tickets" },
];

const NEXT: Record<Presence, Presence> = { online: "away", away: "offline", offline: "online" };

const shiftText = (shifts: Shift[]) =>
  shifts.length ? shifts.map((s) => `${s.startTime}–${s.endTime}`).join(", ") : "No shift today";

const skillLabel = (key: string) => {
  const text = key.replace(/^uparima_/, "").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** My Online / Away / Offline switch, with today's shift and open load. Only Online agents are routed tickets. */
export function PresenceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { data } = useMyRouting();
  const setPresence = useSetPresence();
  if (!data) return null;

  const current = OPTIONS.find((o) => o.value === data.presence) ?? OPTIONS[2];
  const outOfShift = data.presence === "online" && !data.inShift;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setPresence.mutate(NEXT[data.presence])}
        title={`${current.label}: ${current.hint}. Click to switch to ${NEXT[data.presence]}.`}
        aria-label={`Status: ${current.label}`}
        className="mx-auto mb-1 flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-foreground/10"
      >
        <span className={cn("size-3 rounded-full ring-2 ring-sidebar-foreground/30", current.dot, outOfShift && "ring-amber-300")} />
      </button>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-xl bg-sidebar-foreground/10 p-2 text-xs ring-1 ring-sidebar-foreground/15">
      <div className="flex rounded-lg bg-sidebar-foreground/10 p-0.5" role="radiogroup" aria-label="Your status">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={data.presence === o.value}
            title={o.hint}
            disabled={setPresence.isPending}
            onClick={() => data.presence !== o.value && setPresence.mutate(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 font-medium transition-colors",
              data.presence === o.value
                ? "bg-sidebar-foreground/25 text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", o.dot)} />
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-2 space-y-1 px-0.5 text-sidebar-foreground/75">
        <p className="flex justify-between gap-2">
          <span title="Your shift today (Sri Lanka time)">{shiftText(data.todayShifts)}</span>
          <span className="shrink-0 font-medium text-sidebar-foreground">{data.openLoad} open</span>
        </p>
        {outOfShift && (
          <p className="rounded-md bg-amber-400/20 px-1.5 py-1 text-amber-100">
            Outside your shift: you only get tickets nobody on shift can take.
          </p>
        )}
        {!data.routingEnabled && (
          <p className="rounded-md bg-sidebar-foreground/10 px-1.5 py-1">You don&apos;t receive tickets automatically yet. Ask an admin to turn it on.</p>
        )}
        {(data.languages.length > 0 || data.skills.length > 0) && (
          <p className="truncate" title={[...data.languages.map((l) => l.toUpperCase()), ...data.skills.map(skillLabel)].join(", ")}>
            {data.languages.map((l) => l.toUpperCase()).join(" · ")}
            {data.languages.length > 0 && data.skills.length > 0 && " — "}
            {data.skills.map(skillLabel).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
