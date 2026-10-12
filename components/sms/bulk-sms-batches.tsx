"use client";

import { useState } from "react";
import { Loader2, OctagonX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { useBulkSmsBatches, useCancelBulkSmsBatch } from "@/lib/hooks/use-sms";
import type { BulkSmsBatch } from "@/types/sms";

const count = (n: number) => n.toLocaleString();

function statusOf(b: BulkSmsBatch): { label: string; tone: string } {
  if (b.pending > 0) return { label: `Sending… ${count(b.total - b.pending)} of ${count(b.total)}`, tone: "text-primary" };
  if (b.failed === 0) return { label: "All sent", tone: "text-emerald-600 dark:text-emerald-400" };
  if (b.sent === 0) return { label: "None sent", tone: "text-destructive" };
  return { label: `Finished — ${count(b.failed)} failed`, tone: "text-amber-600 dark:text-amber-400" };
}

/** The latest bulk sends and how far each has got; one still going out can be stopped. */
export function BulkSmsBatches({ enabled }: { enabled: boolean }) {
  const { data, isLoading, error, refetch } = useBulkSmsBatches(enabled);
  const cancel = useCancelBulkSmsBatch();
  const [stopping, setStopping] = useState<BulkSmsBatch | null>(null);

  const batches = data?.data ?? [];

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Recent batches</h2>

      {isLoading ? (
        <div className="flex justify-center p-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 text-center text-sm">
          <p className="text-destructive">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : batches.length === 0 ? (
        <p className="p-4 text-center text-sm text-muted-foreground">No bulk messages sent yet.</p>
      ) : (
        <ul className="mt-2 divide-y">
          {batches.map((b) => {
            const status = statusOf(b);
            const pct = (n: number) => `${b.total ? (n / b.total) * 100 : 0}%`;
            return (
              <li key={b.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm break-words">{b.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {count(b.total)} recipient{b.total === 1 ? "" : "s"} · {b.sentByName ?? `#${b.sentByUserId}`} ·{" "}
                      {new Date(b.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {b.pending > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setStopping(b)}>
                      <OctagonX /> Stop
                    </Button>
                  )}
                </div>
                <div
                  className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${count(b.sent)} sent, ${count(b.failed)} failed, ${count(b.pending)} waiting`}
                >
                  <div className="bg-emerald-500" style={{ width: pct(b.sent) }} />
                  <div className="bg-destructive" style={{ width: pct(b.failed) }} />
                </div>
                <p className="mt-1 text-xs">
                  <span className={`font-medium ${status.tone}`}>{status.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {count(b.sent)} sent · {count(b.failed)} failed
                    {b.pending > 0 && ` · ${count(b.pending)} waiting`}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!stopping} onClose={() => !cancel.isPending && setStopping(null)} title="Stop this batch?">
        {stopping && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The {count(stopping.pending)} message{stopping.pending === 1 ? "" : "s"} still waiting won&apos;t be sent. The{" "}
              {count(stopping.sent)} already sent can&apos;t be taken back.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={cancel.isPending} onClick={() => setStopping(null)}>
                Keep sending
              </Button>
              <Button
                variant="destructive"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(stopping.id, { onSettled: () => setStopping(null) })}
              >
                {cancel.isPending ? <Loader2 className="animate-spin" /> : <OctagonX />} Stop batch
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
