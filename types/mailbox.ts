export type MailFolder = "inbox" | "sent" | "starred" | "trash";

export interface MailAddress {
  name: string | null;
  email: string;
}

export interface MailSummary {
  id: string;
  threadId: string | null;
  from: MailAddress;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  hasAttachments: boolean;
}

export interface MailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface MailDetail extends MailSummary {
  cc: string;
  replyTo: string | null;
  html: string | null;
  text: string | null;
  attachments: MailAttachment[];
  messageIdHeader: string | null;
  references: string | null;
}

export interface MailPage {
  messages: MailSummary[];
  nextPageToken: string | null;
}

export interface MailListParams {
  accountId: number;
  folder: MailFolder;
  q: string;
}

export interface SendMailInput {
  accountId: number;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  /** Id of the message being replied to (threads the reply). */
  replyToId?: string;
  files: File[];
}
