"use client";

import { useState } from "react";
import { Loader2, Send as SendIcon, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { getErrorMessage } from "@/lib/api";
import { useIsSuperAdmin } from "@/lib/hooks/use-desk";
import { useBulkSmsCustomerIds, useBulkSmsCustomers, useSendBulkSms } from "@/lib/hooks/use-sms";
import { BULK_SMS_MAX_RECIPIENTS, SMS_MAX_LENGTH, smsParts } from "@/lib/sms";
import type { BulkSmsCustomerFilter, BulkSmsSegment } from "@/types/sms";
import { BulkSmsBatches } from "./bulk-sms-batches";

const PER_PAGE = 25;
const NO_FILTER: BulkSmsCustomerFilter = { q: "", segment: "all", from: "", to: "" };

const SEGMENTS: Array<{ value: BulkSmsSegment; label: string }> = [
  { value: "all", label: "All customers" },
  { value: "riders", label: "Riders (have booked a ride)" },
  { value: "drivers", label: "Drivers" },
];

const count = (n: number) => n.toLocaleString();
const plural = (n: number, word: string) => `${count(n)} ${word}${n === 1 ? "" : "s"}`;

/**
 * Bulk SMS, for super admins: pick customers, write one message, send it to all of them.
 *
 * The selection is a set of customer ids that outlives the page and the filters, so a batch can be
 * built up from several searches. Sending only queues the batch — the backend sends it in the
 * background, and the list underneath shows how far it has got.
 */
export function BulkSms() {
  const isSuperAdmin = useIsSuperAdmin();

  const [filter, setFilter] = useState<BulkSmsCustomerFilter>(NO_FILTER);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  const customers = useBulkSmsCustomers({ ...filter, page, perPage: PER_PAGE }, isSuperAdmin);
  const matchingIds = useBulkSmsCustomerIds();
  const send = useSendBulkSms();

  if (!isSuperAdmin) return <NoAccess what="bulk SMS" />;

  const rows = customers.data?.data ?? [];
  const meta = customers.data?.meta;
  const matching = meta?.total ?? 0;
  const filtered = filter.q !== "" || filter.segment !== "all" || filter.from !== "" || filter.to !== "";

  const onPage = rows.filter((c) => selected.has(c.id)).length;
  const allOnPage = rows.length > 0 && onPage === rows.length;

  const changeFilter = (patch: Partial<BulkSmsCustomerFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  // Adds to the selection, up to what one batch can hold.
  function add(ids: number[]) {
    const next = new Set(selected);
    for (const id of ids) {
      if (next.size >= BULK_SMS_MAX_RECIPIENTS) break;
      next.add(id);
    }
    if (ids.some((id) => !next.has(id))) {
      toast.error(`A batch can go to ${count(BULK_SMS_MAX_RECIPIENTS)} customers at most. Send the rest as another batch.`);
    }
    setSelected(next);
  }

  function remove(ids: number[]) {
    const next = new Set(selected);
    for (const id of ids) next.delete(id);
    setSelected(next);
  }

  const toggle = (id: number) => (selected.has(id) ? remove([id]) : add([id]));
  const togglePage = () => (allOnPage ? remove(rows.map((c) => c.id)) : add(rows.map((c) => c.id)));

  function selectAllMatching() {
    matchingIds.mutate(filter, { onSuccess: (result) => add(result.ids) });
  }

  const text = message.trim();
  const parts = smsParts(text);
  const canSend = selected.size > 0 && text.length > 0 && !send.isPending;

  function submit() {
    send.mutate(
      { userIds: [...selected], message: text },
      {
        onSuccess: () => {
          setSelected(new Set());
          setMessage("");
        },
        onSettled: () => setConfirming(false),
      },
    );
  }

  return (
    <PageShell
      title="Bulk SMS"
      description="Send one message to a chosen set of customers. Only super admins can open this page."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ---- Who it goes to */}
        <section className="min-w-0 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox placeholder="Search name, phone or email" onSearch={(q) => changeFilter({ q })} />
            <NativeSelect
              aria-label="Customer type"
              value={filter.segment}
              onChange={(e) => changeFilter({ segment: e.target.value as BulkSmsSegment })}
              containerClassName="w-56"
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-2 text-sm font-medium">
              Joined from
              <Input type="date" value={filter.from} onChange={(e) => changeFilter({ from: e.target.value })} className="w-auto" />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              to
              <Input type="date" value={filter.to} onChange={(e) => changeFilter({ to: e.target.value })} className="w-auto" />
            </label>
            {(filter.segment !== "all" || filter.from || filter.to) && (
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => changeFilter({ segment: "all", from: "", to: "" })}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* ---- The selection, and the quick ways to build it */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="font-semibold">{plural(selected.size, "customer")} selected</span>
            <span className="text-muted-foreground">· {plural(matching, "customer")} {filtered ? "match these filters" : "in all"}</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={matching === 0 || matchingIds.isPending} onClick={selectAllMatching}>
                {matchingIds.isPending ? <Loader2 className="animate-spin" /> : <Users />}
                {matching > BULK_SMS_MAX_RECIPIENTS
                  ? `Select the newest ${count(BULK_SMS_MAX_RECIPIENTS)}`
                  : `Select all ${count(matching)}${filtered ? " matching" : ""}`}
              </Button>
              <Button variant="ghost" size="sm" disabled={selected.size === 0} onClick={() => setSelected(new Set())}>
                <X /> Clear selection
              </Button>
            </div>
          </div>

          {customers.error ? (
            <div className="mt-3 rounded-xl border p-6 text-center text-sm">
              <p className="text-destructive">{getErrorMessage(customers.error)}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void customers.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-primary"
                        aria-label="Select everyone on this page"
                        disabled={rows.length === 0}
                        checked={allOnPage}
                        // Some but not all of the page: the dash, not a tick.
                        ref={(el) => {
                          if (el) el.indeterminate = onPage > 0 && !allOnPage;
                        }}
                        onChange={togglePage}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        {filtered ? "No customers match these filters." : "No customers with a mobile number yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((c) => {
                      const checked = selected.has(c.id);
                      return (
                        <TableRow
                          key={c.id}
                          data-state={checked ? "selected" : undefined}
                          className="cursor-pointer"
                          onClick={() => toggle(c.id)}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              className="size-4 cursor-pointer accent-primary"
                              aria-label={`Select ${c.name || c.phone}`}
                              checked={checked}
                              onChange={() => toggle(c.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{c.name || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {c.isDriver && <Badge variant="secondary">Driver</Badge>}
                              {c.hasRides && <Badge variant="outline">Rider</Badge>}
                              {!c.isDriver && !c.hasRides && <span className="text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{new Date(c.joinedAt).toLocaleDateString()}</TableCell>
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

        {/* ---- What it says */}
        <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
          <section className="rounded-2xl border bg-card p-4">
            <Label htmlFor="bulk-sms-message" className="mb-1.5 text-xs font-semibold">
              Message
            </Label>
            <Textarea
              id="bulk-sms-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, SMS_MAX_LENGTH))}
              rows={7}
              placeholder="The same message goes to everyone selected…"
            />
            <p className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{parts > 0 ? `About ${parts} SMS each` : " "}</span>
              <span>
                {message.length}/{SMS_MAX_LENGTH}
              </span>
            </p>

            <Button className="mt-3 w-full" disabled={!canSend} onClick={() => setConfirming(true)}>
              <SendIcon /> Send to {plural(selected.size, "customer")}
            </Button>
            {selected.size === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Tick customers in the list, or use “Select all”, to choose who gets it.</p>
            )}
          </section>

          <BulkSmsBatches enabled={isSuperAdmin} />
        </div>
      </div>

      <Modal open={confirming} onClose={() => !send.isPending && setConfirming(false)} title="Send this message?">
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
            <dt className="text-muted-foreground">Goes to</dt>
            <dd className="font-semibold">{plural(selected.size, "customer")}</dd>
            <dt className="text-muted-foreground">Billed as</dt>
            <dd>
              about {count(parts * selected.size)} SMS ({parts} each)
            </dd>
          </dl>
          <p className="max-h-40 overflow-y-auto rounded-lg border p-3 text-sm break-words whitespace-pre-wrap">{text}</p>
          <p className="text-sm text-muted-foreground">
            Messages start going out straight away and can&apos;t be taken back once sent. Customers sharing a number get it
            once.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={send.isPending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button disabled={send.isPending} onClick={submit}>
              {send.isPending ? <Loader2 className="animate-spin" /> : <SendIcon />} Send {plural(selected.size, "message")}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
