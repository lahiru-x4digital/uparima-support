import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { DriverNote, DriverNoteInput } from "@/types/driver-note";

const BASE = "/support-desk/drivers";

/** Newest first. */
export const listDriverNotes = (driverId: number | string) => apiGet<DriverNote[]>(`${BASE}/${driverId}/notes`);

export const addDriverNote = (driverId: number | string, input: DriverNoteInput) =>
  apiPost<DriverNote>(`${BASE}/${driverId}/notes`, input);

/** Only the author or an admin; the backend refuses anyone else. */
export const updateDriverNote = (noteId: string, input: DriverNoteInput) =>
  apiPatch<DriverNote>(`${BASE}/notes/${noteId}`, input);

export const deleteDriverNote = (noteId: string) => apiDelete<{ id: string }>(`${BASE}/notes/${noteId}`);
