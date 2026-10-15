"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, Clock, Inbox, Timer, UserCheck } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useMyApprovals, useMyCompletedTickets, useMyPerformance } from "@/lib/hooks/use-my-performance";
import { cn } from "@/lib/utils";
import type { ApprovalInvolvement, TimingStats } from "@/types/performance";

// Business days are Sri Lanka calendar days, the same as the backend's reports.
const TZ = "Asia/Colombo";
const colomboDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const daysAgo = (n: number) => colomboDay(new Date(Date.now() - n * 86_400_000));

const PERIODS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "Last 7 days", days: 6 },
  { key: "30d", label: "Last 30 days", days: 29 },
] as const;

function duration(sec: number | null | undefined) {
  if (sec == null) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

const hours = (sec: number) => `${(sec / 3600).toFixed(1)}h`;
const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);

/** How a count compares with the period before. `lowerIsBetter` flips the colour for things like reopened. */
function Delta({ now, before, lowerIsBetter }: { now: number; before: number | null | undefined; lowerIsBetter?: boolean }) {
  if (before == null || before === now) return null;
  const up = now > before;
  const good = lowerIsBetter ? !up : up;
  return (
    <span className={cn("text-xs font-medium", good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      {up ? "▲" : "▼"} {Math.abs(now - before)} vs before
    </span>
  );
}

function Stat({ label, value, hint, alert }: { label: string; value: ReactNode; hint?: ReactNode; alert?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-bold", alert && "text-red-600 dark:text-red-400")}>{value}</span>
      {hint}
    </div>
  );
}

const note = (text: ReactNode) => <span className="text-xs text-muted-foreground">{text}</span>;

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Inbox; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">{children}</div>
    </section>
  );
}

const timingHint = (t: TimingStats) =>
  note(`${t.count} ticket${t.count === 1 ? "" : "s"} · median ${duration(t.medianSec)}`);

const INVOLVEMENT: Record<ApprovalInvolvement, { label: string; tone: "green" | "amber" | "neutral" }> = {
  approve: { label: "Approved it", tone: "green" },
  call: { label: "Called", tone: "amber" },
  reply: { label: "Replied", tone: "neutral" },
};
const APPROVED_HOW: Record<string, string> = {
  manual: "Manual",
  auto: "Automatic",
  ai_validate: "AI check",
  admin_create: "Added by admin",
};
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }) : "—";

const TH = "px-3 py-2 text-left text-xs font-semibold text-muted-foreground";
const TD = "px-3 py-2 align-top";
const APPROVALS_CAP = 200;

