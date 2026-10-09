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
 * a 6-digit code was emailed, and it is sent back together with `challengeId`.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
  /** The inbox the code went to, masked: "la****@gmail.com". */
  emailHint: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /**
   * False when the code email couldn't be sent. The code still works — a super admin can read
   * it out from the dashboard. Absent on older backends.
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
}
