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

/** Returned by POST /auth/login instead of tokens when an admin has email 2FA on. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
  emailHint: string;
}

export type LoginResult = AuthTokens | TwoFactorChallenge;
