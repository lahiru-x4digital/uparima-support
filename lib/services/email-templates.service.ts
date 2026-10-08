import { apiDelete, apiGet, apiGetPage, apiPost, apiPut } from "@/lib/api";
import type { TemplateListParams } from "@/types/template-list";
import type { EmailTemplate, EmailTemplateInput } from "@/types/message-template";

const BASE = "/support-desk/templates/email";

export const listEmailTemplates = (params: TemplateListParams) =>
  apiGetPage<EmailTemplate>(BASE, { params: { ...params, q: params.q || undefined } });
export const getEmailTemplate = (id: number) => apiGet<EmailTemplate>(`${BASE}/${id}`);
export const createEmailTemplate = (body: EmailTemplateInput) => apiPost<EmailTemplate>(BASE, body);
export const updateEmailTemplate = (id: number, body: EmailTemplateInput) => apiPut<EmailTemplate>(`${BASE}/${id}`, body);
export const deleteEmailTemplate = (id: number) => apiDelete(`${BASE}/${id}`);
