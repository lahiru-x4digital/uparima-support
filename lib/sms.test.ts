import { describe, expect, it } from "vitest";
import { smsParts } from "./sms";

describe("estimating how many SMS a message is billed as", () => {
  it("is nothing for an empty message", () => {
    expect(smsParts("")).toBe(0);
  });

  it("fits 160 plain characters in one SMS, then 153 per part", () => {
    expect(smsParts("a".repeat(160))).toBe(1);
    expect(smsParts("a".repeat(161))).toBe(2);
    expect(smsParts("a".repeat(306))).toBe(2);
    expect(smsParts("a".repeat(307))).toBe(3);
  });

  it("fits only 70 characters once the message has Sinhala, Tamil or an emoji", () => {
    expect(smsParts("ආයුබෝවන්")).toBe(1);
    expect(smsParts("அ".repeat(70))).toBe(1);
    expect(smsParts("අ".repeat(71))).toBe(2);
    expect(smsParts(`${"a".repeat(69)}🎉`)).toBe(2);
  });
});
