import type { WhatsappCategory, WhatsappStatus } from "@/types/message-template";

export const WA_STATUS: Record<WhatsappStatus, { label: string; className: string; hint: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", hint: "Not sent to Meta yet." },
  pending: { label: "In review", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", hint: "Meta is reviewing it, usually minutes, up to 24 hours." },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", hint: "Ready to send." },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", hint: "Fix it and submit again." },
  paused: { label: "Paused", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300", hint: "Paused by Meta after low ratings." },
  disabled: { label: "Disabled", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", hint: "Disabled by Meta." },
};

/** Statuses an agent may still edit and (re)submit. Mirrors the backend. */
export const EDITABLE: WhatsappStatus[] = ["draft", "rejected", "paused"];

export const CATEGORY_OPTIONS: { value: WhatsappCategory; label: string }[] = [
  { value: "UTILITY", label: "Utility — updates about a ride, ticket or account" },
  { value: "MARKETING", label: "Marketing — offers, news, promotions" },
];

// Meta language codes; Meta decides which it accepts for your account.
export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (en)" },
  { value: "en_US", label: "English US (en_US)" },
  { value: "en_GB", label: "English UK (en_GB)" },
  { value: "si", label: "Sinhala (si)" },
  { value: "ta", label: "Tamil (ta)" },
];

export const LIMITS = { header: 60, body: 1024, footer: 60, button: 25, buttons: 10, url: 2, phone: 1 } as const;
