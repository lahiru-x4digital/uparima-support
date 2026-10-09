// Pure pieces of the sign-in flow: input rules, where to go after signing in, and turning a
// backend refusal into something a person can act on. No React, no storage — see auth-context.tsx.

import axios from "axios";
import { z } from "zod";

/** Where a signed-in agent lands when nothing else was asked for. */
export const DEFAULT_LANDING = "/inbox";

export const CODE_LENGTH = 6;

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address"),
  // The backend refuses anything shorter than 8 with a generic validation error; say it plainly here.
  password: z
    .string()
    .min(1, "Enter your password")
    .min(8, "Passwords are at least 8 characters")
    .max(100, "Passwords are at most 100 characters"),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignInErrors = Partial<Record<keyof SignInValues, string>>;

/** Field errors for the sign-in form; an empty object when the values are fine. */
export function validateSignIn(values: SignInValues): SignInErrors {
  const result = signInSchema.safeParse(values);
  if (result.success) return {};
  const errors: SignInErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof SignInValues;
    errors[field] ??= issue.message; // the first problem per field is the one to fix first
  }
  return errors;
}

/** Keeps only the digits of whatever was typed or pasted ("123 456", "Code: 123456"). */
export const sanitizeCode = (raw: string): string => raw.replace(/\D/g, "").slice(0, CODE_LENGTH);

/**
 * The page to open after signing in. `next` comes from the address bar, so only a path inside
 * this site is accepted — never another site ("//evil.example", "https://…") or the sign-in page.
 */
export function safeNextPath(next: unknown, fallback: string = DEFAULT_LANDING): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return fallback;
  return next;
}

/** Why the sign-in page is being shown, carried in `?reason=`. */
export const SIGN_IN_REASONS = {
  expired: "Your session ended. Sign in again to continue.",
  verify: "Sign in again with your email and password to continue.",
  "two-factor-on": "Two-factor sign-in is on. Sign in again — we'll email you a code.",
} as const;

export type SignInReason = keyof typeof SIGN_IN_REASONS;

export const signInNotice = (reason: unknown): string | null =>
  typeof reason === "string" && reason in SIGN_IN_REASONS
    ? SIGN_IN_REASONS[reason as SignInReason]
    : null;

/** The sign-in page's address, remembering why we're there and where to return to. */
export function loginPath(reason?: SignInReason, next?: string | null): string {
  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);
  const target = safeNextPath(next, "");
  if (target && target !== DEFAULT_LANDING) params.set("next", target);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export interface AuthFailure {
  message: string;
  /**
   * `restart` — the emailed code can no longer be used (expired, used up, too many wrong tries):
   * the only way forward is to start over. `retry` — fix the input and try again.
   */
  action: "retry" | "restart";
}

interface ErrorBody {
  error?: { code?: string; message?: string };
  message?: string | string[];
}

/** Turns a failed sign-in call into a message and what the person can do about it. */
export function describeAuthFailure(error: unknown): AuthFailure {
  if (!axios.isAxiosError(error)) {
    return { message: error instanceof Error ? error.message : "Something went wrong. Try again.", action: "retry" };
  }
  if (!error.response) {
    return { message: "Can't reach the server. Check your connection and try again.", action: "retry" };
  }

  const { status } = error.response;
  const body = (error.response.data ?? {}) as ErrorBody;
  const code = body.error?.code;
  const fromServer = body.error?.message ?? (Array.isArray(body.message) ? body.message[0] : body.message);

  switch (code) {
    case "INVALID_CREDENTIALS":
      return { message: "That email and password don't match. Check them and try again.", action: "retry" };
    case "ACCOUNT_LOCKED":
      return {
        message: "Too many wrong passwords — this account is locked for a while. Try again later or ask an administrator.",
        action: "retry",
      };
    case "ACCOUNT_INACTIVE":
      return { message: "This account has been deactivated. Ask an administrator to restore it.", action: "retry" };
    case "OTP_EXPIRED":
      return { message: fromServer ?? "That code has expired.", action: "restart" };
    case "TWO_FACTOR_INVALID":
      // 429 = the last allowed wrong code: the backend has thrown the challenge away.
      return { message: fromServer ?? "That code isn't right.", action: status === 429 ? "restart" : "retry" };
  }
  if (status >= 500) return { message: fromServer ?? "The server had a problem. Try again in a moment.", action: "retry" };
  return { message: fromServer ?? "Something went wrong. Try again.", action: "retry" };
}

/** Seconds as "m:ss" for the resend and expiry countdowns. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
