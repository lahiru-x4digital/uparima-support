"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Check, Circle, Clock, Eye, Pencil, Trash2, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/lib/hooks/use-desk";
import { useDriverFollowupActions, useDriverFollowups } from "@/lib/hooks/use-driver-followups";
import { formatTime } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import {
  FOLLOWUP_DOC_PRESETS,
  FOLLOWUP_NOTE_MAX_LENGTH,
  type DriverFollowup,
  type DriverFollowupItem,
} from "@/types/driver-followup";

const HOUR = 3_600_000;
const DUE_CHOICES = [
  { key: "none", label: "No time", at: () => null },
  { key: "2h", label: "In 2 h", at: () => new Date(Date.now() + 2 * HOUR).toISOString() },
  { key: "tomorrow", label: "Tomorrow", at: () => new Date(Date.now() + 24 * HOUR).toISOString() },
  { key: "3d", label: "3 days", at: () => new Date(Date.now() + 72 * HOUR).toISOString() },
] as const;

const isOverdue = (f: DriverFollowup) => !!f.dueAt && new Date(f.dueAt).getTime() < Date.now();

/** Draft state for the set / edit form. */
function FollowupForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: DriverFollowup;
  saving: boolean;
  onSave: (v: { items: DriverFollowupItem[]; note: string; dueAt: string | null | undefined }) => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState<DriverFollowupItem[]>(initial?.items ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  // undefined = leave the existing due time alone (editing); a choice overrides it.
  const [due, setDue] = useState<string | null | undefined>(initial ? undefined : null);
  const [dueKey, setDueKey] = useState<string>(initial?.dueAt ? "keep" : "none");

  const has = (slot: string) => items.some((i) => i.slot === slot);
  const toggle = (slot: string) =>
    setItems((cur) => (cur.some((i) => i.slot === slot) ? cur.filter((i) => i.slot !== slot) : [...cur, { slot, received: false }]));

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border p-2.5">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Waiting for</span>
        <div className="flex flex-wrap gap-1">
          {FOLLOWUP_DOC_PRESETS.map((p) => (
            <button
              key={p.slot}
              type="button"
              aria-pressed={has(p.slot)}
              onClick={() => toggle(p.slot)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs transition-colors",
                has(p.slot) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Remind me</span>
        <div className="flex flex-wrap gap-1">
          {initial?.dueAt && (
            <button
              type="button"
              aria-pressed={dueKey === "keep"}
              onClick={() => {
                setDueKey("keep");
                setDue(undefined);
              }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs",
                dueKey === "keep" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {formatTime(initial.dueAt)}
            </button>
          )}
          {DUE_CHOICES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={dueKey === c.key}
              onClick={() => {
                setDueKey(c.key);
                setDue(c.at());
              }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs",
                dueKey === c.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        value={note}
        maxLength={FOLLOWUP_NOTE_MAX_LENGTH}
        rows={2}
        placeholder="Optional note, e.g. promised to send tonight"
        aria-label="Follow-up note"
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" disabled={saving} onClick={() => onSave({ items, note: note.trim(), dueAt: due })}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function FollowupCard({ followup: f, mine }: { followup: DriverFollowup; mine: boolean }) {
  const { update, seen, complete, take, remove } = useDriverFollowupActions();
  const [editing, setEditing] = useState(false);
  const overdue = isOverdue(f);
  const allReceived = f.items.length > 0 && f.items.every((i) => i.received);

  if (editing) {
    return (
      <FollowupForm
        initial={f}
        saving={update.isPending}
        onCancel={() => setEditing(false)}
        onSave={({ items, note, dueAt }) =>
          update.mutate(
            { id: f.id, input: { items, note, ...(dueAt !== undefined && { dueAt }) } },
            { onSuccess: () => setEditing(false) },
          )
        }
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-2.5 text-sm", f.newFiles > 0 && "border-primary/60 bg-primary/5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{mine ? "You are waiting" : `${f.owner.name ?? `Staff #${f.owner.id}`} is waiting`}</p>
          {f.dueAt && (
            <p className={cn("flex items-center gap-1 text-xs", overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
              <Clock className="size-3" /> {overdue ? "Overdue · " : "Due "}
              {formatTime(f.dueAt)}
            </p>
          )}
        </div>
        {f.newFiles > 0 && (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium leading-4 text-primary-foreground">
            {f.newFiles} new {f.newFiles === 1 ? "file" : "files"}
          </span>
        )}
      </div>

      {f.items.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {f.items.map((item) => (
            <li key={item.slot}>
              <button
                type="button"
                disabled={!mine || update.isPending}
                aria-pressed={item.received}
                onClick={() =>
                  update.mutate({
                    id: f.id,
                    input: { items: f.items.map((i) => (i.slot === item.slot ? { ...i, received: !i.received } : i)) },
                  })
                }
                className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs enabled:hover:bg-muted"
              >
                {item.received ? <Check className="size-3.5 text-emerald-600" /> : <Circle className="size-3.5 text-muted-foreground" />}
                <span className={cn(item.received && "text-muted-foreground line-through")}>{item.slot}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}
      {f.ticket && <p className="text-xs text-muted-foreground">Ticket {f.ticket.ticketNumber}</p>}
      {allReceived && mine && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Everything is in — mark it done.</p>}

      <div className="flex flex-wrap gap-1">
        {mine ? (
          <>
            {f.newFiles > 0 && (
              <Button size="xs" variant="outline" disabled={seen.isPending} onClick={() => seen.mutate(f.id)}>
                <Eye /> Seen
              </Button>
            )}
            <Button size="xs" variant={allReceived ? "default" : "outline"} disabled={complete.isPending} onClick={() => complete.mutate(f.id)}>
              <BookmarkCheck /> Done
            </Button>
            <Button size="xs" variant="ghost" aria-label="Edit follow-up" title="Edit" onClick={() => setEditing(true)}>
              <Pencil />
            </Button>
            <Button size="xs" variant="ghost" aria-label="Remove follow-up" title="Remove" disabled={remove.isPending} onClick={() => remove.mutate(f.id)}>
              <Trash2 />
            </Button>
          </>
        ) : (
          <Button size="xs" variant="outline" disabled={take.isPending} onClick={() => take.mutate(f.id)}>
            <UserRoundCheck /> Take over
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * "Waiting on documents" bookmark for a driver whose files arrive one at a time. Shows every open
 * follow-up on the driver (so a colleague sees who is waiting on what) and lets the viewer set
 * their own, tick off what arrived, finish it, or take a colleague's over on handoff.
 */
export function DriverFollowup({ driverId, ticketNumber }: { driverId: number; ticketNumber?: string }) {
  const { data: me } = useMe();
  const { data, isLoading, isError } = useDriverFollowups(driverId);
  const { add } = useDriverFollowupActions();
  const [creating, setCreating] = useState(false);

  const followups = data ?? [];
  const hasMine = followups.some((f) => f.owner.id === me?.id);

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading follow-ups…</p>;
  if (isError) return <p className="text-xs text-muted-foreground">Couldn&apos;t load follow-ups.</p>;

  return (
    <div className="flex flex-col gap-2">
      {followups.map((f) => (
        <FollowupCard key={f.id} followup={f} mine={f.owner.id === me?.id} />
      ))}
      {creating ? (
        <FollowupForm
          saving={add.isPending}
          onCancel={() => setCreating(false)}
          onSave={({ items, note, dueAt }) =>
            add.mutate(
              { driverId, input: { items, note, dueAt: dueAt ?? null, ticketNumber: ticketNumber || undefined } },
              { onSuccess: () => setCreating(false) },
            )
          }
        />
      ) : (
        !hasMine && (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setCreating(true)}>
            <Bookmark className="size-3.5" /> Follow up…
          </Button>
        )
      )}
    </div>
  );
}
