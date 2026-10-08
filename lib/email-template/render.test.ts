import { describe, expect, it } from "vitest";
import type { EmailDesign } from "@/types/message-template";
import { contrastText, formatInline, formatRichText, renderEmail, safeUrl } from "./render";

const design = (blocks: EmailDesign["blocks"]): EmailDesign => ({
  settings: { font: "sans", accent: "#6d28d9", background: "#f3f4f6", card: "#ffffff", text: "#111111", preheader: "Preview line", footer: "" },
  blocks,
});

describe("formatInline", () => {
  it("escapes markup before formatting", () => {
    expect(formatInline("<script>x</script> **hi**", "#000")).toBe("&lt;script&gt;x&lt;/script&gt; <strong>hi</strong>");
  });

  it("formats italic and safe links only", () => {
    expect(formatInline("*a* and _b_", "#000")).toBe("<em>a</em> and <em>b</em>");
    expect(formatInline("[site](https://uparima.lk)", "#f00")).toContain('<a href="https://uparima.lk"');
    expect(formatInline("[bad](javascript:alert(1))", "#f00")).not.toContain("<a");
  });

  it("leaves {{variables}} intact", () => {
    expect(formatInline("Hi {{customer_name}}", "#000")).toBe("Hi {{customer_name}}");
  });
});

describe("safeUrl", () => {
  it("allows web, mail, phone and variables", () => {
    expect(safeUrl("https://a.b")).toBe("https://a.b");
    expect(safeUrl("mailto:x@y.z")).toBe("mailto:x@y.z");
    expect(safeUrl("{{link}}")).toBe("{{link}}");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,x")).toBeNull();
  });
});

describe("formatRichText", () => {
  it("builds paragraphs and bullet lists", () => {
    const html = formatRichText("Line one\nline two\n\n- a\n- b", { color: "#000", link: "#000", size: 16, align: "left" });
    expect(html).toContain("Line one<br>line two");
    expect(html).toContain("<ul");
    expect(html.match(/<li/g)).toHaveLength(2);
  });
});

describe("contrastText", () => {
  it("picks white on dark and black on light", () => {
    expect(contrastText("#000000")).toBe("#ffffff");
    expect(contrastText("#ffff00")).toBe("#111111");
  });
});

describe("renderEmail", () => {
  it("renders blocks, preheader and skips unsafe images / buttons", () => {
    const html = renderEmail(
      design([
        { id: "1", type: "heading", text: "Hello", level: 1, align: "center" },
        { id: "2", type: "image", url: "https://cdn.x/a.png", alt: "Logo", width: 50, href: "", align: "center" },
        { id: "3", type: "image", url: "javascript:x", alt: "", width: 100, href: "", align: "center" },
        { id: "4", type: "button", label: "Go", url: "https://uparima.lk", align: "center" },
        { id: "5", type: "button", label: "Bad", url: "ftp://x", align: "center" },
      ]),
      "Subject <x>",
    );
    expect(html).toContain("<title>Subject &lt;x&gt;</title>");
    expect(html).toContain("Preview line");
    expect(html).toContain('<h1 style="margin:0;font-size:28px');
    expect(html).toContain('src="https://cdn.x/a.png"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain(">Go</a>");
    expect(html).not.toContain(">Bad</a>");
  });
});
