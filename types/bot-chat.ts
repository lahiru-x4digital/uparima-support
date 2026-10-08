/** One session of a WhatsApp conversation with the bot (list row). A session
 * ends when a flow completes (ticket created, registration submitted, ride
 * cancelled/rated) or after 23h59m of inactivity; `sessionId` is `null` for
 * messages logged before sessions existed, grouped as one legacy row per
 * phone. */
export interface BotChatRow {
  phone: string;
  name: string | null;
  language: string | null;
  userId: number | null;
  state: string;
  sessionId: string | null;
  /** Whether this is the phone's *current* session — a reply can only be
   * offered from here, never from an older row for the same phone. */
  isCurrentSession: boolean;
  lastAt: string;
  lastDirection: "in" | "out";
  lastKind: string;
  lastBody: string;
  /** Whether this phone has an open hand-off ticket waiting on a person —
   * the same signal as a ticket's own needsContact, since from the
   * customer's side asking the bot for help and having an open ticket are
   * the same need. */
  needsContact: boolean;
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
    /** The phone's *current* session — may differ from the session being
     * viewed (see BotChatRow.sessionId on the row this thread came from). */
    sessionId: string | null;
    lastInboundAt: string | null;
    needsContact: boolean;
  };
  /** Whether this is the phone's current session (a reply always reaches
   * the person now, so it can't sensibly be offered from inside a session
   * that already ended — a different reason than the 23.5h window below). */
  isCurrentSession: boolean;
  /** Whether a staff reply can still go out as a free-form WhatsApp message
   * right now. Only meaningful when `isCurrentSession` is true. */
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
