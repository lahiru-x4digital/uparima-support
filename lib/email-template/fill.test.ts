import { describe, expect, it } from "vitest";
import type { EmailDesign } from "@/types/message-template";
import { designToText, fillEmailVars } from "./fill";

describe("fillEmailVars", () => {
  it("fills known values, keeps unknown / empty ones, escapes for HTML", () => {
    expect(fillEmailVars("Hi {{customer_name}} {{ticket_number}} {{x}}", { customer_name: "Kamal" })).toBe("Hi Kamal {{ticket_number}} {{x}}");
    expect(fillEmailVars("<b>{{customer_name}}</b>", { customer_name: "<A>" }, true)).toBe("<b>&lt;A&gt;</b>");
  });
});

describe("designToText", () => {
  it("keeps text, headings and buttons as plain text", () => {
    const design = {
      settings: {},
      blocks: [
        { id: "1", type: "heading", text: "Hi **there**", level: 2, align: "left" },
        { id: "2", type: "text", text: "See [site](https://u.lk) *now*", align: "left" },
        { id: "3", type: "image", url: "https://x/a.png", alt: "", width: 100, href: "", align: "left" },
        { id: "4", type: "button", label: "Open", url: "https://u.lk", align: "left" },
      ],
    } as unknown as EmailDesign;
    expect(designToText(design)).toBe("Hi there\n\nSee site (https://u.lk) now\n\nOpen: https://u.lk");
  });
});
