"use client";

import { useState } from "react";
import { History, Loader2, Pencil, PhoneCall, PhoneMissed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { useMe } from "@/lib/hooks/use-desk";
import { useLogTicketCall, useTicketCalls, useUpdateTicketCall } from "@/lib/hooks/use-ticket-calls";
import { cn } from "@/lib/utils";
import { TICKET_CALL_NOTE_MAX_LENGTH, type TicketCall, type TicketCallStatus } from "@/types/ticket-call";

/** The first calls get a chip each beside the name; the rest are only in the history popover. */
const SHOWN = 3;

const STATUS: Record<TicketCallStatus, { label: string; className: string; Icon: typeof PhoneCall }> = {
  answered: { label: "Answered", className: "text-emerald-700 dark:text-emerald-400", Icon: PhoneCall },
  no_answer: { label: "No answer", className: "text-red-600 dark:text-red-400", Icon: PhoneMissed },
};

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th". */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function StatusLabel({ status }: { status: TicketCallStatus }) {
  const { label, className, Icon } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", className)}>
      <Icon className="size-3.5" /> {label}
    </span>
  );
}

/** Just the coloured icon (the header chips): the outcome's name is its accessible label. */
function StatusIcon({ status }: { status: TicketCallStatus }) {
  const { label, className, Icon } = STATUS[status];
  return (
    <span role="img" aria-label={label} className={className}>
      <Icon className="size-3.5" />
    </span>
  );
}

/** A local `datetime-local` value ("2026-10-14T15:30") for a Date. */
function toLocalInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/**
 * The calls agents made to the customer about a ticket, as chips beside the customer's name in the
 * chat header: the 1st, 2nd and 3rd call, in order, as an icon each (which call it is, the outcome, the time and who made it are on hover) and a "History" button.
 * Later calls are only in the history popover, which has every call's note and who made it. Shows
 * nothing until the first call is logged — calls are logged from <LogCallButton>.
 */
export function HeaderCalls({ ticketId }: { ticketId: string }) {
  const { data } = useTicketCalls(ticketId);
  const calls = data ?? [];
  if (calls.length === 0) return null;

  return (
    <>
      {calls.slice(0, SHOWN).map((call) => (
        <span
          key={call.id}
          title={`${ordinal(call.number)} call — ${STATUS[call.status].label}, ${formatDateTime(call.calledAt)} by ${
            call.caller.name ?? `Staff #${call.caller.id}`
          }`}
          className="inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5"
        >
          <StatusIcon status={call.status} />
        </span>
      ))}
      <CallHistory ticketId={ticketId} calls={calls} />
    </>
  );
}

/** Answered / No answer, as two buttons — used by the log form and the edit dialog. */
function OutcomePicker({ value, onChange }: { value: TicketCallStatus; onChange: (s: TicketCallStatus) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Call outcome">
      {(Object.keys(STATUS) as TicketCallStatus[]).map((s) => {
        const { label, Icon } = STATUS[s];
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
              active ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        );
      })}
    </div>
  );
}

/** Every call, newest first: outcome, when, who called, and the note. The agent who logged a call gets an
 * Edit button on it (only theirs — the backend refuses anyone else's); each change is in the action log. */
function CallHistory({ ticketId, calls }: { ticketId: string; calls: TicketCall[] }) {
  const newestFirst = [...calls].reverse();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TicketCall | null>(null);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="xs" aria-label="Call history" />}>
          <History /> Call history{calls.length > SHOWN ? ` (${calls.length})` : ""}
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Call history</p>
          <ul className="flex max-h-72 flex-col divide-y overflow-y-auto">
            {newestFirst.map((call) => (
              <li key={call.id} className="flex flex-col gap-0.5 py-2 text-xs first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{ordinal(call.number)} call</span>
                    <StatusLabel status={call.status} />
                  </span>
                  {me?.id === call.caller.id && (
                    <Button
                      variant="ghost"
                      size="xs"
                      aria-label={`Edit the ${ordinal(call.number)} call`}
                      onClick={() => {
                        setOpen(false);
                        setEditing(call);
                      }}
                    >
                      <Pencil /> Edit
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {formatDateTime(call.calledAt)} · by {call.caller.name ?? `Staff #${call.caller.id}`}
                </p>
                {call.note ? (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-foreground">{call.note}</p>
                ) : (
                  <p className="mt-0.5 text-muted-foreground italic">No note</p>
                )}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {editing && <EditCallDialog ticketId={ticketId} call={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Small dialog to correct the outcome and note of a call I logged. */
function EditCallDialog({ ticketId, call, onClose }: { ticketId: string; call: TicketCall; onClose: () => void }) {
  const [status, setStatus] = useState<TicketCallStatus>(call.status);
  const [note, setNote] = useState(call.note ?? "");
  const update = useUpdateTicketCall(ticketId);
  const unchanged = status === call.status && note.trim() === (call.note ?? "");

  function save() {
    update.mutate({ callId: call.id, status, note: note.trim() }, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !update.isPending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit the {ordinal(call.number)} call</DialogTitle>
          <DialogDescription>
            {formatDateTime(call.calledAt)}. Changes are recorded in the action log.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <OutcomePicker value={status} onChange={setStatus} />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Note
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={TICKET_CALL_NOTE_MAX_LENGTH}
              placeholder="What was said, what happens next…"
              className="min-h-24 text-xs md:text-xs"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={update.isPending || unchanged}>
              {update.isPending && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Log call" button with its small form — sits in the chat header, next to the status. */
export function LogCallButton({ ticketId }: { ticketId: string }) {
  const nextNumber = (useTicketCalls(ticketId).data?.length ?? 0) + 1;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TicketCallStatus>("answered");
  const [note, setNote] = useState("");
  const [calledAt, setCalledAt] = useState(() => toLocalInput(new Date()));
  const log = useLogTicketCall(ticketId);

  // Every time the form opens it starts from "now" and an empty note.
  function onOpenChange(next: boolean) {
    if (next) {
      setStatus("answered");
      setNote("");
      setCalledAt(toLocalInput(new Date()));
    }
    setOpen(next);
  }

  function submit() {
    const when = new Date(calledAt);
    log.mutate(
      {
        status,
        note: note.trim() || undefined,
        calledAt: Number.isNaN(when.getTime()) ? undefined : when.toISOString(),
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <PhoneCall /> <span className="hidden sm:inline">Log call</span>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="text-xs font-medium">Log the {ordinal(nextNumber)} call</p>

          <OutcomePicker value={status} onChange={setStatus} />

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Called at
            <Input
              type="datetime-local"
              value={calledAt}
              max={toLocalInput(new Date())}
              onChange={(e) => setCalledAt(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Note <span className="sr-only">(optional)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={TICKET_CALL_NOTE_MAX_LENGTH}
              placeholder="What was said, what happens next…"
              className="min-h-20 text-xs md:text-xs"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={log.isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={log.isPending || !calledAt}>
              {log.isPending && <Loader2 className="animate-spin" />} Save call
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
