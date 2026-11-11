/** WhatsApp bot texts: `GET|PUT|DELETE /admin/bot/texts`. */

export type BotLanguage = "en" | "si" | "ta";
export const BOT_LANGUAGES: readonly BotLanguage[] = ["en", "si", "ta"];
export const BOT_LANGUAGE_LABEL: Record<BotLanguage, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

export type BotTextValues = Record<BotLanguage, string>;

export interface BotText {
  key: string;
  /** The built-in text an override replaces. */
  defaults: BotTextValues;
  /** The current override; null when the bot uses the built-in text. */
  override: (BotTextValues & { version: number; updatedAt: string }) | null;
  /** `{names}` every language must keep. */
  placeholders: string[];
  maxLength: number;
}

export interface BotTextHistoryEntry {
  id: number;
  key: string;
  version: number;
  en: string | null;
  si: string | null;
  ta: string | null;
  /** "save" or "revert" (back to the built-in text). */
  action: string;
  changedBy: number | null;
  changedAt: string;
}

export interface BotTextListParams {
  search?: string;
  prefix?: string;
  modified?: boolean;
}
