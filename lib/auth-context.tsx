"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuth, getRefreshToken, getToken, saveAuth } from "@/lib/auth";
import { loginPath, type SignInReason } from "@/lib/auth-flow";
import { decodeUser } from "@/lib/auth-user";
import * as authService from "@/lib/services/auth.service";
import type { AuthTokens, AuthUser, TwoFactorChallenge } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  /**
   * Signs in with a password. Resolves to `null` once signed in, or — for an account with
   * two-factor sign-in on — to the emailed-code challenge to finish with `verifyLoginCode`.
   */
  login: (email: string, password: string) => Promise<TwoFactorChallenge | null>;
  /** Second step: the emailed code. Signed in when it resolves. */
  verifyLoginCode: (challengeId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  /** For a session the backend has already ended: forget it here and go to the sign-in page. */
  endSession: (reason: SignInReason) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Restore the session on load; an expired access token is renewed with the refresh token.
  useEffect(() => {
    (async () => {
      let decoded = decodeUser(getToken());
      const refresh = getRefreshToken();
      if (!decoded && refresh) {
        try {
          saveAuth(await authService.refreshTokens(refresh));
          decoded = decodeUser(getToken());
        } catch {
          /* fall through to signed-out */
        }
      }
      if (!decoded) clearAuth();
      setUser(decoded);
      setLoading(false);
    })();
  }, []);

  const startSession = useCallback(
    (tokens: AuthTokens) => {
      const decoded = decodeUser(tokens.accessToken);
      if (!decoded) {
        throw new Error("This account doesn't have access to the Support Portal.");
      }
      // Nothing cached for whoever used this browser before (their profile and permissions
      // would otherwise be shown to this account until they went stale).
      queryClient.clear();
      saveAuth(tokens);
      setUser(decoded);
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authService.login(email, password);
      if ("twoFactorRequired" in res) return res;
      startSession(res);
      return null;
    },
    [startSession],
  );

  const verifyLoginCode = useCallback(
    async (challengeId: string, code: string) => {
      startSession(await authService.verifyLoginCode(challengeId, code));
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout(getRefreshToken());
    } catch {
      /* clear locally regardless */
    }
    clearAuth();
    queryClient.clear();
    setUser(null);
    router.push("/login");
  }, [router, queryClient]);

  const endSession = useCallback((reason: SignInReason) => {
    clearAuth();
    // A full page load, not a route change: it also drops the data cache and the live sockets.
    window.location.assign(loginPath(reason));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyLoginCode, logout, endSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
