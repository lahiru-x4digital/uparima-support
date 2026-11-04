"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { getErrorMessage } from "@/lib/api";
import { useSimulateBotFlow } from "@/lib/hooks/use-bot-flows";
import type { FlowGraph, RecordedOutput, SimulationResult, SimulationRole } from "@/types/bot-flow";
import { Formatted } from "./formatted";

const ROLES: { value: SimulationRole; label: string }[] = [
  { value: "new_customer", label: "New customer" },
  { value: "returning_customer", label: "Returning customer" },
  { value: "driver", label: "Approved driver" },
  { value: "pending_driver", label: "Driver under review" },
  { value: "incomplete_driver", label: "Driver with unfinished signup" },
];

/** Tries the graph being edited on a pretend customer. Nothing is sent and no data is touched. */
export function FlowSimulator({ flow, graph }: { flow: string; graph: FlowGraph }) {
  const simulate = useSimulateBotFlow(flow);
  const entries = Object.keys(graph.entries);
  const [entry, setEntry] = useState(entries[0] ?? "");
  const [role, setRole] = useState<SimulationRole>("new_customer");
  const [language, setLanguage] = useState<"en" | "si" | "ta">("en");
  const [name, setName] = useState("Nimal");
  const [result, setResult] = useState<SimulationResult | null>(null);

  async function run() {
    try {
      setResult(await simulate.mutateAsync({ graph, entry: entries.includes(entry) ? entry : entries[0], role, language, name: name.trim() || undefined }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">See what a customer would get from the flow as it is on the canvas right now, saved or not.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs font-medium">
          Starts at
          <NativeSelect value={entry} onChange={(e) => setEntry(e.target.value)}>
            {entries.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Language
          <NativeSelect value={language} onChange={(e) => setLanguage(e.target.value as "en" | "si" | "ta")}>
            <option value="en">English</option>
            <option value="si">සිංහල</option>
            <option value="ta">தமிழ்</option>
          </NativeSelect>
        </label>
        <label className="col-span-2 space-y-1 text-xs font-medium">
          Customer
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value as SimulationRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="col-span-2 space-y-1 text-xs font-medium">
          Their name
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <Button onClick={() => void run()} disabled={simulate.isPending || !entries.length}>
        <Play className="size-4" /> {simulate.isPending ? "Running…" : "Run"}
      </Button>

      {result && (
        <div className="space-y-2" aria-live="polite">
          {result.error && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {result.error}
              {result.issues.some((i) => i.severity === "error") && ": " + result.issues.filter((i) => i.severity === "error").map((i) => i.message).join("; ")}
            </p>
          )}
          <div className="space-y-2 rounded-xl bg-[#e7ddd3] p-3 dark:bg-muted">
            {result.outputs.length === 0 && !result.error && <p className="text-xs text-muted-foreground">The flow sent nothing.</p>}
            {result.outputs.map((o, i) => (
              <Bubble key={i} output={o} />
            ))}
          </div>
          {!result.error && <p className="text-xs text-muted-foreground">The conversation ends in state <code className="rounded bg-muted px-1">{result.state}</code>.</p>}
        </div>
      )}
    </div>
  );
}

function Bubble({ output }: { output: RecordedOutput }) {
  return (
    <div className="max-w-[90%] space-y-1">
      <div className="rounded-lg rounded-tl-none bg-white p-2.5 text-sm whitespace-pre-wrap text-black shadow-sm">
        <Formatted text={output.body} />
      </div>
      {output.options?.map((o) => (
        <div key={o.id} className="rounded-lg bg-white p-1.5 text-center text-xs font-medium text-sky-600 shadow-sm" title={o.id}>
          {o.title}
        </div>
      ))}
    </div>
  );
}
