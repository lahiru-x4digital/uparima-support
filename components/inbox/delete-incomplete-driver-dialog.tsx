"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteIncompleteDriver } from "@/lib/hooks/use-drivers";
import { cn } from "@/lib/utils";
import {
  INCOMPLETE_DELETE_NOTE_MAX_LENGTH,
  INCOMPLETE_DELETE_REASONS,
  type IncompleteDeleteReason,
} from "@/types/driver";

/**
 * Removes an unfinished driver signup (the contact reached out by mistake) and closes their ticket.
 * A reason is mandatory: pick a preset, or "Other" and type one. It is kept as an internal driver note.
 */
export function DeleteIncompleteDriverDialog({
  open,
  onOpenChange,
  driverId,
  ticketNumber,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: number;
  ticketNumber?: string;
  onDeleted?: () => void;
}) {
  const [reason, setReason] = useState<IncompleteDeleteReason | null>(null);
  const [note, setNote] = useState("");
  const del = useDeleteIncompleteDriver();

  const trimmed = note.trim();
  const valid = reason !== null && (reason !== "other" || trimmed.length > 0);

  const reset = () => {
    setReason(null);
    setNote("");
  };

  const submit = async () => {
    if (!reason || !valid) return;
    await del.mutateAsync({
      id: driverId,
      input: { reason, note: trimmed || undefined, ticketNumber: ticketNumber || undefined },
    });
    reset();
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete incomplete driver</DialogTitle>
          <DialogDescription>
            This removes the unfinished driver profile and closes this ticket. The reason is saved for the team.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Reason (required)</span>
            <div className="flex flex-wrap gap-1">
              {INCOMPLETE_DELETE_REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={reason === r.key}
                  onClick={() => setReason(r.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    reason === r.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {reason === "other" ? "Note (required)" : "Extra note (optional)"}
            </span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={INCOMPLETE_DELETE_NOTE_MAX_LENGTH}
              rows={3}
              placeholder={reason === "other" ? "Why is this being deleted?" : "Anything else the team should know"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={!valid || del.isPending}>
            <Trash2 className="size-3.5" /> {del.isPending ? "Deleting…" : "Delete & close ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
