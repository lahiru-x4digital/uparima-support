import { ALLOWED_USER_TYPES, type AuthUser } from "@/types/auth";

/**
 * The backend has no /auth/me; identity lives in the JWT (`sub` = user id, `type` = role).
 * Returns null for expired tokens, non-staff accounts, or admin tokens that skipped 2FA (`mfa`).
 */
export function decodeUser(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (!payload?.sub) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (!(ALLOWED_USER_TYPES as readonly string[]).includes(payload.type)) return null;
    if (payload.type !== "support" && payload.mfa !== true) return null;
    return { id: Number(payload.sub), type: payload.type };
  } catch {
    return null;
  }
}
