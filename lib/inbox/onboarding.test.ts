import { describe, expect, it } from "vitest";
import type { Conversation, ConversationFilters } from "@/types/inbox";
import { applyClientFilters, toListParams } from "./filters";
import { isToOnboard } from "./onboarding";

const filters = (over: Partial<ConversationFilters> = {}): ConversationFilters => ({
  search: "",
  status: "to_onboard",
  channel: "all",
  assignee: "all",
  ...over,
});

const bot = (over: Partial<Conversation>): Conversation =>
  ({ id: "bot:94771234567:s1", status: "bot_only", channel: "whatsapp", assignedToUserId: null, customerName: "x", ticketNumber: "", phone: "1", subject: "", toOnboard: false, ...over }) as Conversation;

describe("isToOnboard", () => {
  it("counts drivers who haven't finished onboarding", () => {
    for (const status of ["incomplete", "pending", "rejected", "deleted"]) expect(isToOnboard(status, false)).toBe(true);
  });

  it("leaves out approved drivers and suspended ones (approved once)", () => {
    expect(isToOnboard("approved", false)).toBe(false);
    expect(isToOnboard("suspended", true)).toBe(false);
  });

  it("counts a number we have no record of, but not a rider or business we do", () => {
    expect(isToOnboard(null, true)).toBe(true);
    expect(isToOnboard(null, false)).toBe(false);
  });
});

describe("To onboard filter", () => {
  it("asks the backend for it", () => {
    expect(toListParams(filters())).toEqual({ toOnboard: true });
  });

  it("keeps only bot chats that need onboarding", () => {
    const yes = bot({ id: "bot:1:a", toOnboard: true });
    const no = bot({ id: "bot:2:a", toOnboard: false });
    expect(applyClientFilters([yes, no], filters(), null)).toEqual([yes]);
  });
});
