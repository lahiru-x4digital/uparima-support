import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import type { SendSmsInput, SmsCountry, SmsHistoryParams, SmsLog } from "@/types/sms";

export const listSmsCountries = () => apiGet<SmsCountry[]>("/support-desk/sms/countries");

export const sendSms = (input: SendSmsInput) => apiPost<SmsLog>("/support-desk/sms/send", input);

export const listSmsHistory = (params: SmsHistoryParams) =>
  apiGetPage<SmsLog>("/support-desk/sms/history", { params });
