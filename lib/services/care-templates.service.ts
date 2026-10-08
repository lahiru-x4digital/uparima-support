import { apiDelete, apiGet, apiGetPage, apiPost, apiPut } from "@/lib/api";
import type { TemplateListParams } from "@/types/template-list";
import type { CareTemplate, CareTemplateInput } from "@/types/care-template";

export const listCareTemplates = (params: TemplateListParams) =>
  apiGetPage<CareTemplate>("/support-desk/care-templates", { params: { ...params, q: params.q || undefined } });
export const getCareTemplate = (id: number) => apiGet<CareTemplate>(`/support-desk/care-templates/${id}`);
export const createCareTemplate = (body: CareTemplateInput) =>
  apiPost<CareTemplate>("/support-desk/care-templates", body);
export const updateCareTemplate = (id: number, body: CareTemplateInput) =>
  apiPut<CareTemplate>(`/support-desk/care-templates/${id}`, body);
export const deleteCareTemplate = (id: number) => apiDelete(`/support-desk/care-templates/${id}`);
