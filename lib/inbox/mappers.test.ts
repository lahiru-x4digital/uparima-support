import { describe, expect, it } from "vitest";
import type { Staff, TicketDetail, TicketRow } from "@/types/ticket";
import type { BotChatRow, BotChatThread } from "@/types/bot-chat";
import {
  attachmentOf,
  botChatId,
  botChatRefFromId,
  botChatRowToConversation,
  botChatThreadToConversation,
  channelOf,
  detailToConversation,
  isNewToMe,
  productOf,
  rowToConversation,
  slaState,
  whatsappDigits,
  timeAgo,
} from "./mappers";

const NOW = new Date("2026-10-06T12:00:00Z");
const staff: Staff[] = [{ id: 5, name: "Nimal" }];

const row = (over: Partial<TicketRow> = {}): TicketRow => ({
  id: "t1",
  ticketNumber: "TKT-1",
  userId: 9,
  submitterType: "driver",
  category: "uparima_rides",
  subject: "[WhatsApp] Talk to a person",
  message: "My payment is missing",
  attachments: ["support/tickets/voice.ogg"],
  status: "pending",
  priority: "normal",
  assignedToUserId: null,
  slaDueAt: "2026-10-06T14:00:00Z",
  rideId: null,
  reporterPhone: "94771234567",
  loggedByUserId: null,
  channel: "whatsapp",
  needsContact: true,
  contactPreference: "call",
  topic: "person",
  contactLanguage: "si",
  contactedAt: null,
  contactedByUserId: null,
  createdAt: "2026-10-06T11:30:00Z",
  updatedAt: "2026-10-06T11:30:00Z",
  submitterName: "Kamal Perera",
  submitterPhone: "94771234567",
  submitterDriverStatus: null,
  unseen: false,
  ...over,
});

describe("channelOf", () => {
  it("prefers whatsapp, then agent-logged phone, then the app by submitter type", () => {
    expect(channelOf(row())).toBe("whatsapp");
    expect(channelOf(row({ channel: "app", loggedByUserId: 3 }))).toBe("phone");
    expect(channelOf(row({ channel: "app", source: "email" }))).toBe("email");
    expect(channelOf(row({ channel: "app" }))).toBe("driver_app");
    expect(channelOf(row({ channel: "app", submitterType: "user" }))).toBe("rider_app");
  });
});

describe("rowToConversation", () => {
  it("carries the WhatsApp hand-off fields and the first message", () => {
    const c = rowToConversation(row(), staff, NOW);
    expect(c).toMatchObject({
      customerName: "Kamal Perera",
      phone: "94771234567",
      role: "driver",
      channel: "whatsapp",
      needsContact: true,
      contactPreference: "call",
      topic: "person",
      language: "si",
    });
    expect(c.messages).toHaveLength(1);
    expect(c.messages[0]).toMatchObject({ direction: "inbound", body: "My payment is missing" });
    expect(c.messages[0].attachments[0]).toMatchObject({ kind: "audio", name: "voice.ogg" });
  });

  it("falls back to the reporter phone and names the assignee", () => {
    const c = rowToConversation(
      row({ submitterName: null, submitterPhone: null, assignedToUserId: 5, userId: null }),
      staff,
      NOW,
    );
    expect(c.customerName).toBe("94771234567");
    expect(c.assignedTo).toBe("Nimal");
  });
});

