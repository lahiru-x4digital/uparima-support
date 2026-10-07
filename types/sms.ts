export type SmsStatus = "sent" | "failed";

/** A selectable country, as returned by `/support-desk/sms/countries`. */
export interface SmsCountry {
  iso2: string;
  name: string;
  phonecode: string;
}

/** Body for POST /support-desk/sms/send. */
export interface SendSmsInput {
  countryIso2: string;
  phone: string;
  message: string;
}

/** An SMS send record, as returned by `/support-desk/sms/send` and `/support-desk/sms/history`. */
export interface SmsLog {
  id: string;
  phone: string;
  countryIso2: string;
  provider: string;
  message: string;
  status: SmsStatus;
  errorMessage: string | null;
  sentByUserId: number;
  sentByName: string | null;
  createdAt: string;
}

export interface SmsHistoryParams {
  page: number;
  perPage: number;
}

/** Controlled-input form shape (strings only, pre-submit). */
export interface SendSmsForm {
  countryIso2: string;
  phone: string;
  message: string;
}
