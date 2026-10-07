import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import type { BotChatReplyResult, BotChatRow, BotChatThread } from "@/types/bot-chat";

export const listBotChats = (params: { page: number; perPage: number; search?: string }) =>
  apiGetPage<BotChatRow>("/support-desk/bot-chats", { params });

/** The newest `limit` messages of one number, oldest first. */
export const getBotChat = (phone: string, limit = 200) =>
  apiGet<BotChatThread>(`/support-desk/bot-chats/${phone}/messages`, { params: { limit } });

/** A staff reply to a conversation with no ticket yet (or whose ticket is
 * closed): opens/reuses a ticket behind the scenes and delivers over
 * WhatsApp. Rejects with 403 once the 23.5h reply window has closed. */
export const replyToBotChat = (phone: string, message: string) =>
  apiPost<BotChatReplyResult>(`/support-desk/bot-chats/${phone}/replies`, { message });