describe("detailToConversation", () => {
  it("orders replies oldest first and marks staff replies outbound", () => {
    const r = row();
    const detail: TicketDetail = {
      ticket: r,
      submitter: {
        kind: "driver",
        driverId: 3,
        name: "Kamal Perera",
        phone: "94771234567",
        status: "approved",
        vehicleRegistrationNumber: "CAB-1234",
        suspensionReason: null,
        averageRating: 4.8,
        totalRides: 120,
        creditBalance: 0,
        platformFeeOwedLkr: 0,
      },
      replies: [
        { id: "r2", ticketId: "t1", authorId: 9, isStaffReply: false, message: "Thanks", attachments: null, createdAt: "2026-10-06T11:50:00Z" },
        { id: "r1", ticketId: "t1", authorId: 5, isStaffReply: true, message: "Calling you", attachments: null, createdAt: "2026-10-06T11:40:00Z" },
      ],
      canReply: true,
      whatsappSession: null,
      previousTickets: [],
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["t1:first", "r1", "r2"]);
    expect(c.messages[1]).toMatchObject({ direction: "outbound", sender: "Nimal" });
    expect(c.messages[2]).toMatchObject({ direction: "inbound", sender: "Kamal Perera" });
    expect(c.submitter).toMatchObject({ kind: "driver", vehicleRegistrationNumber: "CAB-1234" });
  });

  it("shows earlier tickets' chats above the current one, each under a divider", () => {
    const r = row();
    const earlier = { ...row(), id: "t0", ticketNumber: "TKT-OLD", message: "old question", status: "completed" as const, createdAt: "2026-10-01T09:00:00Z" };
    const detail: TicketDetail = {
      ticket: r,
      submitter: null,
      replies: [],
      canReply: true,
      whatsappSession: null,
      previousTickets: [],
      earlierConversations: [
        {
          ticket: earlier,
          replies: [{ id: "o1", ticketId: "t0", authorId: 5, isStaffReply: true, message: "Sorted", attachments: null, createdAt: "2026-10-01T10:00:00Z" }],
          whatsappSession: null,
        },
      ],
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["t0:divider", "t0:first", "o1", "t1:divider", "t1:first"]);
    expect(c.messages[0]).toMatchObject({ kind: "divider" });
    expect(c.messages[0].body).toContain("TKT-OLD");
    expect(c.messages[0].body).toContain("Closed");
  });

  it("mirrors the real WhatsApp session instead of the ticket's placeholder message, when one is linked", () => {
    const r = row();
    const detail: TicketDetail = {
      ticket: r,
      submitter: {
        kind: "driver",
        driverId: 3,
        name: "Kamal Perera",
        phone: "94771234567",
        status: "approved",
        vehicleRegistrationNumber: "CAB-1234",
        suspensionReason: null,
        averageRating: 4.8,
        totalRides: 120,
        creditBalance: 0,
        platformFeeOwedLkr: 0,
      },
      replies: [
        { id: "r1", ticketId: "t1", authorId: 5, isStaffReply: true, message: "Calling you", attachments: null, createdAt: "2026-10-06T11:40:00Z" },
      ],
      canReply: true,
      whatsappSession: [
        { id: "1", direction: "out", kind: "buttons", body: "What would you like to do?", meta: { options: ["Talk to a person"] }, createdAt: "2026-10-06T11:00:00Z" },
        { id: "2", direction: "in", kind: "tap", body: "Talk to a person", meta: { id: "sup:topic:person" }, createdAt: "2026-10-06T11:01:00Z" },
      ],
      previousTickets: [],
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["1", "2", "r1"]);
    expect(c.messages[0]).toMatchObject({ kind: "options", direction: "outbound" });
    expect(c.messages[1]).toMatchObject({ kind: "tap", direction: "inbound", body: "Talk to a person" });
  });
});

describe("agent replies in a WhatsApp session", () => {
  it("shows an agent's reply once, labelled with the agent, in time order with the customer's messages", () => {
    const r = row();
    const detail: TicketDetail = {
      ticket: r,
      submitter: null,
      replies: [
        { id: "r1", ticketId: "t1", authorId: 5, isStaffReply: true, message: "Calling you", attachments: null, createdAt: "2026-10-06T11:40:00Z" },
      ],
      canReply: true,
      whatsappSession: [
        { id: "1", direction: "in", kind: "text", body: "help", meta: {}, createdAt: "2026-10-06T11:30:00Z" },
        { id: "2", direction: "out", kind: "text", body: "Calling you", meta: {}, createdAt: "2026-10-06T11:40:01Z" },
        { id: "3", direction: "in", kind: "text", body: "ok thanks", meta: {}, createdAt: "2026-10-06T11:41:00Z" },
      ],
      previousTickets: [],
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["1", "2", "3"]);
    expect(c.messages[1]).toMatchObject({ direction: "outbound", sender: "Nimal" });
  });
});