/** Drivers approved in the period that I took part in — pressed approve, called, or replied before it. */
function ApprovalsSection({ from, to }: { from: string; to: string }) {
  const canSeeDriver = useCan("driver.view");
  const { data, isLoading, error } = useMyApprovals(from, to);
  const rows = data?.data ?? [];
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <UserCheck className="size-4 text-muted-foreground" /> Drivers approved with my involvement
        {data && (
          <span className="font-normal text-muted-foreground">
            ({rows.filter((r) => r.role === "lead").length} credit · {rows.filter((r) => r.role === "assist").length} assist)
          </span>
        )}
      </h2>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        Drivers I pressed approve for, or called or replied to in the {data?.windowDays ?? 14} days before they were approved. Each driver counts once as credit for one agent; the others are assists.
      </p>
      {error && !data ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No approvals in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className={TH}>Driver</th>
                <th className={TH}>My part</th>
                <th className={TH}>Approved</th>
                <th className={TH}>How</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.approvalId} className="border-b last:border-0">
                  <td className={TD}>
                    {canSeeDriver ? (
                      <Link href={`/drivers/${r.driverId}`} className="font-medium text-primary hover:underline">
                        {r.driver ?? `Driver #${r.driverId}`}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.driver ?? `Driver #${r.driverId}`}</span>
                    )}
                    {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                  </td>
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1">
                      <TonePill tone={r.role === "lead" ? "green" : "neutral"}>{r.role === "lead" ? "Credit" : "Assist"}</TonePill>
                      {r.involvement.map((k) => (
                        <TonePill key={k} tone={INVOLVEMENT[k]?.tone ?? "neutral"}>
                          {INVOLVEMENT[k]?.label ?? k}
                        </TonePill>
                      ))}
                    </div>
                  </td>
                  <td className={cn(TD, "whitespace-nowrap")}>{when(r.approvedAt)}</td>
                  <td className={TD}>
                    {APPROVED_HOW[r.approvedHow ?? ""] ?? r.approvedHow ?? "—"}
                    {r.approvedBy && <div className="text-xs text-muted-foreground">by {r.approvedBy}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length >= APPROVALS_CAP && (
            <p className="mt-2 text-xs text-muted-foreground">Showing the latest {APPROVALS_CAP} — pick a shorter period to see the rest.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Tickets I completed in the period. */
function CompletedSection({ from, to }: { from: string; to: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMyCompletedTickets(from, to, page);
  const rows = data?.data ?? [];
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="size-4 text-muted-foreground" /> Tickets I completed
        {data && <span className="font-normal text-muted-foreground">({data.meta.total})</span>}
      </h2>
      {error && !data ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed tickets in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className={TH}>Ticket</th>
                <th className={TH}>Subject</th>
                <th className={TH}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className={cn(TD, "whitespace-nowrap")}>
                    <Link href={`/inbox?ticket=${t.id}`} className="font-medium text-primary hover:underline">
                      {t.ticketNumber}
                    </Link>
                  </td>
                  <td className={cn(TD, "max-w-md truncate")} title={t.subject}>
                    {t.subject}
                  </td>
                  <td className={cn(TD, "whitespace-nowrap")}>{when(t.eventAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </section>
  );
}

/** The signed-in agent's own performance: what they hold, how fast they answer, what they did, when they were on. */
export function MyPerformance() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("7d");
  const days = PERIODS.find((p) => p.key === period)!.days;
  const from = daysAgo(days);
  const to = daysAgo(0);
  const { data, isLoading, error } = useMyPerformance(from, to);
  // Same query as the approvals list below, so this costs no extra request.
  const approvals = useMyApprovals(from, to).data?.data;
  const credited = approvals?.filter((r) => r.role === "lead").length;
  const assisted = approvals?.filter((r) => r.role === "assist").length;

  const a = data?.agent;
  const prev = data?.previous;

  return (
    <PageShell
      title="My Performance"
      description="Your own numbers — nobody else's."
      actions={
        <div className="flex gap-1 rounded-full border bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                period === p.key ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      {error && !data ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : isLoading || !a ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <Section title="Tickets" icon={Inbox}>
            <Stat label="Open now" value={a.workload.open} hint={note(`${a.workload.pending} pending · ${a.workload.inReview} in review`)} />
            <Stat label="Overdue now" value={a.workload.overdue} alert={a.workload.overdue > 0} hint={note("no first reply by the deadline")} />
            <Stat label="Not opened yet" value={a.workload.notOpened} alert={a.workload.notOpened > 0} />
            <Stat label="Assigned" value={a.workload.assigned} hint={<Delta now={a.workload.assigned} before={prev?.workload.assigned} />} />
            <Stat label="Completed" value={a.workload.completed} hint={<Delta now={a.workload.completed} before={prev?.workload.completed} />} />
            <Stat
              label="Drivers approved"
              value={credited ?? "—"}
              hint={note(assisted ? `+ ${assisted} assist${assisted === 1 ? "" : "s"}` : "your credit, once per driver")}
            />
            <Stat label="Reopened" value={a.workload.reopened} hint={<Delta now={a.workload.reopened} before={prev?.workload.reopened} lowerIsBetter />} />
          </Section>

          <Section title="Speed" icon={Timer}>
            <Stat label="First reply (avg)" value={duration(a.speed.firstResponse.avgSec)} hint={timingHint(a.speed.firstResponse)} />
            <Stat label="From assigned to reply" value={duration(a.speed.firstResponse.avgFromAssignedSec)} hint={note("your own speed")} />
            <Stat label="Time to resolve (avg)" value={duration(a.speed.resolution.avgSec)} hint={timingHint(a.speed.resolution)} />
            <Stat label="Answered in time" value={pct(a.speed.slaPct)} hint={note(`${a.speed.slaMet} of ${a.speed.slaTotal} within the deadline`)} />
          </Section>

          <Section title="Activity" icon={Activity}>
            <Stat label="Replies" value={a.activity.replies} hint={<Delta now={a.activity.replies} before={prev?.activity.replies} />} />
            <Stat label="Calls & contacts" value={a.activity.contacts} />
            <Stat label="WhatsApp templates" value={a.activity.whatsappTemplates} />
            <Stat label="Emails" value={a.activity.emails} />
            <Stat label="SMS" value={a.activity.sms} />
            <Stat label="Notes" value={a.activity.notes} />
          </Section>

          <Section title="Availability" icon={Clock}>
            <Stat label="Online" value={hours(a.availability.onlineSec)} />
            <Stat label="Scheduled" value={hours(a.availability.scheduledSec)} />
            <Stat label="Kept to schedule" value={pct(a.availability.adherencePct)} hint={note("online during your shifts")} />
          </Section>

          <ApprovalsSection from={from} to={to} />
          <CompletedSection key={`${from}|${to}`} from={from} to={to} />

          <p className="text-xs text-muted-foreground">
            {data.range.from} to {data.range.to} (Sri Lanka days). Open, overdue and not opened are as of right now; the rest count the period.
          </p>
        </div>
      )}
    </PageShell>
  );
}
