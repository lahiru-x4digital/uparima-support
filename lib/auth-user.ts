import { ALLOWED_USER_TYPES, type AuthUser } from "@/types/auth";

/**
 * The backend has no /auth/me; identity lives in the JWT (`sub` = user id, `type` = role).
 * Returns null for expired tokens, non-staff accounts, or admin tokens that didn't come from a
 * full password sign-in (`mfa`). The backend demands the same claim from support accounts and is
 * the one that enforces it (403 TWO_FACTOR_REQUIRED → sign in again, see lib/api.ts); it isn't
 * required of them here so the portal keeps working against a backend that doesn't issue it yet.
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
