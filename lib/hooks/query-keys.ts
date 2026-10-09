import type { TemplateListParams } from "@/types/template-list";
import type { TicketListParams } from "@/types/ticket";
import type { SmsHistoryParams } from "@/types/sms";

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => ["tickets", "list"] as const,
  list: (params: TicketListParams) => ["tickets", "list", params] as const,
  detail: (id: string) => ["tickets", "detail", id] as const,
  count: (name: string) => ["tickets", "count", name] as const,
};

export const deskKeys = {
  me: ["desk", "me"] as const,
  staff: ["desk", "staff"] as const,
};

export const accountKeys = { twoFactor: ["account", "two-factor"] as const };

export const rideKeys = { detail: (id: string) => ["ride", id] as const };

export const careTemplateKeys = {
  all: ["care-templates"] as const,
  list: (p: TemplateListParams) => ["care-templates", "list", p] as const,
  detail: (id: number) => ["care-templates", id] as const,
};

export const botChatKeys = {
  all: ["bot-chats"] as const,
  list: (search: string) => ["bot-chats", "list", search] as const,
  thread: (phone: string, sessionId: string | null) =>
    ["bot-chats", "thread", phone, sessionId ?? "legacy"] as const,
};

export const emailAccountKeys = {
  all: ["email-accounts"] as const,
  providers: ["email-accounts", "providers"] as const,
};

export const mailboxKeys = {
  all: ["mailbox"] as const,
  list: (accountId: number, folder: string, q: string) => ["mailbox", accountId, "list", folder, q] as const,
  message: (accountId: number, id: string) => ["mailbox", accountId, "message", id] as const,
};

export const smsKeys = {
  countries: ["sms", "countries"] as const,
  history: (params: SmsHistoryParams) => ["sms", "history", params] as const,
};

export const messageTemplateKeys = {
  email: ["email-templates"] as const,
  emailList: (p: TemplateListParams) => ["email-templates", "list", p] as const,
  emailDetail: (id: number) => ["email-templates", id] as const,
  whatsapp: ["whatsapp-templates"] as const,
  whatsappList: (p: TemplateListParams) => ["whatsapp-templates", "list", p] as const,
  whatsappDetail: (id: number) => ["whatsapp-templates", id] as const,
  whatsappMeta: ["whatsapp-templates", "meta-status"] as const,
};

export const driverKeys = {
  all: ["drivers"] as const,
  list: (status: string) => ["drivers", "list", status] as const,
  pending: ["drivers", "pending"] as const,
  detail: (id: string) => ["drivers", "detail", id] as const,
  subscription: (id: string) => ["drivers", "subscription", id] as const,
  devicePermissions: (id: string) => ["drivers", "device-permissions", id] as const,
  termsStatus: (id: string) => ["drivers", "terms-status", id] as const,
  vehicleTypes: ["drivers", "vehicle-types"] as const,
  vehicleMakes: (typeId: string) => ["drivers", "vehicle-makes", typeId] as const,
  vehicleModels: (typeId: string, makeId: string) => ["drivers", "vehicle-models", typeId, makeId] as const,
};

export const driverPaymentKeys = {
  all: ["driver-payments"] as const,
  platformFees: ["driver-payments", "platform-fees"] as const,
  platformFeeLedger: (driverId: number, page: number) =>
    ["driver-payments", "platform-fees", "ledger", driverId, page] as const,
  promotionBalances: ["driver-payments", "promotion-balances"] as const,
  withdrawals: (status: string, page: number) => ["driver-payments", "withdrawals", status, page] as const,
  settings: ["driver-payments", "settings"] as const,
};

export const rideHistoryKeys = {
  list: (p: unknown) => ["rides", "list", p] as const,
  path: (id: string) => ["rides", "path", id] as const,
  stadiaKey: ["rides", "stadia-key"] as const,
};

export const sosKeys = {
  all: ["sos"] as const,
  active: ["sos", "active"] as const,
  list: (status: string, page: number) => ["sos", "list", status, page] as const,
  detail: (id: string) => ["sos", "detail", id] as const,
};
