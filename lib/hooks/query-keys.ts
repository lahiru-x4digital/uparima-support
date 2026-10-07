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

export const rideKeys = { detail: (id: string) => ["ride", id] as const };

export const careTemplateKeys = {
  all: ["care-templates"] as const,
  detail: (id: number) => ["care-templates", id] as const,
};

export const botChatKeys = {
  all: ["bot-chats"] as const,
  list: (search: string) => ["bot-chats", "list", search] as const,
  thread: (phone: string) => ["bot-chats", "thread", phone] as const,
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
