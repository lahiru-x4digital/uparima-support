import { beforeEach, describe, expect, it } from "vitest";
import { forgetSignedUrls, stableSignedUrl } from "./stable-url";
import { attachmentOf } from "./mappers";

const FILE = "https://bucket.s3.amazonaws.com/support/tickets/9/photo.jpg";
const signed = (file: string, date: string, signature: string, expires = 3600) =>
  `${file}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=${date}&X-Amz-Expires=${expires}&X-Amz-Signature=${signature}`;
const at = (iso: string) => Date.parse(iso);

describe("stableSignedUrl", () => {
  beforeEach(() => forgetSignedUrls());

  it("keeps handing back the first link for a file while it is still good", () => {
    const first = signed(FILE, "20261008T170000Z", "aaa");
    expect(stableSignedUrl(first, at("2026-10-08T17:00:00Z"))).toBe(first);
    // the same file, signed again 5 seconds later and again after half an hour
    expect(stableSignedUrl(signed(FILE, "20261008T170005Z", "bbb"), at("2026-10-08T17:00:05Z"))).toBe(first);
    expect(stableSignedUrl(signed(FILE, "20261008T173000Z", "ccc"), at("2026-10-08T17:30:00Z"))).toBe(first);
  });

  it("moves to the newer link shortly before the old one expires", () => {
    const first = signed(FILE, "20261008T170000Z", "aaa");
    stableSignedUrl(first, at("2026-10-08T17:00:00Z"));
    const later = signed(FILE, "20261008T175600Z", "ddd");
    expect(stableSignedUrl(later, at("2026-10-08T17:56:00Z"))).toBe(later);
    // ...and then sticks with that one
    expect(stableSignedUrl(signed(FILE, "20261008T175605Z", "eee"), at("2026-10-08T17:56:05Z"))).toBe(later);
  });

  it("treats different files separately", () => {
    const a = signed(FILE, "20261008T170000Z", "aaa");
    const b = signed(FILE.replace("photo", "slip"), "20261008T170005Z", "bbb");
    expect(stableSignedUrl(a, at("2026-10-08T17:00:00Z"))).toBe(a);
    expect(stableSignedUrl(b, at("2026-10-08T17:00:05Z"))).toBe(b);
  });

  it("leaves a plain key or an unsigned URL alone", () => {
    expect(stableSignedUrl("support/tickets/9/photo.jpg")).toBe("support/tickets/9/photo.jpg");
    expect(stableSignedUrl(FILE)).toBe(FILE);
  });

  it("assumes an hour for a link that does not say when it expires", () => {
    const first = `${FILE}?token=one`;
    expect(stableSignedUrl(first, at("2026-10-08T17:00:00Z"))).toBe(first);
    expect(stableSignedUrl(`${FILE}?token=two`, at("2026-10-08T17:30:00Z"))).toBe(first);
    expect(stableSignedUrl(`${FILE}?token=three`, at("2026-10-08T17:58:00Z"))).toBe(`${FILE}?token=three`);
  });
});

describe("attachmentOf", () => {
  beforeEach(() => forgetSignedUrls());

  it("gives a re-signed attachment the same key, so the open conversation does not reload its picture", () => {
    const first = attachmentOf(signed(FILE, "20261008T170000Z", "aaa"));
    const again = attachmentOf(signed(FILE, "20261008T170005Z", "bbb"));
    expect(again).toEqual(first);
    expect(first).toMatchObject({ name: "photo.jpg", kind: "image" });
  });
});
