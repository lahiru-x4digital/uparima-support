import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import type { Paginated } from "@/types/ticket";
import type { SosAlert, SosAlertDetail } from "@/types/sos";

// SOS alerts — the backend's `/support-desk/sos/*`. Reading needs sos.view; acknowledging and
// resolving need sos.respond.

const BASE = "/support-desk/sos";

/** `status`: active | open | acknowledged | resolved | cancelled; none for all. */
export const listSos = (params: { status?: string; page: number; perPage?: number }): Promise<Paginated<SosAlert>> =>
  apiGetPage<SosAlert>(BASE, { params });

/** Open + acknowledged alerts, newest first. */
export const listActiveSos = () => apiGet<SosAlert[]>(`${BASE}/active`);

export const getSos = (id: string) => apiGet<SosAlertDetail>(`${BASE}/${id}`);

export const acknowledgeSos = (id: string) => apiPost<SosAlert>(`${BASE}/${id}/acknowledge`);

export const resolveSos = (id: string, note: string) => apiPost<SosAlert>(`${BASE}/${id}/resolve`, { note });
