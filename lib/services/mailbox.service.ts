import { api, apiDelete, apiGet, apiPost } from "@/lib/api";
import type { MailDetail, MailListParams, MailPage, SendMailInput } from "@/types/mailbox";

const base = (accountId: number) => `/support-desk/mailbox/${accountId}/messages`;
// Message ids are base64url / Gmail ids, but encode anyway so a path can never be altered.
const msg = (accountId: number, id: string) => `${base(accountId)}/${encodeURIComponent(id)}`;

export const listMail = ({ accountId, folder, q }: MailListParams, pageToken?: string) =>
  apiGet<MailPage>(base(accountId), { params: { folder, q: q || undefined, pageToken, limit: 25 } });

export const getMail = (accountId: number, id: string) => apiGet<MailDetail>(msg(accountId, id));

export const setMailRead = (accountId: number, id: string, read: boolean) =>
  apiPost<void>(`${msg(accountId, id)}/read`, { read });

export const trashMail = (accountId: number, id: string) => apiDelete(msg(accountId, id));

/** Multipart: text fields plus any number of `files` as attachments. */
export function sendMail({ accountId, files, ...fields }: SendMailInput) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value);
  for (const file of files) form.append("files", file);
  return apiPost<{ id: string | null }>(`${base(accountId)}/send`, form, {
    headers: { "Content-Type": undefined },
  });
}

/** Attachments need the auth header, so they are fetched as a blob rather than linked. */
export async function downloadMailAttachment(accountId: number, id: string, attachmentId: string): Promise<Blob> {
  const res = await api.get<Blob>(`${msg(accountId, id)}/attachments/${encodeURIComponent(attachmentId)}`, {
    responseType: "blob",
  });
  return res.data;
}
