import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import type {
  BulkSmsBatch,
  BulkSmsCustomer,
  BulkSmsCustomerFilter,
  BulkSmsCustomerIds,
  BulkSmsCustomerParams,
  BulkSmsQueued,
  SendBulkSmsInput,
  SendSmsInput,
  SmsCountry,
  SmsHistoryParams,
  SmsLog,
} from "@/types/sms";

export const listSmsCountries = () => apiGet<SmsCountry[]>("/support-desk/sms/countries");

export const sendSms = (input: SendSmsInput) => apiPost<SmsLog>("/support-desk/sms/send", input);

export const listSmsHistory = (params: SmsHistoryParams) =>
  apiGetPage<SmsLog>("/support-desk/sms/history", { params });

// ---- Bulk SMS (super admins only)

const BULK = "/support-desk/sms/bulk";

// The backend refuses an empty filter value, so only what is set is sent.
const filterParams = ({ q, segment, driverStatus, from, to }: BulkSmsCustomerFilter) => ({
  ...(q.trim() ? { q: q.trim() } : {}),
  ...(segment !== "all" ? { segment } : {}),
  ...(driverStatus !== "all" ? { driverStatus } : {}),
  ...(from ? { from } : {}),
  ...(to ? { to } : {}),
});

export const listBulkSmsCustomers = ({ page, perPage, ...filter }: BulkSmsCustomerParams) =>
  apiGetPage<BulkSmsCustomer>(`${BULK}/customers`, { params: { ...filterParams(filter), page, perPage } });

export const listBulkSmsCustomerIds = (filter: BulkSmsCustomerFilter) =>
  apiGet<BulkSmsCustomerIds>(`${BULK}/customers/ids`, { params: filterParams(filter) });

export const sendBulkSms = (input: SendBulkSmsInput) => apiPost<BulkSmsQueued>(BULK, input);

export const listBulkSmsBatches = (params: { page: number; perPage: number }) =>
  apiGetPage<BulkSmsBatch>(`${BULK}/batches`, { params });

export const cancelBulkSmsBatch = (id: string) => apiPost<BulkSmsBatch>(`${BULK}/batches/${id}/cancel`);
