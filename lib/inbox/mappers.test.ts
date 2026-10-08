import { describe, expect, it } from "vitest";
import type { Staff, TicketDetail, TicketRow } from "@/types/ticket";
import type { BotChatRow, BotChatThread } from "@/types/bot-chat";
import {
  attachmentOf,
  botChatId,
  botChatRowToConversation,
  botChatThreadToConversation,
  channelOf,
  detailToConversation,
  phoneFromBotChatId,
  productOf,
  rowToConversation,
  slaState,
  whatsappDigits,
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
      },
      replies: [
        { id: "r2", ticketId: "t1", authorId: 9, isStaffReply: false, message: "Thanks", attachments: null, createdAt: "2026-10-06T11:50:00Z" },
        { id: "r1", ticketId: "t1", authorId: 5, isStaffReply: true, message: "Calling you", attachments: null, createdAt: "2026-10-06T11:40:00Z" },
      ],
      canReply: true,
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["t1:first", "r1", "r2"]);
    expect(c.messages[1]).toMatchObject({ direction: "outbound", sender: "Nimal" });
    expect(c.messages[2]).toMatchObject({ direction: "inbound", sender: "Kamal Perera" });
    expect(c.submitter).toMatchObject({ kind: "driver", vehicleRegistrationNumber: "CAB-1234" });
  });
});

describe("botChatId / phoneFromBotChatId", () => {
  it("round-trips a phone number through the synthetic id", () => {
    expect(botChatId("94771234567")).toBe("bot:94771234567");
    expect(phoneFromBotChatId("bot:94771234567")).toBe("94771234567");
  });
  it("returns null for a real ticket id", () => {
    expect(phoneFromBotChatId("t1")).toBeNull();
  });
});

describe("botChatRowToConversation", () => {
  it("maps a bot-only row to a synthetic, read-no-ticket conversation", () => {
    const row: BotChatRow = {
      phone: "94771234567",
      name: "Kamal",
      language: "si",
      userId: 9,
      state: "idle",
      lastAt: "2026-10-06T11:40:00Z",
      lastDirection: "in",
      lastKind: "text",
      lastBody: "hi",
    };
    const c = botChatRowToConversation(row, NOW);
    expect(c.id).toBe("bot:94771234567");
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
      state: "idle",
      lastAt: "2026-10-06T11:40:00Z",
      lastDirection: "out",
      lastKind: "text",
      lastBody: "How can I help?",
    };
    const c = botChatRowToConversation(row, NOW);
    expect(c.customerName).toBe("+94771234567");
    expect(c.preview).toBe("Bot: How can I help?");
  });
});

describe("botChatThreadToConversation", () => {
  it("maps the thread's canReply window and messages", () => {
    const thread: BotChatThread = {
      contact: { phone: "94771234567", name: "Kamal", language: "si", userId: 9, state: "idle", lastInboundAt: "2026-10-06T11:40:00Z" },
      canReply: false,
      hasMore: false,
      messages: [
        { id: "1", direction: "in", kind: "text", body: "hi", meta: null, createdAt: "2026-10-06T11:40:00Z" },
        { id: "2", direction: "out", kind: "text", body: "Hello!", meta: null, createdAt: "2026-10-06T11:41:00Z" },
      ],
    };
    const c = botChatThreadToConversation("94771234567", thread, NOW);
    expect(c.canReply).toBe(false);
    expect(c.messages).toHaveLength(2);
    expect(c.messages[0]).toMatchObject({ direction: "inbound", sender: "Kamal" });
    expect(c.messages[1]).toMatchObject({ direction: "outbound", sender: "Bot" });
  });

  it("maps buttons/list messages to kind 'options' with their titles, and a tapped choice to kind 'tap'", () => {
    const thread: BotChatThread = {
      contact: { phone: "94771234567", name: "Kamal", language: "si", userId: 9, state: "idle", lastInboundAt: "2026-10-06T11:40:00Z" },
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
    const c = botChatThreadToConversation("94771234567", thread, NOW);
    expect(c.messages[0]).toMatchObject({ kind: "options", meta: { options: ["Book a ride", "Driver account", "My rides"] } });
    expect(c.messages[1]).toMatchObject({ kind: "tap", body: "Driver account" });
    expect(c.messages[2]).toMatchObject({ kind: "location_request" });
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
