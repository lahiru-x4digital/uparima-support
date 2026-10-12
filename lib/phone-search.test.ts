import { describe, expect, it } from "vitest";
import { phoneMatches } from "./phone-search";

describe("searching drivers by phone", () => {
  const stored = "94781095580";

  it("finds a number typed the way it is dialled", () => {
    expect(phoneMatches(stored, "0781095580")).toBe(true);
    expect(phoneMatches(stored, "078 109 5580")).toBe(true);
    expect(phoneMatches(stored, "078-109")).toBe(true);
  });

  it("finds a number typed with the country code", () => {
    expect(phoneMatches(stored, "94781095580")).toBe(true);
    expect(phoneMatches(stored, "+94 78 109 5580")).toBe(true);
  });

  it("still finds part of a number, and one stored in local form", () => {
    expect(phoneMatches(stored, "781095580")).toBe(true);
    expect(phoneMatches("0771234567", "077 123 4567")).toBe(true);
  });

  it("does not match a different number", () => {
    expect(phoneMatches(stored, "0781095581")).toBe(false);
    expect(phoneMatches(stored, "0711095580")).toBe(false);
  });

  it("leaves names and other text to the rest of the search", () => {
    expect(phoneMatches(stored, "kamal")).toBe(false);
    expect(phoneMatches(stored, "abz 4962")).toBe(false);
    expect(phoneMatches(stored, "07")).toBe(false);
    expect(phoneMatches(null, "0781095580")).toBe(false);
  });
});
