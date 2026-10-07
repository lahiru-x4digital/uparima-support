import { apiGet, apiGetPage } from "@/lib/api";
import type { BotChatRow, BotChatThread } from "@/types/bot-chat";

export const listBotChats = (params: { page: number; perPage: number; search?: string }) =>
  apiGetPage<BotChatRow>("/support-desk/bot-chats", { params });

/** The newest `limit` messages of one number, oldest first. */
export const getBotChat = (phone: string, limit = 200) =>
  apiGet<BotChatThread>(`/support-desk/bot-chats/${phone}/messages`, { params: { limit } });
