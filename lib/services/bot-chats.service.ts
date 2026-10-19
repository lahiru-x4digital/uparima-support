import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import { voiceFileName } from "@/lib/services/tickets.service";
import type { BotChatConvertResult, BotChatReplyResult, BotChatRow, BotChatThread } from "@/types/bot-chat";

export const listBotChats = (params: { page: number; perPage: number; search?: string; incompleteDriver?: boolean; toOnboard?: boolean }) =>
  apiGetPage<BotChatRow>("/support-desk/bot-chats", { params });

/** The newest `limit` messages of one session, oldest first. `sessionId` null
 * means the legacy bucket of messages logged before sessions existed. */
export const getBotChat = (phone: string, sessionId: string | null, limit = 200) =>
  apiGet<BotChatThread>(`/support-desk/bot-chats/${phone}/messages`, {
    params: { sessionId: sessionId ?? "legacy", limit },
  });

/** A staff reply to a conversation with no ticket yet (or whose ticket is
 * closed): opens/reuses a ticket behind the scenes and delivers over
 * WhatsApp. Rejects with 403 once the 23.5h reply window has closed. */
export const replyToBotChat = (phone: string, message: string) =>
  apiPost<BotChatReplyResult>(`/support-desk/bot-chats/${phone}/replies`, { message });

/** A voice note to a conversation with no ticket yet: opens one and sends it there. */
export function voiceReplyToBotChat(phone: string, recording: Blob) {
  const form = new FormData();
  form.append("audio", recording, voiceFileName(recording));
  return apiPost<BotChatReplyResult>(`/support-desk/bot-chats/${phone}/voice-replies`, form, {
    headers: { "Content-Type": undefined },
  });
}

/** Manually marks a live WhatsApp conversation as a ticket, with no reply
 * sent — for when staff want to track it even though the bot never
 * escalated it to a hand-off. */
export const convertBotChatToTicket = (phone: string) =>
  apiPost<BotChatConvertResult>(`/support-desk/bot-chats/${phone}/convert`, {});
