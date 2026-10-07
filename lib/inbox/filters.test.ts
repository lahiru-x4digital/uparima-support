import { describe, expect, it } from "vitest";
import type { Conversation, ConversationFilters } from "@/types/inbox";
import { applyClientFilters, toListParams } from "./filters";

const filters = (over: Partial<ConversationFilters> = {}): ConversationFilters => ({
  search: "",
  status: "all",
  channel: "all",
  assignee: "all",
  ...over,
});

const conv = (over: Partial<Conversation>): Conversation =>
  ({
    id: "t",
    ticketNumber: "TKT-1",
    customerName: "Kamal Perera",
    phone: "94771234567",
    subject: "Payment",
    channel: "whatsapp",
    assignedToUserId: null,
    ...over,
  }) as Conversation;

describe("toListParams", () => {
  it("asks the backend for email tickets only on the Email channel", () => {
    expect(toListParams(filters({ channel: "email" }))).toEqual({ source: "email" });
  });

  it("maps the needs-contact tab, a status and the WhatsApp channel to backend params", () => {
    expect(toListParams(filters())).toEqual({});
    expect(toListParams(filters({ status: "needs_contact" }))).toEqual({ needsContact: true });
    expect(toListParams(filters({ status: "in_review", channel: "whatsapp" }))).toEqual({
      status: "in_review",
      channel: "whatsapp",
    });
  });

  it("leaves channels the backend cannot filter to the browser", () => {
    expect(toListParams(filters({ channel: "driver_app" }))).toEqual({});
  });
});

describe("applyClientFilters", () => {
  const list = [
    conv({ id: "a", customerName: "Kamal Perera", assignedToUserId: 5 }),
    conv({ id: "b", customerName: "Nimali", ticketNumber: "TKT-2", phone: "94770000000", channel: "driver_app" }),
  ];
  const ids = (cs: Conversation[]) => cs.map((c) => c.id);

  it("searches name, ticket number and phone", () => {
    expect(ids(applyClientFilters(list, filters({ search: "kamal" }), 5))).toEqual(["a"]);
    expect(ids(applyClientFilters(list, filters({ search: "tkt-2" }), 5))).toEqual(["b"]);
    expect(ids(applyClientFilters(list, filters({ search: "0000" }), 5))).toEqual(["b"]);
  });

  it("filters by channel and assignee", () => {
    expect(ids(applyClientFilters(list, filters({ channel: "driver_app" }), 5))).toEqual(["b"]);
    expect(ids(applyClientFilters(list, filters({ assignee: "mine" }), 5))).toEqual(["a"]);
    expect(ids(applyClientFilters(list, filters({ assignee: "unassigned" }), 5))).toEqual(["b"]);
    expect(ids(applyClientFilters(list, filters({ assignee: "mine" }), null))).toEqual([]);
  });
});
