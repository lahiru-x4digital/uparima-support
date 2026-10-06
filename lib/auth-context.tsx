"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getRefreshToken, getToken, saveAuth } from "@/lib/auth";
import { decodeUser } from "@/lib/auth-user";
import * as authService from "@/lib/services/auth.service";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    if ("twoFactorRequired" in res) {
      throw new Error(
        "This account requires an emailed login code, which the Support Portal doesn't support yet.",
      );
    }
    const decoded = decodeUser(res.accessToken);
    if (!decoded) {
      throw new Error("This account doesn't have access to the Support Portal.");
    }
    saveAuth(res);
    setUser(decoded);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout(getRefreshToken());
    } catch {
      /* clear locally regardless */
    }
    clearAuth();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
