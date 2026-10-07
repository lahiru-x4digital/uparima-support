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
  /** True when older messages exist than the ones returned. */
  hasMore: boolean;
  messages: BotChatMessage[];
}
