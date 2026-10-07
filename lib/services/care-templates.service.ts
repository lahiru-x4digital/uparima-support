import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { CareTemplate, CareTemplateInput } from "@/types/care-template";

export const listCareTemplates = () => apiGet<CareTemplate[]>("/support-desk/care-templates");
export const getCareTemplate = (id: number) => apiGet<CareTemplate>(`/support-desk/care-templates/${id}`);
export const createCareTemplate = (body: CareTemplateInput) =>
  apiPost<CareTemplate>("/support-desk/care-templates", body);
export const updateCareTemplate = (id: number, body: CareTemplateInput) =>
  apiPut<CareTemplate>(`/support-desk/care-templates/${id}`, body);
export const deleteCareTemplate = (id: number) => apiDelete(`/support-desk/care-templates/${id}`);
