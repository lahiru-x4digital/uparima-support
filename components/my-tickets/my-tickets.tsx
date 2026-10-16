"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useCan, useMe } from "@/lib/hooks/use-desk";
import { ticketKeys } from "@/lib/hooks/query-keys";
import { bulkCloseTickets, listTickets } from "@/lib/services/tickets.service";
import { cn } from "@/lib/utils";
import type { TicketListParams } from "@/types/ticket";

const PER_PAGE = 25;
/** Tickets older than this many days get the "old" flag (they also stop counting toward routing load after 2 days). */
const OLD_AFTER_DAYS = 2;

const AGE_FILTERS = [
  { key: "all", label: "All", hours: undefined },
  { key: "12h", label: "Older than 12 hours", hours: 12 },
  { key: "24h", label: "Older than 24 hours", hours: 24 },
  { key: "2d", label: "Older than 2 days", hours: 48 },
  { key: "7d", label: "Older than 7 days", hours: 168 },
  { key: "14d", label: "Older than 14 days", hours: 336 },
] as const;

const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** The agent's own pending tickets, oldest first, with a way to close finished or abandoned ones. */
export function MyTickets() {
  const { data: me } = useMe();
  const canClose = useCan("support-ticket.update");
  const qc = useQueryClient();
  const [age, setAge] = useState<(typeof AGE_FILTERS)[number]["key"]>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const olderThanHours = AGE_FILTERS.find((f) => f.key === age)?.hours;
  const params: TicketListParams | null = me
    ? { status: "pending", assignedToUserId: me.id, sort: "oldest", olderThanHours, page, perPage: PER_PAGE }
    : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ticketKeys.list({ ...params, mine: "open" } as TicketListParams),
    queryFn: () => listTickets(params as TicketListParams),
    enabled: !!params,
    placeholderData: keepPreviousData,
  });

  const close = useMutation({
    mutationFn: (ids: string[]) => bulkCloseTickets(ids),
    onSuccess: ({ closed, skipped }) => {
      toast.success(`Closed ${closed.length} ticket${closed.length === 1 ? "" : "s"}${skipped.length ? `, skipped ${skipped.length}` : ""}`);
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
    onError: (e) => toast.error(`Could not close: ${getErrorMessage(e)}`),
  });

  const rows = data?.data ?? [];
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeIds(ids: string[], what: string) {
    if (ids.length && window.confirm(`Close ${what}? They will be marked completed.`)) close.mutate(ids);
  }

  return (
    <PageShell
      title="My open tickets"
      description="Pending tickets assigned to you, oldest first. Close the ones that are finished, or that the customer never answered."
      actions={
        canClose && (
          <Button
            size="sm"
            disabled={selected.size === 0 || close.isPending}
            onClick={() => closeIds([...selected], `${selected.size} selected ticket${selected.size === 1 ? "" : "s"}`)}
          >
            <CheckCheck /> Close selected ({selected.size})
          </Button>
        )
      }
    >
      <div className="flex flex-wrap gap-2">
        {AGE_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={age === f.key ? "default" : "outline"}
            onClick={() => {
              setAge(f.key);
              setPage(1);
              setSelected(new Set());
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-3">
                {canClose && (
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allOnPage}
                    onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                )}
              </th>
              <th className="p-3">Ticket</th>
              <th className="p-3">From</th>
              <th className="p-3">Category</th>
              <th className="p-3">Age</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const days = ageDays(t.createdAt);
              const old = days >= OLD_AFTER_DAYS;
              return (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3">
                    {canClose && (
                      <input type="checkbox" aria-label={`Select ${t.ticketNumber}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{t.ticketNumber}</div>
                    <div className="max-w-xs truncate text-xs text-muted-foreground">{t.subject}</div>
                  </td>
                  <td className="p-3">
                    <div>{t.submitterName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.submitterPhone ?? t.reporterPhone ?? ""}</div>
                  </td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        old
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          : "bg-muted text-muted-foreground",
                      )}
                      title={`Created ${timeAgo(t.createdAt)}`}
                    >
                      {old && <AlertTriangle className="size-3" />}
                      {days === 0 ? "today" : `${days}d`}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/inbox?ticket=${t.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <ExternalLink /> Open
                      </Link>
                      {canClose && (
                        <Button variant="outline" size="sm" disabled={close.isPending} onClick={() => closeIds([t.id], t.ticketNumber)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="p-6 text-center text-sm text-red-600">{getErrorMessage(error)}</p>}
        {!isLoading && !error && rows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nothing here. You have no pending tickets{olderThanHours ? " that old" : ""}.</p>
        )}
      </div>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </PageShell>
  );
}
