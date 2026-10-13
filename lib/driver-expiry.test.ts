import { describe, expect, it } from "vitest";
import { expiryStatus, formatDriverDate } from "./driver-review";

const now = new Date(2026, 9, 13, 15, 30); // 13 Oct 2026, mid-afternoon

describe("expiryStatus", () => {
  it("is missing without a date", () => {
    expect(expiryStatus(null, now).status).toBe("missing");
    expect(expiryStatus("not a date", now).status).toBe("missing");
  });
  it("treats today as soon, yesterday as expired", () => {
    expect(expiryStatus("2026-10-13", now)).toEqual({ status: "soon", days: 0 });
    expect(expiryStatus("2026-10-12", now)).toEqual({ status: "expired", days: -1 });
  });
  it("is soon within 30 days and ok after", () => {
    expect(expiryStatus("2026-11-12", now).status).toBe("soon");
    expect(expiryStatus("2026-11-13", now).status).toBe("ok");
  });
});

describe("formatDriverDate", () => {
  it("formats day-month-year unambiguously", () => {
    expect(formatDriverDate("2026-03-04")).toBe("04 Mar 2026");
    expect(formatDriverDate(null)).toBe("—");
  });
});
