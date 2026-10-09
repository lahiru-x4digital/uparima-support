import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { clearAuth, getRefreshToken, getSavedUser, getToken, saveAuth } from "@/lib/auth";
import { loginPath, type SignInReason } from "@/lib/auth-flow";
import { env } from "@/lib/env";
import type { AuthTokens } from "@/types/auth";
import type { PageMeta, Paginated } from "@/types/ticket";

/** Backend API base URL (includes `/api/v1`). Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. */
export const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL;

/** Single shared HTTP client. Only `lib/services/*.service.ts` should import this. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** The session can't continue: forget it and go to the sign-in page, which says why and comes back here after. */
const redirectToLogin = (reason: SignInReason) => {
  clearAuth();
  if (typeof window === "undefined" || window.location.pathname === "/login") return;
  window.location.href = loginPath(reason, window.location.pathname + window.location.search);
};

/**
 * The sign-in endpoints answer 401 for a wrong password or a wrong emailed code. That is the
 * answer to show, not an expired session — refreshing and reloading would wipe the form and its
 * error (and replay a wrong code, using up one of its few attempts).
 */
const isSignInCall = (url?: string) => !!url && /^\/auth\/(login|refresh)(\/|$)/.test(url);

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const drainQueue = (token: string) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

    // A staff token that didn't come from a full password sign-in is refused by the backend — sign in again.
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
    if (error.response?.status === 403 && code === "TWO_FACTOR_REQUIRED") {
      redirectToLogin("verify");
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || !original || original._retried || isSignInCall(original.url)) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      redirectToLogin("expired");
      return Promise.reject(error);
    }

    // A refresh is already running: wait for it, then replay this request.
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    original._retried = true;
    isRefreshing = true;
    try {
      const { data } = await axios.post<{ success: boolean; data: AuthTokens }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
      );
      saveAuth(data.data, getSavedUser() ?? undefined);
      drainQueue(data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original);
    } catch {
      redirectToLogin("expired");
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

/** Extracts a user-facing message from an API/Axios/unknown error. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    return data?.error?.message ?? data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

/** Backend envelope: every successful response is `{ success, data }`. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/**
 * Typed helpers for `lib/services/*.service.ts`. They unwrap the `{ success, data }`
 * envelope so services return the DTO directly:
 *
 *   export const getTicket = (id: string) => apiGet<Ticket>(`/support/tickets/${id}`);
 */
export const apiGet = async <T>(url: string, config?: AxiosRequestConfig) =>
  (await api.get<ApiEnvelope<T>>(url, config)).data.data;

/**
 * Paginated lists: the backend puts `meta` next to `data` in the envelope, which `apiGet`
 * would drop. Returns both.
 */
export const apiGetPage = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<Paginated<T>> => {
  const res = (await api.get<ApiEnvelope<T[]> & { meta: PageMeta }>(url, config)).data;
  return { data: res.data, meta: res.meta };
};

export const apiPost = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  (await api.post<ApiEnvelope<T>>(url, body, config)).data.data;

export const apiPut = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  (await api.put<ApiEnvelope<T>>(url, body, config)).data.data;

export const apiPatch = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  (await api.patch<ApiEnvelope<T>>(url, body, config)).data.data;

export const apiDelete = async <T = void>(url: string, config?: AxiosRequestConfig) =>
  (await api.delete<ApiEnvelope<T>>(url, config)).data.data;
