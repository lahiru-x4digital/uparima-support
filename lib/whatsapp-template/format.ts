import { escapeHtml } from "@/lib/email-template/render";

/** Variable numbers used in `text`: "Hi {{1}}, ride {{2}}" -> [1, 2]. Mirrors the backend check. */
export function templateVars(text: string): number[] {
  return [...new Set([...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
}

/** Next free variable number for "Add variable". */
export const nextVar = (text: string) => (templateVars(text).at(-1) ?? 0) + 1;

/**
 * WhatsApp-style preview HTML: *bold*, _italic_, ~strike~, ```mono```, with {{n}} replaced by its
 * sample value (highlighted) when one is given. Escaped first, so it is safe to inject.
 */
export function previewHtml(text: string, examples: string[]): string {
  let out = escapeHtml(text);
  out = out.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n: string) => {
    const v = examples[Number(n) - 1]?.trim();
    return `<span class="rounded bg-emerald-200/70 px-0.5 dark:bg-emerald-800/70">${v ? escapeHtml(v) : `{{${n}}}`}</span>`;
  });
  out = out.replace(/```([\s\S]+?)```/g, "<code>$1</code>");
  out = out.replace(/\*(?!\s)([^*\n]+?)\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^\w])_(?!\s)([^_\n]+?)_(?!\w)/g, "$1<em>$2</em>");
  out = out.replace(/~(?!\s)([^~\n]+?)~/g, "<s>$1</s>");
  return out.replace(/\n/g, "<br>");
}
