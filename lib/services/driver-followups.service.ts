import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { DriverFollowup, DriverFollowupInput } from "@/types/driver-followup";

const BASE = "/support-desk/drivers";

/** Open follow-ups on one driver. */
export const listDriverFollowups = (driverId: number | string) =>
  apiGet<DriverFollowup[]>(`${BASE}/${driverId}/followups`);

/** The caller's open follow-ups: new files first, then overdue, then soonest due. */
export const listMyFollowups = () => apiGet<DriverFollowup[]>(`${BASE}/followups/mine`);

/** One open follow-up per driver and owner: asking again updates it. */
export const addDriverFollowup = (driverId: number | string, input: DriverFollowupInput) =>
  apiPost<DriverFollowup>(`${BASE}/${driverId}/followups`, input);

/** Owner or admin only. */
export const updateDriverFollowup = (id: string, input: DriverFollowupInput) =>
  apiPatch<DriverFollowup>(`${BASE}/followups/${id}`, input);

/** The owner has looked at the new files. */
export const markFollowupSeen = (id: string) => apiPost<DriverFollowup>(`${BASE}/followups/${id}/seen`, {});

export const completeDriverFollowup = (id: string) => apiPost<{ id: string }>(`${BASE}/followups/${id}/complete`, {});

/** Anyone on the desk can pick up a colleague's follow-up (shift handoff). */
export const takeDriverFollowup = (id: string) => apiPost<DriverFollowup>(`${BASE}/followups/${id}/take`, {});

export const deleteDriverFollowup = (id: string) => apiDelete<{ id: string }>(`${BASE}/followups/${id}`);