describe("customer follow-ups saved as replies", () => {
  it("shows a follow-up once when the WhatsApp session log already has it", () => {
    const r = row();
    const detail: TicketDetail = {
      ticket: r,
      submitter: null,
      replies: [
        { id: "c1", ticketId: "t1", authorId: 9, isStaffReply: false, message: "any news?", attachments: null, createdAt: "2026-10-06T11:41:01Z" },
        { id: "c2", ticketId: "t1", authorId: 9, isStaffReply: false, message: "[Photo]", attachments: null, createdAt: "2026-10-06T11:42:00Z" },
      ],
      canReply: true,
      whatsappSession: [
        { id: "1", direction: "in", kind: "text", body: "any news?", meta: {}, createdAt: "2026-10-06T11:41:00Z" },
        { id: "2", direction: "in", kind: "media", body: "Photo", meta: {}, createdAt: "2026-10-06T11:42:00Z" },
      ],
      previousTickets: [],
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("botChatId / botChatRefFromId", () => {
  it("round-trips a phone and session through the synthetic id", () => {
    expect(botChatId("94771234567", "s1")).toBe("bot:94771234567:s1");
    expect(botChatRefFromId("bot:94771234567:s1")).toEqual({ phone: "94771234567", sessionId: "s1" });
  });
  it("encodes a null session as the legacy bucket", () => {
    expect(botChatId("94771234567", null)).toBe("bot:94771234567:legacy");
    expect(botChatRefFromId("bot:94771234567:legacy")).toEqual({ phone: "94771234567", sessionId: null });
  });
  it("returns null for a real ticket id", () => {
    expect(botChatRefFromId("t1")).toBeNull();
  });
});

describe("botChatRowToConversation", () => {
  it("maps a bot-only row to a synthetic, read-no-ticket conversation", () => {
    const row: BotChatRow = {
      phone: "94771234567",
      name: "Kamal",
      language: "si",
      userId: 9,
      submitter: null,
      state: "idle",
      sessionId: "s1",
      isCurrentSession: true,
      lastAt: "2026-10-06T11:40:00Z",
      lastDirection: "in",
      lastKind: "text",
      lastBody: "hi",
      needsContact: false,
      unseen: false,
    };
    const c = botChatRowToConversation(row, NOW);
    expect(c.id).toBe("bot:94771234567:s1");
    expect(c.ticketNumber).toBe("");
    expect(c.status).toBe("bot_only");
    expect(c.priority).toBeNull();
    expect(c.canReply).toBe(true);
    expect(c.preview).toBe("hi");
  });

  it("prefixes the bot's own message in the preview", () => {
    const row: BotChatRow = {
      phone: "94771234567",
      name: null,
      language: null,
      userId: null,
      submitter: null,
      state: "idle",
      sessionId: null,
      isCurrentSession: false,
      lastAt: "2026-10-06T11:40:00Z",
      lastDirection: "out",
      lastKind: "text",
      lastBody: "How can I help?",
      needsContact: false,
      unseen: false,
    };
    const c = botChatRowToConversation(row, NOW);
    expect(c.customerName).toBe("+94771234567");
    expect(c.preview).toBe("Bot: How can I help?");
    expect(c.id).toBe("bot:94771234567:legacy");
  });

  it("carries the backend's needsContact flag straight through", () => {
    const row: BotChatRow = {
      phone: "94771234567",
      name: "Kamal",
      language: "si",
      userId: 9,
      submitter: null,
      state: "idle",
      sessionId: "s1",
      isCurrentSession: true,
      lastAt: "2026-10-06T11:40:00Z",
      lastDirection: "in",
      lastKind: "text",
      lastBody: "help",
      needsContact: true,
      unseen: false,
    };
    expect(botChatRowToConversation(row, NOW).needsContact).toBe(true);
  });
});

describe("botChatThreadToConversation", () => {
  it("maps the thread's canReply window and messages", () => {
    const thread: BotChatThread = {
      contact: {
        phone: "94771234567",
        name: "Kamal",
        language: "si",
        userId: 9,
        submitter: null,
        state: "idle",
        sessionId: "s1",
        lastInboundAt: "2026-10-06T11:40:00Z",
        needsContact: false,
      },
      isCurrentSession: true,
      canReply: false,
      hasMore: false,
      messages: [
        { id: "1", direction: "in", kind: "text", body: "hi", meta: null, createdAt: "2026-10-06T11:40:00Z" },
        { id: "2", direction: "out", kind: "text", body: "Hello!", meta: null, createdAt: "2026-10-06T11:41:00Z" },
      ],
    };
    const c = botChatThreadToConversation("94771234567", "s1", thread, NOW);
    expect(c.id).toBe("bot:94771234567:s1");
    expect(c.canReply).toBe(false);
    expect(c.messages).toHaveLength(2);
    expect(c.messages[0]).toMatchObject({ direction: "inbound", sender: "Kamal" });
    expect(c.messages[1]).toMatchObject({ direction: "outbound", sender: "Bot" });
  });

  it("maps buttons/list messages to kind 'options' with their titles, and a tapped choice to kind 'tap'", () => {
    const thread: BotChatThread = {
      contact: {
        phone: "94771234567",
        name: "Kamal",
        language: "si",
        userId: 9,
        submitter: null,
        state: "idle",
        sessionId: "s1",
        lastInboundAt: "2026-10-06T11:40:00Z",
        needsContact: false,
      },
      isCurrentSession: true,
      canReply: true,
      hasMore: false,
      messages: [
        {
          id: "1",
          direction: "out",
          kind: "buttons",
          body: "What would you like to do?",
          meta: { options: ["Book a ride", "Driver account", "My rides"] },
          createdAt: "2026-10-06T11:40:00Z",
        },
        { id: "2", direction: "in", kind: "tap", body: "Driver account", meta: { id: "hub:menu" }, createdAt: "2026-10-06T11:40:30Z" },
        {
          id: "3",
          direction: "out",
          kind: "location_request",
          body: "Share your current location",
          meta: null,
          createdAt: "2026-10-06T11:41:00Z",
        },
      ],
    };
    const c = botChatThreadToConversation("94771234567", "s1", thread, NOW);
    expect(c.messages[0]).toMatchObject({ kind: "options", meta: { options: ["Book a ride", "Driver account", "My rides"] } });
    expect(c.messages[1]).toMatchObject({ kind: "tap", body: "Driver account" });
    expect(c.messages[2]).toMatchObject({ kind: "location_request" });
  });

  it("renders a real attachment once the backend has stored the media, and falls back otherwise", () => {
    const thread: BotChatThread = {
      contact: {
        phone: "94771234567",
        name: "Kamal",
        language: "si",
        userId: 9,
        submitter: null,
        state: "idle",
        sessionId: "s1",
        lastInboundAt: "2026-10-06T11:40:00Z",
        needsContact: false,
      },
      isCurrentSession: true,
      canReply: true,
      hasMore: false,
      messages: [
        {
          id: "1",
          direction: "in",
          kind: "media",
          body: "Photo",
          meta: { mediaKind: "image", mimeType: "image/jpeg", s3Key: "support/whatsapp-media/wamid.1/abc.jpg" },
          createdAt: "2026-10-06T11:40:00Z",
        },
        {
          id: "2",
          direction: "in",
          kind: "media",
          body: "Document",
          meta: { mediaKind: "audio", mimeType: "audio/ogg" },
          createdAt: "2026-10-06T11:41:00Z",
        },
      ],
    };
    const c = botChatThreadToConversation("94771234567", "s1", thread, NOW);
    expect(c.messages[0].attachments).toEqual([
      { key: "support/whatsapp-media/wamid.1/abc.jpg", name: "abc.jpg", kind: "image" },
    ]);
    expect(c.messages[1].attachments).toEqual([]);
  });

  it("flags needsContact from the backend, not from bot state", () => {
    const thread: BotChatThread = {
      contact: {
        phone: "94771234567",
        name: "Kamal",
        language: "si",
        userId: 9,
        submitter: null,
        state: "idle",
        sessionId: "s2",
        lastInboundAt: "2026-10-06T11:40:00Z",
        needsContact: true,
      },
      isCurrentSession: false,
      canReply: true,
      hasMore: false,
      messages: [],
    };
    expect(botChatThreadToConversation("94771234567", "s1", thread, NOW).needsContact).toBe(true);
  });
});

describe("slaState", () => {
  it("reports time left and overdue time", () => {
    expect(slaState(null, NOW)).toBeNull();
    expect(slaState("2026-10-06T15:00:00Z", NOW)).toEqual({ label: "Due in 3h", overdue: false, soon: false });
    expect(slaState("2026-10-06T12:25:00Z", NOW)).toEqual({ label: "Due in 25m", overdue: false, soon: true });
    expect(slaState("2026-10-06T09:30:00Z", NOW)).toEqual({ label: "Overdue 2h", overdue: true, soon: false });
    expect(slaState("2026-10-03T12:00:00Z", NOW)?.label).toBe("Overdue 3d");
  });
});

describe("helpers", () => {
  it("classifies attachments by extension", () => {
    expect(attachmentOf("a/b/photo.JPG").kind).toBe("image");
    expect(attachmentOf("a/b/voice.m4a").kind).toBe("audio");
    expect(attachmentOf("a/b/receipt.pdf").kind).toBe("file");
  });

  it("keeps only digits for wa.me links", () => {
    expect(whatsappDigits("+94 77 123 4567")).toBe("94771234567");
  });
});

describe("productOf", () => {
  it("maps app and email category keys to a product", () => {
    expect(productOf("uparima_rides")).toBe("riders");
    expect(productOf("ride_reports")).toBe("riders");
    expect(productOf("riders")).toBe("riders");
    expect(productOf("uparima_rides", "driver")).toBe("drivers");
    expect(productOf("uparima_rides", "user")).toBe("riders");
    expect(productOf("drivers")).toBe("drivers");
    expect(productOf("uparima_ads")).toBe("ads");
    expect(productOf("ads")).toBe("ads");
    expect(productOf("uparima_jobs")).toBe("hire");
    expect(productOf("hire")).toBe("hire");
    expect(productOf("uparima_mart")).toBe("mart");
    expect(productOf("")).toBeNull();
    expect(productOf("something_else")).toBeNull();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("reads minutes, hours and days", () => {
    expect(timeAgo("2026-10-15T11:55:00Z", now)).toBe("5m ago");
    expect(timeAgo("2026-10-15T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-10-13T12:00:00Z", now)).toBe("2d ago");
  });

  it("says just now under a minute, and never goes negative for a clock-skewed time", () => {
    expect(timeAgo("2026-10-15T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-15T12:05:00Z", now)).toBe("just now");
  });

  it("is empty for a bad date", () => {
    expect(timeAgo("not a date", now)).toBe("");
  });
});

describe("isNewToMe", () => {
  const routing = { assignedAt: "2026-10-15T10:00:00Z", firstOpenedAt: null as string | null };
  const ticket = (over: Record<string, unknown> = {}) => ({
    assignedToUserId: 5,
    status: "pending" as const,
    routing,
    ...over,
  });

  it("is new when it is mine and I have not opened it", () => {
    expect(isNewToMe(ticket(), 5)).toBe(true);
  });

  it("is not new once I have opened it", () => {
    expect(isNewToMe(ticket({ routing: { ...routing, firstOpenedAt: "2026-10-15T10:05:00Z" } }), 5)).toBe(false);
  });

  it("is still new to me when a colleague opened it before it was reassigned (the backend clears it on every assignment)", () => {
    // Nothing on the row remembers the earlier opener: the flag only reflects the current assignee.
    expect(isNewToMe(ticket({ routing: { ...routing, firstOpenedAt: null } }), 5)).toBe(true);
  });

  it("is not new for someone else's ticket, an unassigned one, a finished one, or a bot chat", () => {
    expect(isNewToMe(ticket({ assignedToUserId: 6 }), 5)).toBe(false);
    expect(isNewToMe(ticket({ assignedToUserId: null }), 5)).toBe(false);
    expect(isNewToMe(ticket({ status: "completed" }), 5)).toBe(false);
    expect(isNewToMe(ticket({ routing: null }), 5)).toBe(false);
  });

  it("is never new without a signed-in agent", () => {
    expect(isNewToMe(ticket(), null)).toBe(false);
    expect(isNewToMe(ticket(), undefined)).toBe(false);
  });

  it("needs a recorded assignment time", () => {
    expect(isNewToMe(ticket({ routing: { assignedAt: null as unknown as string, firstOpenedAt: null } }), 5)).toBe(false);
  });
});
