import { describe, expect, it } from "vitest";
import type { CreateTicketsSummary, IncomingChat } from "@/types/whatsapp-incoming";
import { NO_FILTER, allBody, chatKey, finishedText, isFiltered, listParams, progressText, summaryText, ticketsToCreate } from "./filters";

const chat = (over: Partial<IncomingChat> = {}): IncomingChat => ({
  phone: "94771234567",
  name: "Kamal",
  language: "si",
  userId: 7,
  sessionId: "s1",
  isCurrentSession: true,
  startedAt: "2026-10-20T10:00:00Z",
  lastAt: "2026-10-20T10:05:00Z",
  lastDirection: "in",
  lastKind: "text",
  lastBody: "help",
  inboundCount: 2,
  ticket: null,
  ...over,
});

const ticket = {
  id: "t1",
  ticketNumber: "TKT-1",
  status: "pending",
  assignedToUserId: 5,
  assignedToName: "Azmi",
  queuedReason: null,
} as const;

describe("listParams", () => {
  it("sends only what is set", () => {
    expect(listParams(NO_FILTER, 1, 25)).toEqual({ page: 1, perPage: 25 });
    expect(listParams({ q: "077", ticket: "none", from: "2026-10-01", to: "" }, 2, 25)).toEqual({
      page: 2,
      perPage: 25,
      search: "077",
      ticket: "none",
      from: "2026-10-01",
    });
  });
});

describe("isFiltered", () => {
  it("is false for the default view and true once anything narrows it", () => {
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ ...NO_FILTER, ticket: "none" })).toBe(true);
    expect(isFiltered({ ...NO_FILTER, q: "x" })).toBe(true);
  });
});

describe("allBody", () => {
  it("keeps the search and dates but never the ticket choice", () => {
    expect(allBody({ q: "kamal", ticket: "has", from: "2026-10-01", to: "2026-10-07" })).toEqual({
      search: "kamal",
      from: "2026-10-01",
      to: "2026-10-07",
    });
    expect(allBody(NO_FILTER)).toEqual({});
  });
});

describe("ticketsToCreate", () => {
  it("sends only ticked rows that have no ticket", () => {
    const a = chat({ sessionId: "a" });
    const b = chat({ sessionId: "b", ticket: { ...ticket } });
    const c = chat({ sessionId: "c" });
    const ticked = new Set([chatKey(a), chatKey(b)]);
    expect(ticketsToCreate([a, b, c], ticked)).toEqual([{ phone: "94771234567", sessionId: "a" }]);
  });

  it("tells a phone's different conversations apart", () => {
    expect(chatKey(chat({ sessionId: "a" }))).not.toBe(chatKey(chat({ sessionId: "b" })));
    expect(chatKey(chat({ sessionId: null }))).toBe("94771234567|legacy");
  });
});

describe("summaryText", () => {
  const base: CreateTicketsSummary = { results: [], created: 0, existing: 0, assigned: 0, queued: 0, failed: 0 };

  it("reports created, assigned and waiting", () => {
    expect(summaryText({ ...base, created: 3, assigned: 2, queued: 1 })).toBe(
      "Created 3 tickets · 2 assigned, 1 waiting for an agent",
    );
  });

  it("separates tickets the phone already had open, and failures", () => {
    expect(summaryText({ ...base, created: 1, existing: 1, assigned: 2, failed: 1 })).toBe(
      "1 new ticket, 1 already open · 2 assigned · 1 failed",
    );
  });

  it("says so when nothing happened", () => {
    expect(summaryText(base)).toBe("Nothing to do");
  });
});

describe("run progress text", () => {
  const status = { state: "done", created: 40, assigned: 3, startedAt: "2026-10-27T08:00:00Z" } as const;

  it("shows progress, with failures when there are some", () => {
    expect(progressText({ created: 12 })).toBe("Working… opened 12 ticket(s) so far");
    expect(progressText({ created: 12, failed: 2 })).toBe("Working… opened 12 ticket(s) so far, 2 failed");
  });

  it("says why conversations got no ticket", () => {
    expect(finishedText(status)).toBe("Opened 40 ticket(s), 3 more assigned from the waiting queue.");
    expect(finishedText({ ...status, assigned: 0, failed: 2, errors: ["No account for this phone"] })).toBe(
      "Opened 40 ticket(s). 2 conversation(s) got no ticket (No account for this phone).",
    );
  });
});
