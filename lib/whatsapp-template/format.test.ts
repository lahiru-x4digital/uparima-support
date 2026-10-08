import { describe, expect, it } from "vitest";
import { fillVars, nextVar, previewHtml, templateVars } from "./format";

describe("templateVars / nextVar", () => {
  it("finds variables and the next free number", () => {
    expect(templateVars("Hi {{1}} {{2}} {{1}}")).toEqual([1, 2]);
    expect(nextVar("Hi {{1}}")).toBe(2);
    expect(nextVar("Hi")).toBe(1);
  });
});

describe("previewHtml", () => {
  it("formats WhatsApp markup, fills samples and escapes HTML", () => {
    const html = previewHtml("*Hi* {{1}} _x_ ~y~ <b>", ["Kamal"]);
    expect(html).toContain("<strong>Hi</strong>");
    expect(html).toContain("Kamal");
    expect(html).toContain("<em>x</em>");
    expect(html).toContain("<s>y</s>");
    expect(html).toContain("&lt;b&gt;");
  });
});

describe("fillVars", () => {
  it("fills numbered variables and keeps missing ones", () => {
    expect(fillVars("Hi {{1}}, ride {{2}}", ["Kamal"])).toBe("Hi Kamal, ride {{2}}");
  });
});
