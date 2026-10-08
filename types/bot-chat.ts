/** One WhatsApp number that has talked to the bot (list row). */
export interface BotChatRow {
  phone: string;
  name: string | null;
  language: string | null;
  userId: number | null;
  state: string;
  lastAt: string;
  lastDirection: "in" | "out";
  lastKind: string;
  lastBody: string;
}

export interface BotChatMessage {
  id: string;
  direction: "in" | "out";
  kind: string;
  body: string;
  /** For `kind: "media"`, may include `mediaKind`/`mimeType` and, once the
   * backend has downloaded and stored the file (a few seconds later), an
   * `s3Key: string` the portal resolves into a real preview/player. */
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface BotChatThread {
  contact: {
    phone: string;
    name: string | null;
    language: string | null;
    userId: number | null;
    state: string;
    lastInboundAt: string | null;
  };
  /** Whether a staff reply can still go out as a free-form WhatsApp message
   * right now (server-computed from `lastInboundAt`, 23.5h window). */
  canReply: boolean;
  /** True when older messages exist than the ones returned. */
  hasMore: boolean;
  messages: BotChatMessage[];
}

/** `POST /support-desk/bot-chats/:phone/replies` */
export interface BotChatReplyResult {
  reply: { id: string; message: string; createdAt: string };
  ticketId: string;
  ticketNumber: string;
}
