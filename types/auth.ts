export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: number;
  type: string;
}

/** Account types allowed into the Support Portal. */
export const ALLOWED_USER_TYPES = ["support", "admin", "super_admin"] as const;

/**
 * Returned by POST /auth/login instead of tokens when the account has two-factor sign-in on:
 * a 6-digit code was sent (SMS or email), and it is sent back together with `challengeId`.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
  /** Where the code went, masked: "+94 77*****67" or "la****@gmail.com" (see `channel`). */
  emailHint: string;
  /** "sms" when the code was texted to the account's mobile. Absent on older backends (email). */
  channel?: "sms" | "email";
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /**
   * False when the code couldn't be sent. The code still works — a super admin can read it out
   * from the dashboard. Absent on older backends.
   */
  emailSent?: boolean;
}

export type LoginResult = AuthTokens | TwoFactorChallenge;

/** GET /auth/2fa/email — the signed-in account's two-factor sign-in setting. */
export interface TwoFactorStatus {
  /** False when the account type can't use it or the account has no email address. */
  available: boolean;
  enabled: boolean;
  emailHint: string | null;
  /** Codes go by SMS to this masked number ("+94 77*****67"); null = by email. Absent on older backends. */
  phoneHint?: string | null;
}
