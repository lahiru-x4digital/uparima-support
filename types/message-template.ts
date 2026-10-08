/** Product a template is for (same keys as email mailboxes). */
export type TemplateProduct = "riders" | "drivers" | "ads" | "hire";

// ── Email ────────────────────────────────────────────────────────────────
export type BlockAlign = "left" | "center" | "right";
export type EmailFont = "sans" | "serif" | "rounded" | "mono";

export type EmailBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3; align: BlockAlign }
  | { id: string; type: "text"; text: string; align: BlockAlign }
  | { id: string; type: "image"; url: string; alt: string; width: number; href: string; align: BlockAlign }
  | { id: string; type: "button"; label: string; url: string; align: BlockAlign }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; height: number };

export type EmailBlockType = EmailBlock["type"];

export interface EmailSettings {
  font: EmailFont;
  /** Buttons, links and the top accent bar. */
  accent: string;
  background: string;
  card: string;
  text: string;
  /** Inbox preview line shown next to the subject. */
  preheader: string;
  footer: string;
}

export interface EmailDesign {
  settings: EmailSettings;
  blocks: EmailBlock[];
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  product: TemplateProduct | null;
  design: EmailDesign;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateInput {
  name: string;
  subject: string;
  product: TemplateProduct | null;
  design: EmailDesign;
  html: string;
}

// ── WhatsApp ─────────────────────────────────────────────────────────────
export type WhatsappCategory = "UTILITY" | "MARKETING";
export type WhatsappHeaderType = "none" | "text";
export type WhatsappStatus = "draft" | "pending" | "approved" | "rejected" | "paused" | "disabled";

export interface WhatsappButton {
  type: "quick_reply" | "url" | "phone";
  text: string;
  url?: string;
  phone?: string;
}

export interface WhatsappTemplateInput {
  name: string;
  language: string;
  category: WhatsappCategory;
  product: TemplateProduct | null;
  headerType: WhatsappHeaderType;
  headerText: string | null;
  headerExample: string | null;
  body: string;
  bodyExamples: string[];
  footer: string | null;
  buttons: WhatsappButton[];
}

export interface WhatsappTemplate extends WhatsappTemplateInput {
  id: number;
  metaId: string | null;
  status: WhatsappStatus;
  rejectedReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Whether the server can submit templates to Meta. */
export interface WhatsappMetaStatus {
  configured: boolean;
}

export interface UploadedTemplateImage {
  key: string;
  url: string;
}
