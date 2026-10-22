import { apiDelete, apiGet, apiGetPage, apiPost, apiPut } from "@/lib/api";
import { voiceFileName } from "@/lib/services/tickets.service";
import type { TemplateListParams } from "@/types/template-list";
import type { AudioTemplate, AudioTemplateInput } from "@/types/message-template";
import type { TicketReply } from "@/types/ticket";

const BASE = "/support-desk/templates/audio";
const MULTIPART = { headers: { "Content-Type": undefined } };

function form({ name, description, product, audio }: AudioTemplateInput) {
  const f = new FormData();
  f.append("name", name);
  f.append("description", description);
  f.append("product", product ?? "");
  if (audio) f.append("audio", audio, audio instanceof File ? audio.name : voiceFileName(audio));
  return f;
}

export const listAudioTemplates = (params: TemplateListParams) =>
  apiGetPage<AudioTemplate>(BASE, { params: { ...params, q: params.q || undefined } });
export const getAudioTemplate = (id: number) => apiGet<AudioTemplate>(`${BASE}/${id}`);
export const createAudioTemplate = (body: AudioTemplateInput) => apiPost<AudioTemplate>(BASE, form(body), MULTIPART);
export const updateAudioTemplate = (id: number, body: AudioTemplateInput) =>
  apiPut<AudioTemplate>(`${BASE}/${id}`, form(body), MULTIPART);
export const deleteAudioTemplate = (id: number) => apiDelete(`${BASE}/${id}`);

/** Sends to a ticket, or (no ticket yet) to the WhatsApp conversation by phone — which opens a ticket. */
export const sendAudioTemplate = (id: number, to: { ticketId: string } | { phone: string }) =>
  apiPost<{ reply: TicketReply; ticketId: string; ticketNumber?: string }>(`${BASE}/${id}/send`, to);
