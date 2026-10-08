import { apiDelete, apiGet, apiGetPage, apiPost, apiPut } from "@/lib/api";
import type { TemplateListParams } from "@/types/template-list";
import type { WhatsappMetaStatus, WhatsappTemplate, WhatsappTemplateInput } from "@/types/message-template";

const BASE = "/support-desk/templates/whatsapp";

export const listWhatsappTemplates = (params: TemplateListParams) =>
  apiGetPage<WhatsappTemplate>(BASE, { params: { ...params, q: params.q || undefined } });
export const getWhatsappTemplate = (id: number) => apiGet<WhatsappTemplate>(`${BASE}/${id}`);
export const getWhatsappMetaStatus = () => apiGet<WhatsappMetaStatus>(`${BASE}/status`);
export const createWhatsappTemplate = (body: WhatsappTemplateInput) => apiPost<WhatsappTemplate>(BASE, body);
export const updateWhatsappTemplate = (id: number, body: WhatsappTemplateInput) =>
  apiPut<WhatsappTemplate>(`${BASE}/${id}`, body);
export const deleteWhatsappTemplate = (id: number) => apiDelete(`${BASE}/${id}`);
/** Send to Meta for review. */
export const submitWhatsappTemplate = (id: number) => apiPost<WhatsappTemplate>(`${BASE}/${id}/submit`);
/** Pull the latest review status of every template from Meta. */
export const syncWhatsappTemplates = () => apiPost<{ updated: number }>(`${BASE}/sync`);
