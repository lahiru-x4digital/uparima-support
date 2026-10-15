import { describe, expect, it } from "vitest";
import type { Conversation, ConversationFilters } from "@/types/inbox";
import { applyClientFilters, reconcileFilters, toListParams } from "./filters";

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

  it("never sends the synthetic bot_only status to the ticket list endpoint", () => {
    expect(toListParams(filters({ status: "bot_only" }))).toEqual({});
  });
});

describe("applyClientFilters", () => {
  const list = [
    conv({ id: "a", customerName: "Kamal Perera", assignedToUserId: 5 }),
    conv({ id: "b", customerName: "Nimali", ticketNumber: "TKT-2", phone: "94770000000", channel: "driver_app" }),
  ];
  const ids = (cs: Conversation[]) => cs.map((c) => c.id);

  it("leaves text search to the backend", () => {
    expect(ids(applyClientFilters(list, filters({ search: "kamal" }), 5))).toEqual(["a", "b"]);
    expect(toListParams(filters({ search: "  kamal " }), 5).search).toBe("kamal");
  });

  it("filters by channel and assignee", () => {
    expect(ids(applyClientFilters(list, filters({ channel: "driver_app" }), 5))).toEqual(["b"]);
    expect(ids(applyClientFilters(list, filters({ assignee: "mine" }), 5))).toEqual(["a"]);
    expect(ids(applyClientFilters(list, filters({ assignee: "unassigned" }), 5))).toEqual(["b"]);
    expect(ids(applyClientFilters(list, filters({ assignee: "mine" }), null))).toEqual([]);
  });

  it("shows a bot-only (ticketless) row on every status tab, since it has no ticket status to match against", () => {
    const withBotOnly = [...list, conv({ id: "bot:94779999999", ticketNumber: "", status: "bot_only" })];
    expect(ids(applyClientFilters(withBotOnly, filters({ status: "all" }), 5))).toEqual(["a", "b", "bot:94779999999"]);
    expect(ids(applyClientFilters(withBotOnly, filters({ status: "completed" }), 5))).toEqual(["a", "b", "bot:94779999999"]);
    expect(ids(applyClientFilters(withBotOnly, filters({ status: "pending" }), 5))).toEqual(["a", "b", "bot:94779999999"]);
  });

  it("on the needs-contact tab, only shows a bot-only row that is itself flagged needsContact", () => {
    const withBotOnly = [
      ...list,
      conv({ id: "bot:waiting", ticketNumber: "", status: "bot_only", needsContact: true }),
      conv({ id: "bot:idle", ticketNumber: "", status: "bot_only", needsContact: false }),
    ];
    expect(ids(applyClientFilters(withBotOnly, filters({ status: "needs_contact" }), 5))).toEqual(["a", "b", "bot:waiting"]);
  });
});

describe("toListParams: Assigned to me", () => {
  it("orders by the newest assignment so a ticket that just landed on me is on top", () => {
    expect(toListParams(filters({ assignee: "mine" }), 5)).toEqual({ assignedToUserId: 5, sort: "assigned" });
  });

  it("does not sort or filter by assignee without a signed-in agent", () => {
    expect(toListParams(filters({ assignee: "mine" }), null)).toEqual({});
  });

  it("keeps the default newest-created order for every other assignee view", () => {
    expect(toListParams(filters({ assignee: "unassigned" }), 5)).toEqual({ unassigned: true });
    expect(toListParams(filters(), 5)).toEqual({});
  });
});

describe("toListParams: Waiting for agent", () => {
  it("works the queue closest deadline first, the order the router hands tickets out in", () => {
    expect(toListParams(filters({ status: "queued" }), 5)).toEqual({
      routingStatus: "queued",
      unassigned: true,
      sort: "queue",
    });
  });
});

describe("reconcileFilters", () => {
  it("steps Assigned to me back to all when Waiting for agent is chosen (a queued ticket has no owner)", () => {
    expect(reconcileFilters(filters({ assignee: "mine" }), { status: "queued" })).toMatchObject({
      status: "queued",
      assignee: "all",
    });
  });

  it("steps Waiting for agent back to everyone when Assigned to me is chosen", () => {
    expect(reconcileFilters(filters({ status: "queued" }), { assignee: "mine" })).toMatchObject({
      status: "all",
      assignee: "mine",
    });
  });

  it("leaves every other combination alone", () => {
    expect(reconcileFilters(filters({ assignee: "mine" }), { status: "pending" })).toMatchObject({
      status: "pending",
      assignee: "mine",
    });
    expect(reconcileFilters(filters({ status: "queued" }), { assignee: "unassigned" })).toMatchObject({
      status: "queued",
      assignee: "unassigned",
    });
  });
});
