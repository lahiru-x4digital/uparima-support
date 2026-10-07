import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type {
  EmailAccount,
  EmailAccountInput,
  EmailAccountUpdate,
  EmailOauthStartInput,
  EmailProviderAvailability,
  ServiceAccountInput,
  EmailSyncResult,
  EmailTestInput,
  EmailTestResult,
} from "@/types/email-account";

const BASE = "/support-desk/email-accounts";

export const listEmailAccounts = () => apiGet<EmailAccount[]>(BASE);
export const getEmailProviders = () => apiGet<EmailProviderAvailability>(`${BASE}/providers`);
export const createEmailAccount = (body: EmailAccountInput) => apiPost<EmailAccount>(BASE, body);
export const createServiceAccountEmail = (body: ServiceAccountInput) =>
  apiPost<EmailAccount>(`${BASE}/service-account`, body);
export const updateEmailAccount = (id: number, body: EmailAccountUpdate) => apiPut<EmailAccount>(`${BASE}/${id}`, body);
export const deleteEmailAccount = (id: number) => apiDelete(`${BASE}/${id}`);
export const testEmailConnection = (body: EmailTestInput) => apiPost<EmailTestResult>(`${BASE}/test`, body);
/** Turn mail already in the mailbox (last `days` days) into tickets; safe to rerun. */
export const importEmailAccount = (id: number, days: number) =>
  apiPost<EmailSyncResult>(`${BASE}/${id}/import`, { days });
export const syncEmailAccount = (id: number) => apiPost<EmailSyncResult>(`${BASE}/${id}/sync`);
/** Returns the Google / Microsoft consent URL to send the browser to. */
export const startEmailOauth = (provider: "gmail" | "outlook", body: EmailOauthStartInput) =>
  apiPost<{ url: string }>(`${BASE}/oauth/${provider}/start`, body);

