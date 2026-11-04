"use client";

import Link from "next/link";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api";
import { useBotFlows } from "@/lib/hooks/use-bot-flows";
import { useIsAdmin } from "@/lib/hooks/use-desk";

/** What each flow is, in plain words (the keys are the bot's own names for them). */
const ABOUT: Record<string, { title: string; text: string }> = {
  home: { title: "Main menu", text: "The first menu people see, and the \"More information\" screen. The buttons depend on whether the number is a customer, a driver or an unfinished signup." },
};

export function BotFlowsList() {
  const isAdmin = useIsAdmin();
  const flows = useBotFlows();
  if (!isAdmin) {
    return (
      <PageShell title="Bot flows">
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Only admins can edit bot flows.</p>
      </PageShell>
    );
  }
  return (
    <PageShell
      title="Bot flows"
      description="Change how the WhatsApp bot behaves: what it shows, in what order, and what it does next. Customers keep getting the built-in flow until you switch one on."
      width="max-w-3xl"
      actions={
        <Button variant="outline" nativeButton={false} render={<Link href="/settings/bot/texts" />}>
          <MessageSquareText className="size-4" /> Edit texts
        </Button>
      }
    >
      {flows.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : flows.isError ? (
        <div className="space-y-3 rounded-xl border bg-card p-6 text-sm">
          <p className="text-destructive">{getErrorMessage(flows.error)}</p>
          <Button variant="outline" onClick={() => void flows.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {flows.data.map((f) => (
            <li key={f.flow}>
              <Link href={`/settings/bot/flows/${encodeURIComponent(f.flow)}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold">{ABOUT[f.flow]?.title ?? f.flow}</h2>
                    <Badge variant={f.engine === "graph" ? "default" : "secondary"}>{f.engine === "graph" ? `Your flow · v${f.publishedVersion}` : "Built-in"}</Badge>
                    {f.hasDraft && <Badge variant="outline">Draft</Badge>}
                    {f.fallbacks > 0 && <Badge variant="destructive">{f.fallbacks} failure{f.fallbacks > 1 ? "s" : ""}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{ABOUT[f.flow]?.text ?? `Flow "${f.flow}".`}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">The other bot flows (booking, trips, driver hub, signup and support) are still built in. Their texts can already be edited under Bot texts.</p>
    </PageShell>
  );
}
