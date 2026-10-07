import { describe, expect, it } from "vitest";
import type { Staff, TicketDetail, TicketRow } from "@/types/ticket";
import {
  attachmentOf,
  channelOf,
  detailToConversation,
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
    };
    const c = detailToConversation(detail, r, staff, NOW);
    expect(c.messages.map((m) => m.id)).toEqual(["t1:first", "r1", "r2"]);
    expect(c.messages[1]).toMatchObject({ direction: "outbound", sender: "Nimal" });
    expect(c.messages[2]).toMatchObject({ direction: "inbound", sender: "Kamal Perera" });
    expect(c.submitter).toMatchObject({ kind: "driver", vehicleRegistrationNumber: "CAB-1234" });
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
