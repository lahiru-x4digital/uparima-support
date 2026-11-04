import { apiDelete, apiGet, apiPut } from "@/lib/api";
import type { BotText, BotTextHistoryEntry, BotTextListParams, BotTextValues } from "@/types/bot-text";

/** Admin only (bot-flows.view / .update). Keys contain dots, so they go through encodeURIComponent. */
const url = (key: string) => `/admin/bot/texts/${encodeURIComponent(key)}`;

export const listBotTexts = (params: BotTextListParams = {}) =>
  apiGet<BotText[]>("/admin/bot/texts", {
    params: { search: params.search || undefined, prefix: params.prefix || undefined, modified: params.modified ? "true" : undefined },
  });

export const saveBotText = (key: string, values: BotTextValues) => apiPut<BotText>(url(key), values);

/** Removes the override: the bot goes back to the built-in text. */
export const revertBotText = (key: string) => apiDelete<BotText>(url(key));

export const getBotTextHistory = (key: string) => apiGet<BotTextHistoryEntry[]>(`${url(key)}/history`);
