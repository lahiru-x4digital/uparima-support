import { apiGet, apiPost } from "@/lib/api";
import type {
  AuthTokens,
  LoginResult,
  TwoFactorChallenge,
  TwoFactorChoice,
  TwoFactorStatus,
} from "@/types/auth";

export const login = (email: string, password: string) =>
  apiPost<LoginResult>("/auth/login", { email, password });

/** Second step of a sign-in for an account with two-factor on: the emailed code for tokens. */
export const verifyLoginCode = (challengeId: string, code: string) =>
  apiPost<AuthTokens>("/auth/login/2fa/verify", { challengeId, code });

export const resendLoginCode = (challengeId: string) =>
  apiPost<TwoFactorChallenge>("/auth/login/2fa/resend", { challengeId });

export const logout = (refreshToken: string | null) =>
  apiPost<void>("/auth/logout", { refreshToken });

export const refreshTokens = (refreshToken: string) =>
  apiPost<AuthTokens>("/auth/refresh", { refreshToken });

// Two-factor sign-in for the signed-in account (Security page).

export const getTwoFactorStatus = () => apiGet<TwoFactorStatus>("/auth/2fa/email");

/** Sends a code the chosen way (SMS or email); confirming it switches two-factor on. */
export const startTwoFactorEnable = (choice: TwoFactorChoice) =>
  apiPost<TwoFactorChallenge>("/auth/2fa/email/enable", choice);

export const resendTwoFactorEnable = (challengeId: string) =>
  apiPost<TwoFactorChallenge>("/auth/2fa/email/enable/resend", { challengeId });

/** While two-factor is on: sends a code the new way; confirming it switches codes to it. */
export const startTwoFactorChannel = (choice: TwoFactorChoice) =>
  apiPost<TwoFactorChallenge>("/auth/2fa/channel", choice);

export const resendTwoFactorChannel = (challengeId: string) =>
  apiPost<TwoFactorChallenge>("/auth/2fa/channel/resend", { challengeId });

export const confirmTwoFactorChannel = (challengeId: string, code: string) =>
  apiPost<TwoFactorStatus>("/auth/2fa/channel/confirm", { challengeId, code });

/** Switches two-factor on. The backend ends every session for the account, this one included. */
export const confirmTwoFactorEnable = (challengeId: string, code: string) =>
  apiPost<{ enabled: true }>("/auth/2fa/email/enable/confirm", { challengeId, code });
