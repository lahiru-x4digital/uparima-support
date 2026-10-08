// The backend signs every attachment link afresh on each request, and an open conversation is
// re-fetched every few seconds — so the same file would arrive under a new address each time, and
// the browser would throw the picture away and download it again. This keeps the first signed link
// it saw for a file and hands that back until the link is close to expiring.

/** Swap to a newer link once the one in use has less than this left. */
const RENEW_BEFORE_MS = 5 * 60_000;
/** Assumed lifetime of a link that doesn't say when it expires (the backend signs for an hour). */
const DEFAULT_LIFETIME_MS = 60 * 60_000;

const remembered = new Map<string, { url: string; expiresAt: number }>();

/** When a signed link stops working, from its X-Amz-Date / X-Amz-Expires; null if it doesn't say. */
function expiryOf(url: string): number | null {
  const query = new URLSearchParams(url.slice(url.indexOf("?") + 1));
  const date = query.get("X-Amz-Date")?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const seconds = Number(query.get("X-Amz-Expires"));
  if (!date || !Number.isFinite(seconds) || seconds <= 0) return null;
  const [, y, mo, d, h, mi, s] = date.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s) + seconds * 1000;
}

/**
 * The link to use for a file: the one already in use for it while that is still good, otherwise
 * the one given. A plain key or an unsigned URL (no query string) is returned untouched.
 */
export function stableSignedUrl(url: string, now: number = Date.now()): string {
  const queryAt = url.indexOf("?");
  if (queryAt === -1) return url;
  const file = url.slice(0, queryAt);

  const known = remembered.get(file);
  if (known && known.expiresAt - now > RENEW_BEFORE_MS) return known.url;

  remembered.set(file, { url, expiresAt: expiryOf(url) ?? now + DEFAULT_LIFETIME_MS });
  return url;
}

/** Test hook: forget every remembered link. */
export function forgetSignedUrls(): void {
  remembered.clear();
}
