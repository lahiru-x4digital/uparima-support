/** "queued" and "sending" only occur on a bulk batch's messages, while they wait or are with the provider. */
export type SmsStatus = "sent" | "failed" | "queued" | "sending";

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

// ---- Bulk SMS (super admins only): `/support-desk/sms/bulk/*`

/** riders: has requested a ride. drivers: has a driver profile. */
export type BulkSmsSegment = "all" | "riders" | "drivers";

/** A customer who can be texted, as listed by `/support-desk/sms/bulk/customers`. */
export interface BulkSmsCustomer {
  id: number;
  name: string | null;
  phone: string;
  joinedAt: string;
  isDriver: boolean;
  hasRides: boolean;
}

/** Which customers to list. `from` / `to` are joined-on days, YYYY-MM-DD (Sri Lanka time). */
export interface BulkSmsCustomerFilter {
  q: string;
  segment: BulkSmsSegment;
  from: string;
  to: string;
}

export interface BulkSmsCustomerParams extends BulkSmsCustomerFilter {
  page: number;
  perPage: number;
}

/** Every customer matching a filter, up to `limit` (the most one batch can hold); `total` is how many matched. */
export interface BulkSmsCustomerIds {
  ids: number[];
  total: number;
  limit: number;
}

/** Body for POST /support-desk/sms/bulk. */
export interface SendBulkSmsInput {
  userIds: number[];
  message: string;
}

/** `skipped`: chosen customers left out — no usable number, or the same number as another. */
export interface BulkSmsQueued {
  batchId: string;
  queued: number;
  skipped: number;
}

/** One bulk send and how far it has got. `pending` = queued or with the provider right now. */
export interface BulkSmsBatch {
  id: string;
  message: string;
  createdAt: string;
  sentByUserId: number;
  sentByName: string | null;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}
