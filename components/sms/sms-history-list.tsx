"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useSmsHistory } from "@/lib/hooks/use-sms";
import { useCan } from "@/lib/hooks/use-desk";

const PER_PAGE = 20;

export function SmsHistoryList() {
  const canView = useCan("sms.view");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useSmsHistory({ page, perPage: PER_PAGE });

  if (!canView) {
    return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to SMS history.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">SMS History</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : !data?.data.length ? (
          <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No messages sent yet.
          </p>
        ) : (
          <>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
              {data.data.map((log) => (
                <li key={log.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {log.phone} <span className="font-normal text-muted-foreground">· {log.countryIso2}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {log.message}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {log.provider || "—"} · Sent by {log.sentByName ?? `#${log.sentByUserId}`} ·{" "}
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={log.status === "sent" ? "default" : "destructive"} className="capitalize">
                    {log.status}
                  </Badge>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {data.meta.page} of {Math.max(1, data.meta.totalPages)} · {data.meta.total} total
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
