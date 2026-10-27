"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { QUEUED_SHORT } from "@/components/inbox/meta";
import { getErrorMessage } from "@/lib/api";
import { useIsAdmin } from "@/lib/hooks/use-desk";
import {
  getCreateAllStatus,
  refreshIncoming,
  useCreateIncomingTickets,
  useIncomingChats,
  useStartCreateAll,
} from "@/lib/hooks/use-whatsapp-incoming";
import { useQueryClient } from "@tanstack/react-query";
import { NO_FILTER, chatKey, finishedText, isFiltered, needsTicket, progressText, ticketsToCreate } from "@/lib/whatsapp-incoming/filters";
import type { IncomingChat, IncomingFilter, IncomingTicketFilter } from "@/types/whatsapp-incoming";

const PER_PAGE = 25;
const POLL_MS = 2000;

const TICKET_CHOICES: Array<{ value: IncomingTicketFilter; label: string }> = [
  { value: "all", label: "All conversations" },
  { value: "none", label: "No ticket" },
  { value: "has", label: "Has a ticket" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

/** Who has it: the agent, or why nobody does yet. */
function assignee(c: IncomingChat) {
  const t = c.ticket;
  if (!t) return <span className="text-muted-foreground">—</span>;
  if (t.assignedToName) return t.assignedToName;
  if (t.assignedToUserId != null) return `Staff #${t.assignedToUserId}`;
  const why = t.queuedReason ? QUEUED_SHORT[t.queuedReason] : null;
  return <span className="text-amber-700 dark:text-amber-300">Waiting{why ? ` · ${why}` : ""}</span>;
}

/**
 * Every incoming WhatsApp conversation (admins only): which ones have a ticket and who holds it,
 * a filter for the ones that have none, and the way to open a ticket for them. A ticket opens
 * through normal routing, so it goes to a matching online agent.
 */
export function WhatsappChats() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<IncomingFilter>(NO_FILTER);
  const [page, setPage] = useState(1);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const chats = useIncomingChats(filter, page, PER_PAGE, isAdmin);
  // How many no-ticket conversations "create for all" would cover (the current search and dates).
  const noTicket = useIncomingChats({ ...filter, ticket: "none" }, 1, 1, isAdmin && confirmingAll);
  const create = useCreateIncomingTickets();
  const startAll = useStartCreateAll();

  const rows = chats.data?.data ?? [];
  const meta = chats.data?.meta;
  const eligible = rows.filter(needsTicket);
  const tickedEligible = rows.filter((c) => ticked.has(chatKey(c)) && needsTicket(c));
  const allOnPage = eligible.length > 0 && eligible.every((c) => ticked.has(chatKey(c)));
  const running = startAll.isPending || progress !== null;

  function changeFilter(change: Partial<IncomingFilter>) {
    setFilter((f) => ({ ...f, ...change }));
    setPage(1);
    setTicked(new Set());
  }

  function toggle(key: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePage() {
    setTicked((prev) => {
      const next = new Set(prev);
      for (const c of eligible) {
        if (allOnPage) next.delete(chatKey(c));
        else next.add(chatKey(c));
      }
      return next;
    });
  }

  function createForTicked() {
    const items = ticketsToCreate(rows, ticked);
    if (items.length === 0) return;
    create.mutate(items, { onSuccess: () => setTicked(new Set()) });
  }

  /** Starts the run on the server, then follows it: opening a ticket for every chat takes a while. */
  async function createForAll() {
    setConfirmingAll(false);
    try {
      let status = await startAll.mutateAsync(filter);
      setProgress(progressText(status));
      while (status.state === "running") {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        const next = await getCreateAllStatus();
        if (!next) {
          toast.error("Lost track of the run. Reload and check the list.");
          return;
        }
        status = next;
        setProgress(progressText(status));
      }
      if (status.state === "failed") {
        toast.error(`Stopped after ${status.created} ticket(s): ${status.error ?? "something went wrong"}`);
      } else {
        // A run can finish with some conversations still ticketless: say why.
        (status.failed ? toast.warning : toast.success)(finishedText(status), { duration: status.failed ? 15000 : 5000 });
      }
      setTicked(new Set());
      refreshIncoming(qc);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setProgress(null);
    }
  }

  if (!isAdmin) return <NoAccess what="WhatsApp chats" />;

  const noTicketCount = noTicket.data?.meta.total;
  const confirmText = noTicket.isLoading
    ? "Counting the conversations without a ticket…"
    : noTicketCount === 0
      ? "No conversation matching the search and dates above is without a ticket."
      : `This opens a ticket for ${noTicketCount?.toLocaleString() ?? "every"} conversation${noTicketCount === 1 ? "" : "s"} without one${
          isFiltered(filter) ? " (using the search and dates above)" : ""
        } and assigns each to an online agent that matches its language and skill.`;

  return (
    <PageShell
      title="WhatsApp chats"
      description="Every conversation customers started on WhatsApp, with its ticket and agent. Open a ticket for the ones that have none and it is assigned to an agent automatically."
    >
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Search name or phone" onSearch={(q) => changeFilter({ q })} />
          <NativeSelect
            aria-label="Ticket"
            value={filter.ticket}
            onChange={(e) => changeFilter({ ticket: e.target.value as IncomingTicketFilter })}
            containerClassName="w-48"
          >
            {TICKET_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
          <label className="flex items-center gap-2 text-sm font-medium">
            Last message from
            <Input type="date" value={filter.from} onChange={(e) => changeFilter({ from: e.target.value })} className="w-auto" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            to
            <Input type="date" value={filter.to} onChange={(e) => changeFilter({ to: e.target.value })} className="w-auto" />
          </label>
          {isFiltered(filter) && (
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => changeFilter(NO_FILTER)}>
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Button size="sm" disabled={tickedEligible.length === 0 || create.isPending || running} onClick={createForTicked}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Ticket />}
            Create tickets &amp; assign{tickedEligible.length > 0 ? ` (${tickedEligible.length})` : ""}
          </Button>
          <Button variant="outline" size="sm" disabled={running || create.isPending} onClick={() => setConfirmingAll(true)}>
            {running ? <Loader2 className="animate-spin" /> : <Ticket />}
            Create tickets for all no-ticket chats
          </Button>
          {ticked.size > 0 && (
            <button type="button" className="text-muted-foreground hover:underline" onClick={() => setTicked(new Set())}>
              Clear selection
            </button>
          )}
          {progress && <span className="text-muted-foreground">{progress}</span>}
        </div>

        {chats.isError ? (
          <div className="mt-3 rounded-xl border p-6 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(chats.error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void chats.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-primary"
                      aria-label="Select every conversation without a ticket on this page"
                      disabled={eligible.length === 0}
                      checked={allOnPage}
                      ref={(el) => {
                        if (el) el.indeterminate = tickedEligible.length > 0 && !allOnPage;
                      }}
                      onChange={togglePage}
                    />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Last message</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Assigned to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chats.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {isFiltered(filter) ? "No conversations match these filters." : "No WhatsApp conversations yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => {
                    const key = chatKey(c);
                    const can = needsTicket(c);
                    return (
                      <TableRow key={key} data-state={ticked.has(key) ? "selected" : undefined}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Select ${c.name || c.phone}`}
                            disabled={!can}
                            checked={ticked.has(key)}
                            onChange={() => toggle(key)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{c.name || "—"}</div>
                          <div className="font-mono text-xs text-muted-foreground">{c.phone}</div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={c.lastBody}>
                            <span className="text-muted-foreground">{c.lastDirection === "in" ? "Customer: " : "Bot: "}</span>
                            {c.lastBody}
                          </div>
                          <div className="text-xs text-muted-foreground">{when(c.lastAt)}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.inboundCount}</TableCell>
                        <TableCell>
                          {c.ticket ? (
                            <Link href={`/inbox?ticket=${c.ticket.id}`} className="font-mono text-xs text-primary hover:underline">
                              {c.ticket.ticketNumber}
                            </Link>
                          ) : (
                            <Badge variant="outline">No ticket</Badge>
                          )}
                        </TableCell>
                        <TableCell>{assignee(c)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
          </>
        )}
      </section>

      <Modal open={confirmingAll} onClose={() => setConfirmingAll(false)} title="Create tickets for all no-ticket chats?">
        <div className="space-y-4 text-sm">
          <p>{confirmText}</p>
          <p className="text-muted-foreground">It runs in the background; you can keep this page open to follow it.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmingAll(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={noTicket.isLoading || noTicketCount === 0} onClick={() => void createForAll()}>
              Create tickets
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
