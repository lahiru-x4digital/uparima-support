import type { EmailBlock, EmailDesign } from "@/types/message-template";
import { escapeHtml } from "./render";

export type EmailVars = Partial<Record<"customer_name" | "ticket_number" | "agent_name", string>>;

/** Fills {{customer_name}} etc.; unknown or empty ones are left as-is. `html` escapes values. */
export function fillEmailVars(text: string, vars: EmailVars, html = false): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key as keyof EmailVars];
    if (!value) return match;
    return html ? escapeHtml(value) : value;
  });
}

const plain = (s: string) =>
  s
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1$2");

function blockText(b: EmailBlock): string | null {
  switch (b.type) {
    case "heading":
    case "text":
      return plain(b.text).trim() || null;
    case "button":
      return b.label.trim() && b.url.trim() ? `${b.label.trim()}: ${b.url.trim()}` : null;
    default:
      return null;
  }
}

/** Plain-text version of a design: the email's text part and the copy kept in the ticket thread. */
export function designToText(design: EmailDesign): string {
  return design.blocks.map(blockText).filter(Boolean).join("\n\n");
}
