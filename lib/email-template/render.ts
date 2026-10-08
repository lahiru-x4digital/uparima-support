import type { BlockAlign, EmailBlock, EmailDesign, EmailFont } from "@/types/message-template";

/**
 * Turns an editor design into send-ready email HTML: table layout + inline styles, which is what
 * Gmail / Outlook / Apple Mail render reliably. Pure, so the live preview and the saved HTML match.
 */

export const FONT_STACKS: Record<EmailFont, string> = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  rounded: "'Trebuchet MS', Verdana, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

const CONTENT_WIDTH = 600;
const PADDING_X = 32;
const INNER_WIDTH = CONTENT_WIDTH - PADDING_X * 2;
const HEADING_SIZES = { 1: 28, 2: 22, 3: 18 } as const;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Only links an email should contain: web, mail, phone, or a {{variable}} filled in at send time. */
export function safeUrl(url: string): string | null {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:|tel:)\S+$/i.test(u) || /^\{\{\s*[\w.]+\s*\}\}$/.test(u)) return u;
  return null;
}

/** Readable text colour (black or white) on a hex background. */
export function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}

const color = (hex: string, fallback: string) => (/^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : fallback);

/**
 * Inline formatting on already-escaped text: **bold**, *italic* / _italic_, [label](url).
 * Escaping first means user text can never inject markup; links are re-checked with safeUrl.
 */
export function formatInline(text: string, linkColor: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = safeUrl(url.replace(/&amp;/g, "&"));
    return href ? `<a href="${escapeHtml(href)}" style="color:${linkColor};text-decoration:underline">${label}</a>` : label;
  });
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1<em>$2</em>");
  return out;
}

/** Paragraphs split on blank lines; "- " lines become a bullet list; single newlines become <br>. */
export function formatRichText(text: string, style: { color: string; link: string; size: number; align: BlockAlign }): string {
  const p = `margin:0 0 14px;font-size:${style.size}px;line-height:1.6;color:${style.color};text-align:${style.align}`;
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const items = lines.map((l) => `<li style="margin:0 0 6px">${formatInline(l.replace(/^\s*[-*]\s+/, ""), style.link)}</li>`).join("");
        return `<ul style="${p};padding-left:22px;text-align:left">${items}</ul>`;
      }
      return `<p style="${p}">${lines.map((l) => formatInline(l, style.link)).join("<br>")}</p>`;
    })
    .join("");
}

function block(b: EmailBlock, d: EmailDesign): string {
  const s = d.settings;
  const accent = color(s.accent, "#6d28d9");
  const textColor = color(s.text, "#1f2937");
  const row = (inner: string, pad = "8px") => `<tr><td style="padding:${pad} ${PADDING_X}px">${inner}</td></tr>`;

  switch (b.type) {
    case "heading": {
      const size = HEADING_SIZES[b.level];
      return row(
        `<h${b.level} style="margin:0;font-size:${size}px;line-height:1.3;font-weight:bold;color:${textColor};text-align:${b.align}">${formatInline(b.text, accent)}</h${b.level}>`,
        "12px",
      );
    }
    case "text":
      return row(formatRichText(b.text, { color: textColor, link: accent, size: 16, align: b.align }), "4px");
    case "image": {
      const src = safeUrl(b.url);
      if (!src) return "";
      const pct = Math.min(100, Math.max(10, b.width || 100));
      const px = Math.round((INNER_WIDTH * pct) / 100);
      let img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(b.alt)}" width="${px}" style="display:inline-block;width:${pct}%;max-width:${px}px;height:auto;border:0;outline:none;text-decoration:none;border-radius:6px">`;
      const href = b.href ? safeUrl(b.href) : null;
      if (href) img = `<a href="${escapeHtml(href)}" target="_blank">${img}</a>`;
      return row(`<div style="text-align:${b.align};line-height:0">${img}</div>`);
    }
    case "button": {
      const href = safeUrl(b.url);
      if (!href || !b.label.trim()) return "";
      const fg = contrastText(accent);
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${b.align === "center" ? "center" : b.align}" style="margin:8px 0"><tr><td style="border-radius:6px;background:${accent}"><a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:12px 26px;font-size:16px;font-weight:bold;color:${fg};text-decoration:none;border-radius:6px">${escapeHtml(b.label)}</a></td></tr></table>`,
      );
    }
    case "divider":
      return row(`<div style="border-top:1px solid #e5e7eb;font-size:0;line-height:0">&nbsp;</div>`, "12px");
    case "spacer":
      return `<tr><td style="height:${Math.min(120, Math.max(4, b.height))}px;font-size:0;line-height:0">&nbsp;</td></tr>`;
  }
}

export function renderEmail(design: EmailDesign, subject: string): string {
  const s = design.settings;
  const bg = color(s.background, "#f3f4f6");
  const card = color(s.card, "#ffffff");
  const accent = color(s.accent, "#6d28d9");
  const font = FONT_STACKS[s.font] ?? FONT_STACKS.sans;
  const preheader = s.preheader.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(s.preheader)}</div>`
    : "";
  const footer = s.footer.trim()
    ? `<tr><td style="padding:16px ${PADDING_X}px 0">${formatRichText(s.footer, { color: "#6b7280", link: "#6b7280", size: 12, align: "center" })}</td></tr>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${bg};font-family:${font}">${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="${CONTENT_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${CONTENT_WIDTH}px;background:${card};border-radius:10px;border-top:4px solid ${accent};font-family:${font}">
<tr><td style="height:16px;font-size:0;line-height:0">&nbsp;</td></tr>
${design.blocks.map((b) => block(b, design)).join("\n")}
<tr><td style="height:24px;font-size:0;line-height:0">&nbsp;</td></tr>
</table>
<table role="presentation" width="${CONTENT_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${CONTENT_WIDTH}px;font-family:${font}">${footer}</table>
</td></tr></table>
</body></html>`;
}
