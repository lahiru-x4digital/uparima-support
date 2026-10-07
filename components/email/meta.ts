import type { EmailAccountStatus, EmailCategory, EmailPriority, EmailProvider } from "@/types/email-account";

export const PROVIDER_META: Record<EmailProvider, { label: string; blurb: string }> = {
  gmail: { label: "Gmail / Google Workspace", blurb: "Sign in with Google, or use an app password." },
  outlook: { label: "Outlook / Microsoft 365", blurb: "Sign in with Microsoft, or use an app password." },
  imap: { label: "Other mailbox (IMAP)", blurb: "Zoho, Yahoo, cPanel, or any server that speaks IMAP." },
};

/** Which product the mailbox's tickets belong to. */
export const CATEGORY_OPTIONS: { value: EmailCategory; label: string }[] = [
  { value: "riders", label: "Riders" },
  { value: "ads", label: "Ads" },
  { value: "hire", label: "Hire" },
];

export const PRIORITY_OPTIONS: { value: EmailPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUS_META: Record<EmailAccountStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Paused", variant: "secondary" },
  error: { label: "Needs attention", variant: "destructive" },
};

/** Where an app password is created, shown as a hint under the password field. */
export const APP_PASSWORD_HINT: Record<EmailProvider, string> = {
  gmail: "Google Account → Security → 2-Step Verification → App passwords. Your normal password will not work.",
  outlook: "Microsoft account → Security → App passwords. Some work/school tenants block this; use Sign in instead.",
  imap: "The mailbox password (or an app password if your provider requires one).",
};

export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
