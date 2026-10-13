"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, StickyNote, Ticket, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/shared/kbd";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, initialsOf, timeAgo } from "@/lib/format";
import { useDriverNoteActions, useDriverNotes } from "@/lib/hooks/use-driver-notes";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import { DRIVER_NOTE_MAX_LENGTH, type DriverNote, type DriverNoteInput } from "@/types/driver-note";

const COMPACT_SHOWN = 3;

/**
 * Staff-only notes on a driver: what was done, what's pending — so whoever picks the driver up
 * next carries on instead of starting over. Used in the inbox details panel (compact, linked to
 * the open ticket) and as the Notes tab on the driver dialog and page.
 */
export function DriverNotes({
  driverId,
  currentTicketNumber,
  compact = false,
  focusKey,
}: {
  driverId: number | string;
  /** The ticket being worked on: prefilled as the link for a new note, and its notes highlighted. */
  currentTicketNumber?: string;
  /** Inbox panel: the latest few notes, with "Show all". */
  compact?: boolean;
  /** Changing this focuses the note box (the composer's "Internal note" button). */
  focusKey?: number;
}) {
  const { data: notes, isLoading, error, refetch } = useDriverNotes(driverId);
  const { add, update, remove } = useDriverNoteActions(driverId);
  const { user } = useAuth();
  const isAdmin = user?.type === "admin" || user?.type === "super_admin";
  // Re-render every minute so "5 min ago" stays true.
  useNow(60_000);

  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DriverNote | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!focusKey) return;
    composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    composerRef.current?.focus({ preventScroll: true });
  }, [focusKey]);

  const list = notes ?? [];
  const shown = compact && !showAll ? list.slice(0, COMPACT_SHOWN) : list;
  const canChange = (n: DriverNote) => isAdmin || n.author.id === user?.id;
  const sameTicket = (n: DriverNote) =>
    !!currentTicketNumber && n.ticket?.ticketNumber.toUpperCase() === currentTicketNumber.toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <NoteEditor
        textareaRef={composerRef}
        initial={{ content: "", ticketNumber: currentTicketNumber ?? "" }}
        submitLabel="Add note"
        busy={add.isPending}
        placeholder="Leave a note for whoever picks this driver up next — what you did, what's pending…"
        resetOnSave
        onSave={(input) => add.mutateAsync(input)}
      />

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load notes: {getErrorMessage(error)}{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      ) : list.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
          <StickyNote className="size-4 shrink-0" /> No notes yet — leave one for whoever picks this up next.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((n) =>
            editingId === n.id ? (
              <li key={n.id} className="rounded-lg border p-2">
                <NoteEditor
                  initial={{ content: n.content, ticketNumber: n.ticket?.ticketNumber ?? "" }}
                  submitLabel="Save"
                  busy={update.isPending}
                  autoFocus
                  onSave={async (input) => {
                    await update.mutateAsync({ noteId: n.id, input });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={n.id}
                className={cn(
                  "group rounded-lg border px-3 py-2",
                  sameTicket(n) && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Avatar size="sm" className="size-6">
                    <AvatarFallback className="text-[10px]">{initialsOf(n.author.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate text-xs font-medium">{n.author.name ?? `Staff #${n.author.id}`}</span>
                  <span className="shrink-0 text-xs text-muted-foreground" title={formatDateTime(n.createdAt)}>
                    {timeAgo(n.createdAt)}
                    {n.edited && <span title={`Edited ${formatDateTime(n.updatedAt)}`}> · edited</span>}
                  </span>
                  {canChange(n) && (
                    <span className="ml-auto flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button size="icon-xs" variant="ghost" aria-label="Edit note" title="Edit" onClick={() => setEditingId(n.id)}>
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Delete note"
                        title="Delete"
                        className="text-destructive"
                        onClick={() => setDeleting(n)}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  )}
                </div>
                <p className="text-sm break-words whitespace-pre-wrap">{n.content}</p>
                {n.ticket && (
                  <span
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      sameTicket(n) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                    title={sameTicket(n) ? "Written about this ticket" : "Written about another ticket"}
                  >
                    <Ticket className="size-3" /> {n.ticket.ticketNumber}
                  </span>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {compact && list.length > COMPACT_SHOWN && (
        <Button size="xs" variant="ghost" className="self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show latest only" : `Show all ${list.length} notes`}
        </Button>
      )}

      <Modal open={!!deleting} onClose={() => !remove.isPending && setDeleting(null)} title="Delete this note?" className="sm:max-w-sm">
        <p className="line-clamp-4 rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{deleting?.content}</p>
        <p className="mt-2 text-xs text-muted-foreground">It disappears for every agent. This can&apos;t be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
          >
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** The note box: text, optional ticket link, Ctrl+Enter to save. Keeps the text if saving fails. */
function NoteEditor({
  initial,
  submitLabel,
  busy,
  placeholder,
  resetOnSave,
  autoFocus,
  textareaRef,
  onSave,
  onCancel,
}: {
  initial: { content: string; ticketNumber: string };
  submitLabel: string;
  busy: boolean;
  placeholder?: string;
  resetOnSave?: boolean;
  autoFocus?: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  onSave: (input: DriverNoteInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(initial.content);
  const [ticketNumber, setTicketNumber] = useState(initial.ticketNumber);
  const trimmed = content.trim();
  const tooLong = trimmed.length > DRIVER_NOTE_MAX_LENGTH;
  const canSave = trimmed !== "" && !tooLong && !busy;

  async function save() {
    if (!canSave) return;
    try {
      await onSave({ content: trimmed, ticketNumber: ticketNumber.trim() || undefined });
      if (resetOnSave) setContent("");
    } catch {
      // The mutation toasts; the text stays so nothing typed is lost.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        ref={textareaRef}
        value={content}
        autoFocus={autoFocus}
        rows={3}
        placeholder={placeholder}
        aria-label="Note"
        aria-invalid={tooLong || undefined}
        className="min-h-16 resize-y text-sm"
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void save();
          }
          if (e.key === "Escape" && onCancel) {
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
          <Ticket className="size-3.5 shrink-0" />
          <span className="sr-only">Ticket number (optional)</span>
          <Input
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            placeholder="Ticket (optional)"
            className="h-7 min-w-0 flex-1 text-xs"
          />
        </label>
        {tooLong && (
          <span className="text-xs text-destructive">
            {trimmed.length}/{DRIVER_NOTE_MAX_LENGTH}
          </span>
        )}
        {onCancel && (
          <Button size="xs" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button size="xs" onClick={() => void save()} disabled={!canSave}>
          {busy && <Loader2 className="animate-spin" />}
          {submitLabel}
          <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground/80">Ctrl ↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
