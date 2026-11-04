import type { BotLanguage, BotTextValues } from "@/types/bot-text";
import { BOT_LANGUAGES } from "@/types/bot-text";

/** The `{name}` placeholders in a text, unique and sorted. */
export function placeholdersOf(value: string): string[] {
  return [...new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
}

/** Characters as WhatsApp counts them (code points, not UTF-16 units). */
export const lengthOf = (value: string) => Array.from(value).length;

/** What each language is missing or has too much of, mirroring the server's checks so the editor can say so while typing. */
export function problemsFor(values: BotTextValues, placeholders: string[], maxLength: number): Partial<Record<BotLanguage, string>> {
  const out: Partial<Record<BotLanguage, string>> = {};
  for (const lang of BOT_LANGUAGES) {
    const text = values[lang];
    if (!text.trim()) {
      out[lang] = "Required";
      continue;
    }
    const found = placeholdersOf(text);
    const missing = placeholders.filter((p) => !found.includes(p));
    const extra = found.filter((p) => !placeholders.includes(p));
    if (missing.length) out[lang] = `Missing ${missing.map((p) => `{${p}}`).join(", ")}`;
    else if (extra.length) out[lang] = `Unknown ${extra.map((p) => `{${p}}`).join(", ")}`;
    else if (lengthOf(text) > maxLength) out[lang] = `Too long: ${lengthOf(text)} of ${maxLength}`;
  }
  return out;
}

/** Fills `{placeholders}` with sample values for the preview, like the bot does (an empty one drops its leading space). */
export function renderSample(text: string, samples: Record<string, string>): string {
  return text.replace(/( ?)\{(\w+)\}/g, (_m, space: string, name: string) => (samples[name] ? `${space}${samples[name]}` : ""));
}

/** The first part of a key, used to group texts (`btn`, `home`, `signup`…). */
export const groupOf = (key: string) => key.split(".")[0];
