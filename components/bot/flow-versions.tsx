"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useRollbackBotFlow, useSetBotFlowEngine } from "@/lib/hooks/use-bot-flows";
import type { FlowDetail } from "@/types/bot-flow";

/** Which engine is live, the switch between them, and every saved version. */
export function FlowVersions({ detail, hasUnsaved }: { detail: FlowDetail; hasUnsaved: boolean }) {
  const setEngine = useSetBotFlowEngine(detail.flow);
  const rollback = useRollbackBotFlow(detail.flow);
  const [confirming, setConfirming] = useState<"graph" | "legacy" | null>(null);
  const live = detail.engine === "graph";

  async function switchTo(engine: "graph" | "legacy") {
    try {
      await setEngine.mutateAsync(engine);
      toast.success(engine === "graph" ? "Customers now get the published flow" : "Back to the built-in flow");
      setConfirming(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function restore(version: number) {
    try {
      await rollback.mutateAsync(version);
      toast.success(`Version ${version} restored as a new version`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-lg border p-3" aria-label="Live engine">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">What customers get</p>
            <p className="text-xs text-muted-foreground">
              {live ? `The published flow (version ${detail.publishedVersion})` : "The built-in flow written in code"}
            </p>
          </div>
          <Badge variant={live ? "default" : "secondary"}>{live ? "Your flow" : "Built-in"}</Badge>
        </div>
        {detail.fallbacks && (
          <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-xs">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
            <span>
              The flow failed {detail.fallbacks.count} time(s) since the server started and the built-in flow answered instead. Last: {detail.fallbacks.error}
            </span>
          </p>
        )}
        {confirming ? (
          <div className="space-y-2 rounded-md bg-muted p-2 text-xs" role="alertdialog" aria-label="Confirm">
            <p>
              {confirming === "graph"
                ? `Customers will get version ${detail.publishedVersion} from now on. If it ever fails, the built-in flow answers that message, and you can switch back here at any time.`
                : "Customers will get the built-in flow again straight away."}
            </p>
            <div className="flex gap-2">
              <Button size="sm" disabled={setEngine.isPending} onClick={() => void switchTo(confirming)}>
                {setEngine.isPending ? "Switching…" : confirming === "graph" ? "Switch to my flow" : "Switch back"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant={live ? "outline" : "default"}
            disabled={!live && detail.publishedVersion == null}
            onClick={() => setConfirming(live ? "legacy" : "graph")}
          >
            {live ? "Switch back to built-in" : "Switch to the published flow"}
          </Button>
        )}
        {hasUnsaved && !live && <p className="text-xs text-muted-foreground">Publish your changes first; only the published version can go live.</p>}
      </section>

      <section aria-label="Versions">
        <h3 className="mb-1 text-sm font-semibold">Versions</h3>
        <ul className="space-y-1.5">
          {detail.versions.map((v) => (
            <li key={v.version} className="rounded-lg border p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  Version {v.version} {v.version === detail.publishedVersion && "· live version"}
                </span>
                <Badge variant={v.status === "published" ? "default" : "secondary"}>{v.status}</Badge>
              </div>
              <p className="text-muted-foreground">
                {new Date(v.publishedAt ?? v.updatedAt).toLocaleString()}
                {v.note ? ` · ${v.note}` : ""}
              </p>
              {v.status !== "draft" && v.version !== detail.publishedVersion && (
                <Button variant="ghost" size="sm" className="mt-1" disabled={rollback.isPending || !!detail.draft} onClick={() => void restore(v.version)} title={detail.draft ? "Publish or discard your draft first" : undefined}>
                  <RotateCcw className="size-3.5" /> Restore as new version
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
