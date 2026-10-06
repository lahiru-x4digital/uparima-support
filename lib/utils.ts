import { env } from "@/lib/env";

export { cn } from "cn";

/** Turns a stored attachment key (or an absolute URL) into a link. */
export function assetUrl(key: string): string {
  if (/^https?:\/\//i.test(key)) return key;
  const base = env.NEXT_PUBLIC_ASSET_BASE_URL.replace(/\/+$/, "");
  return base ? `${base}/${key.replace(/^\/+/, "")}` : key;
}
