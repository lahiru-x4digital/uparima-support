import type { AuthTokens } from "@/types/auth";

const ACCESS_KEY = "support_access_token";
const REFRESH_KEY = "support_refresh_token";
const USER_KEY = "support_user";

const isBrowser = () => typeof window !== "undefined";

export const getToken = (): string | null =>
  isBrowser() ? localStorage.getItem(ACCESS_KEY) : null;

export const getRefreshToken = (): string | null =>
  isBrowser() ? localStorage.getItem(REFRESH_KEY) : null;

export function getSavedUser<T = unknown>(): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveAuth(tokens: AuthTokens, user?: unknown) {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  if (user !== undefined) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
