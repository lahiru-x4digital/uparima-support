export type EmailProvider = "gmail" | "outlook" | "imap";
export type EmailAuthType = "password" | "oauth" | "service_account";
export type EmailAccountStatus = "active" | "inactive" | "error";
export type EmailCategory = "riders" | "ads" | "hire";
export type EmailPriority = "low" | "normal" | "high" | "urgent";

/** A connected mailbox as returned by `/support-desk/email-accounts` (secrets are never included). */
export interface EmailAccount {
  id: number;
  name: string;
  email: string;
  provider: EmailProvider;
  authType: EmailAuthType;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  username: string;
  folder: string;
  status: EmailAccountStatus;
  defaultCategory: EmailCategory;
  defaultPriority: EmailPriority;
  lastSyncedAt: string | null;
  lastError: string | null;
  importedCount: number;
  hasSecret: boolean;
  createdAt: string;
}

/** Which providers offer one-click "Sign in" on this server. */
export interface EmailProviderAvailability {
  gmail: { oauth: boolean };
  outlook: { oauth: boolean };
}

/** Body for connecting a mailbox with a password / app password. */
export interface EmailAccountInput {
  name: string;
  email: string;
  provider: EmailProvider;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  username?: string;
  password: string;
  folder?: string;
  defaultCategory: EmailCategory;
  defaultPriority: EmailPriority;
}

/** Gmail through a Google Workspace service account (domain-wide delegation). */
export interface ServiceAccountInput {
  name: string;
  /** Mailbox the service account impersonates. */
  email: string;
  serviceAccountEmail: string;
  privateKey: string;
  folder?: string;
  defaultCategory: EmailCategory;
  defaultPriority: EmailPriority;
}

export interface EmailAccountUpdate {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  /** Service-account mailboxes: replace the stored key. */
  privateKey?: string;
  serviceAccountEmail?: string;
  name?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  username?: string;
  /** Blank / omitted keeps the stored password. */
  password?: string;
  folder?: string;
  defaultCategory?: EmailCategory;
  defaultPriority?: EmailPriority;
  status?: "active" | "inactive";
}

export interface EmailTestInput {
  serviceAccountEmail?: string;
  privateKey?: string;
  accountId?: number;
  provider?: EmailProvider;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  username?: string;
  password?: string;
  folder?: string;
}

export interface EmailTestResult {
  ok: boolean;
  message: string;
  messages?: number;
}

export interface EmailSyncResult {
  imported: number;
  replies: number;
  skipped: number;
  /** First run: the mailbox was just baselined, nothing imported. */
  baseline: boolean;
}

export interface EmailOauthStartInput {
  name: string;
  defaultCategory: EmailCategory;
  defaultPriority: EmailPriority;
}

