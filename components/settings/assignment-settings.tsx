"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/api";
import { useIsAdmin } from "@/lib/hooks/use-desk";
import { useRoutingSettings, useSaveRoutingSettings } from "@/lib/hooks/use-support-settings";
import type { RoutingSettings } from "@/types/support-settings";

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const schema = z.object({
  autoAssignEnabled: z.boolean(),
  strategy: z.enum(["least_load", "round_robin"]),
  maxOpenPerAgent: int(0, 500),
  previousAgentEnabled: z.boolean(),
  previousAgentDays: int(1, 365),
  outOfShiftFallback: z.boolean(),
  awayGraceMinutes: int(1, 240),
  rebalanceEnabled: z.boolean(),
  rebalanceMinAgeMinutes: int(1, 1440),
  rebalanceMaxMoves: int(1, 500),
  sweepIntervalSeconds: int(15, 3600),
  loadWindowHours: int(1, 720),
  slaHours: z.object({ urgent: int(1, 720), high: int(1, 720), normal: int(1, 720), low: int(1, 720) }),
  whatsappTicketReuseHours: int(1, 720),
});

/** A whole-number input that lets the field be emptied while typing and snaps back on blur. */
function NumberField({
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  suffix?: string;
  disabled?: boolean;
  label: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const n = Number(raw);
  const invalid = raw.trim() === "" || !Number.isInteger(n) || n < min || n > max;
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid}
        disabled={disabled}
        min={min}
        max={max}
        value={raw}
        className="w-28"
        onChange={(e) => {
          setRaw(e.target.value);
          const next = Number(e.target.value);
          if (e.target.value.trim() !== "" && Number.isInteger(next)) onChange(next);
        }}
        onBlur={() => setRaw(String(value))}
      />
      {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      {invalid && (
        <span className="text-xs text-destructive">
          {min}–{max}
        </span>
      )}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-md">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const same = (a: RoutingSettings, b: RoutingSettings) => JSON.stringify(a) === JSON.stringify(b);

export function AssignmentSettings() {
  const isAdmin = useIsAdmin();
  const query = useRoutingSettings();
  if (!isAdmin) {
    return (
      <PageShell title="Assignment settings">
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Only admins can change assignment rules.</p>
      </PageShell>
    );
  }
  if (query.isPending) {
    return (
      <PageShell title="Assignment settings" width="max-w-3xl">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }
  if (query.isError) {
    return (
      <PageShell title="Assignment settings" width="max-w-3xl">
        <div className="space-y-3 rounded-xl border bg-card p-6 text-sm">
          <p className="text-destructive">{getErrorMessage(query.error)}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      </PageShell>
    );
  }
  // Re-mount the editor when the saved version changes so its draft starts from the server's copy.
  return <Editor key={query.data.version} saved={query.data.settings} defaults={query.data.defaults} version={query.data.version} updatedAt={query.data.updatedAt} />;
}

function Editor({
  saved,
  defaults,
  version,
  updatedAt,
}: {
  saved: RoutingSettings;
  defaults: RoutingSettings;
  version: number;
  updatedAt: string | null;
}) {
  const save = useSaveRoutingSettings();
  const [draft, setDraft] = useState<RoutingSettings>(saved);
  // Bumped by Discard / Reset so the number fields re-read their value.
  const [epoch, setEpoch] = useState(0);
  const dirty = !same(draft, saved);
  const parsed = useMemo(() => schema.safeParse(draft), [draft]);
  const set = <K extends keyof RoutingSettings>(key: K, value: RoutingSettings[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setSla = (key: keyof RoutingSettings["slaHours"], value: number) =>
    setDraft((d) => ({ ...d, slaHours: { ...d.slaHours, [key]: value } }));
  const auto = draft.autoAssignEnabled;

  async function onSave() {
    if (!parsed.success) return;
    try {
      await save.mutateAsync(parsed.data);
      toast.success("Assignment settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <PageShell
      title="Assignment settings"
      description="How new tickets are assigned to agents, when they move, and how long each priority has before it is overdue."
      width="max-w-3xl"
    >
      <p className="text-xs text-muted-foreground">
        {version === 0 ? "Running on the built-in rules; nothing has been changed yet." : `Version ${version}${updatedAt ? ` · saved ${new Date(updatedAt).toLocaleString()}` : ""}`}
      </p>

      {!auto && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>Automatic assignment is off. New tickets wait in the queue until someone assigns them by hand.</p>
        </div>
      )}

      <Section title="Automatic assignment" description="Who gets a new ticket the moment it arrives.">
        <Row title="Assign new tickets automatically" hint="Off: every ticket goes to the queue for a manual assign. Existing assignments are not touched.">
          <Switch aria-label="Assign new tickets automatically" checked={auto} onCheckedChange={(v) => set("autoAssignEnabled", v)} />
        </Row>
        <Row title="Pick the agent by" hint="Fewest open tickets first (balanced), or simply whoever was given a ticket longest ago (strict turns).">
          <NativeSelect
            aria-label="Assignment strategy"
            disabled={!auto}
            containerClassName="w-56"
            value={draft.strategy}
            onChange={(e) => set("strategy", e.target.value as RoutingSettings["strategy"])}
          >
            <option value="least_load">Fewest open tickets</option>
            <option value="round_robin">Round robin (turns)</option>
          </NativeSelect>
        </Row>
        <Row title="Most open tickets per agent" hint="An agent at this number gets nothing more automatically. If everyone is full the ticket waits in the queue. 0 = no limit.">
          <NumberField key={`max-${epoch}`} label="Most open tickets per agent" disabled={!auto} value={draft.maxOpenPerAgent} onChange={(n) => set("maxOpenPerAgent", n)} min={0} max={500} suffix="tickets" />
        </Row>
        <Row title="Use agents outside their shift" hint="When nobody on shift is online, hand tickets to online agents anyway. Off: they wait in the queue until a shift starts.">
          <Switch aria-label="Use agents outside their shift" disabled={!auto} checked={draft.outOfShiftFallback} onCheckedChange={(v) => set("outOfShiftFallback", v)} />
        </Row>
      </Section>

      <Section title="Returning customers" description="Keep a customer with the agent who already knows their case.">
        <Row title="Send back to the previous agent" hint="A customer who writes again goes to the agent who last handled them, if that agent is online.">
          <Switch aria-label="Send back to the previous agent" disabled={!auto} checked={draft.previousAgentEnabled} onCheckedChange={(v) => set("previousAgentEnabled", v)} />
        </Row>
        <Row title="Remember the previous agent for" hint="Older conversations are ignored.">
          <NumberField key={`prev-${epoch}`} label="Days to remember the previous agent" disabled={!auto || !draft.previousAgentEnabled} value={draft.previousAgentDays} onChange={(n) => set("previousAgentDays", n)} min={1} max={365} suffix="days" />
        </Row>
      </Section>

      <Section title="Away agents and rebalancing" description="Untouched tickets are moved so nobody sits on work they can't start.">
        <Row title="Wait before taking tickets off an away agent" hint="An agent who is Away or Offline keeps their unopened tickets this long.">
          <NumberField key={`away-${epoch}`} label="Away grace in minutes" value={draft.awayGraceMinutes} onChange={(n) => set("awayGraceMinutes", n)} min={1} max={240} suffix="min" />
        </Row>
        <Row title="Even out workload between agents" hint="Moves unopened tickets from the busiest online agent to a less busy one.">
          <Switch aria-label="Even out workload between agents" disabled={!auto} checked={draft.rebalanceEnabled} onCheckedChange={(v) => set("rebalanceEnabled", v)} />
        </Row>
        <Row title="A ticket must wait with its agent for" hint="So nothing bounces right after it was assigned.">
          <NumberField key={`age-${epoch}`} label="Minimum minutes before a ticket can be moved" disabled={!auto || !draft.rebalanceEnabled} value={draft.rebalanceMinAgeMinutes} onChange={(n) => set("rebalanceMinAgeMinutes", n)} min={1} max={1440} suffix="min" />
        </Row>
        <Row title="Most tickets moved per run" hint="A big backlog is spread over several runs.">
          <NumberField key={`moves-${epoch}`} label="Most tickets moved per run" disabled={!auto || !draft.rebalanceEnabled} value={draft.rebalanceMaxMoves} onChange={(n) => set("rebalanceMaxMoves", n)} min={1} max={500} suffix="tickets" />
        </Row>
      </Section>

      <Section title="Time to respond (SLA)" description="Hours, counted only while the desk is open, before a ticket of each priority is overdue. Applies to tickets created from now on.">
        {(["urgent", "high", "normal", "low"] as const).map((p) => (
          <Row key={p} title={`${p[0].toUpperCase()}${p.slice(1)} priority`}>
            <NumberField key={`sla-${p}-${epoch}`} label={`${p} priority SLA in hours`} value={draft.slaHours[p]} onChange={(n) => setSla(p, n)} min={1} max={720} suffix="hours" />
          </Row>
        ))}
      </Section>

      <Section title="Advanced" description="Change these only if you know you need to.">
        <Row title="Check the queue and agents every" hint="How often the background routing check runs.">
          <NumberField key={`sweep-${epoch}`} label="Routing check interval in seconds" value={draft.sweepIntervalSeconds} onChange={(n) => set("sweepIntervalSeconds", n)} min={15} max={3600} suffix="sec" />
        </Row>
        <Row title="Stop counting an opened ticket as load after" hint="A pending ticket the agent opened and left waiting stops counting toward their workload after this long.">
          <NumberField key={`load-${epoch}`} label="Load window in hours" value={draft.loadWindowHours} onChange={(n) => set("loadWindowHours", n)} min={1} max={720} suffix="hours" />
        </Row>
        <Row title="Keep a WhatsApp chat on the same ticket for" hint="A customer who messages again within this time is added to their open ticket instead of getting a new one.">
          <NumberField key={`wa-${epoch}`} label="WhatsApp ticket reuse window in hours" value={draft.whatsappTicketReuseHours} onChange={(n) => set("whatsappTicketReuseHours", n)} min={1} max={720} suffix="hours" />
        </Row>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {!parsed.success ? "Fix the highlighted values to save." : dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            disabled={same(draft, defaults) || save.isPending}
            onClick={() => {
              setDraft(defaults);
              setEpoch((e) => e + 1);
            }}
          >
            <RotateCcw className="size-4" /> Reset to defaults
          </Button>
          <Button
            variant="outline"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setDraft(saved);
              setEpoch((e) => e + 1);
            }}
          >
            Discard
          </Button>
          <Button disabled={!dirty || !parsed.success || save.isPending} onClick={() => void onSave()}>
            <Save className="size-4" /> {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
