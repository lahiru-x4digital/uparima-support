import { z } from "zod";

// Validated once at import so a malformed value fails fast and obviously.
const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3001/api/v1"),
  /** Prefix for stored attachment keys (S3/CDN base); empty keeps keys as-is. */
  NEXT_PUBLIC_ASSET_BASE_URL: z.string().default(""),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || undefined,
  NEXT_PUBLIC_ASSET_BASE_URL: process.env.NEXT_PUBLIC_ASSET_BASE_URL || undefined,
});
