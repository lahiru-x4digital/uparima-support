import { apiPost } from "@/lib/api";
import type { AuthTokens, LoginResult } from "@/types/auth";

export const login = (email: string, password: string) =>
  apiPost<LoginResult>("/auth/login", { email, password });

export const logout = (refreshToken: string | null) =>
  apiPost<void>("/auth/logout", { refreshToken });

export const refreshTokens = (refreshToken: string) =>
  apiPost<AuthTokens>("/auth/refresh", { refreshToken });
