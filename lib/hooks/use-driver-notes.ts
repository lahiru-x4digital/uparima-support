"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { addDriverNote, deleteDriverNote, listDriverNotes, updateDriverNote } from "@/lib/services/driver-notes.service";
import type { DriverNoteInput } from "@/types/driver-note";
import { driverNoteKeys } from "./query-keys";

// Another agent's note arrives over the socket (support:driver_note); this poll is the fallback.
const POLL_MS = 60_000;

export function useDriverNotes(driverId: number | string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverNoteKeys.list(driverId),
    queryFn: () => listDriverNotes(driverId),
    enabled: !!user,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** Add / edit / delete for one driver's notes. Errors toast; callers keep the typed text on failure. */
export function useDriverNoteActions(driverId: number | string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: driverNoteKeys.list(driverId) });
  const onError = (failure: string) => (error: unknown) => toast.error(failure, { description: getErrorMessage(error) });

  const add = useMutation({
    mutationFn: (input: DriverNoteInput) => addDriverNote(driverId, input),
    onError: onError("Couldn't add the note"),
    onSettled: refresh,
  });
  const update = useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: DriverNoteInput }) => updateDriverNote(noteId, input),
    onError: onError("Couldn't save the note"),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (noteId: string) => deleteDriverNote(noteId),
    onSuccess: () => toast.success("Note deleted"),
    onError: onError("Couldn't delete the note"),
    onSettled: refresh,
  });
  return { add, update, remove };
}
