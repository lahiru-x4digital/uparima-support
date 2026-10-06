import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { clearAuth, getRefreshToken, getSavedUser, getToken, saveAuth } from "@/lib/auth";
import type { AuthTokens } from "@/types/auth";

/** Backend API base URL (includes `/api/v1`). Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

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

const redirectToLogin = () => {
  clearAuth();
  if (typeof window !== "undefined") window.location.href = "/login";
};

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

    // Admin token without the 2FA step is refused by the backend — sign in again.
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
    if (error.response?.status === 403 && code === "TWO_FACTOR_REQUIRED") {
      redirectToLogin();
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || !original || original._retried) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
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
      redirectToLogin();
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

export const apiPost = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  (await api.post<ApiEnvelope<T>>(url, body, config)).data.data;

export const apiPut = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  (await api.put<ApiEnvelope<T>>(url, body, config)).data.data;

export const apiPatch = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  (await api.patch<ApiEnvelope<T>>(url, body, config)).data.data;

export const apiDelete = async <T = void>(url: string, config?: AxiosRequestConfig) =>
  (await api.delete<ApiEnvelope<T>>(url, config)).data.data;
