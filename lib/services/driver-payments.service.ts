import { apiGet, apiGetPage, apiPost, apiPut } from "@/lib/api";
import type { Paginated } from "@/types/ticket";
import type {
  DiscountSettings,
  DiscountTransactionRow,
  DiscountWithdrawalAdminRow,
  DiscountWithdrawalRow,
  DiscountWithdrawalStatus,
  DriverBalanceRow,
  DriverPlatformFeeBalances,
  DriverPromotionBalances,
  PlatformFeeTransactionRow,
} from "@/types/driver-payment";

// Driver money — the backend's `/support-desk/driver-payments/*`: platform fees
// drivers owe, promotion balances the company owes them, and their withdrawal
// requests. Reading needs driver-payment.view; approving / rejecting a
// withdrawal driver-payment.withdrawal-review; editing a balance by hand (or
// the withdrawal minimum) driver-payment.adjust.

const BASE = "/support-desk/driver-payments";

// ── Platform fees ───────────────────────────────────────────────────────────

export const listPlatformFeeBalances = () =>
  apiGet<DriverPlatformFeeBalances>(`${BASE}/platform-fee-balances`);

export const listPlatformFeeTransactions = (
  driverId: number | string,
  page: number,
  perPage = 20,
): Promise<Paginated<PlatformFeeTransactionRow>> =>
  apiGetPage<PlatformFeeTransactionRow>(`${BASE}/platform-fee-balances/${driverId}/transactions`, {
    params: { page, perPage },
  });

/** Signed: negative reduces what the driver owes (a payment taken outside the app, or a waiver). */
export const adjustPlatformFeeBalance = (driverId: number, amountLkr: number, reason: string) =>
  apiPost<{ driverId: number; owedLkr: number }>(`${BASE}/platform-fee-balances/${driverId}/adjust`, {
    amountLkr,
    reason,
  });

// ── Promotion balances ──────────────────────────────────────────────────────

export const listPromotionBalances = () => apiGet<DriverPromotionBalances>(`${BASE}/promotion-balances`);

/** Signed: positive adds to the driver's balance, negative deducts. */
export const adjustPromotionBalance = (driverId: number, amountLkr: number, reason: string) =>
  apiPost<{ driverId: number; balanceLkr: number }>(`${BASE}/promotion-balances/${driverId}/adjust`, {
    amountLkr,
    reason,
  });

// ── Discount balances, ledger & withdrawals ─────────────────────────────────

export const listDiscountBalances = (includeZero: boolean) =>
  apiGet<DriverBalanceRow[]>(`${BASE}/discount-balances`, { params: { includeZero } });

export const listDriverDiscountTransactions = (
  driverId: number | string,
  page: number,
  perPage = 20,
): Promise<Paginated<DiscountTransactionRow>> =>
  apiGetPage<DiscountTransactionRow>(`${BASE}/drivers/${driverId}/discount-transactions`, {
    params: { page, perPage },
  });

export const listDriverDiscountWithdrawals = (driverId: number | string) =>
  apiGet<DiscountWithdrawalRow[]>(`${BASE}/drivers/${driverId}/discount-withdrawals`);

export const listDiscountWithdrawals = (
  status: DiscountWithdrawalStatus | undefined,
  page: number,
  perPage = 20,
): Promise<Paginated<DiscountWithdrawalAdminRow>> =>
  apiGetPage<DiscountWithdrawalAdminRow>(`${BASE}/discount-withdrawals`, {
    params: { page, perPage, ...(status ? { status } : {}) },
  });

export const approveDiscountWithdrawal = (id: number, slipS3Key?: string) =>
  apiPost<{ message: string }>(`${BASE}/discount-withdrawals/${id}/approve`, { slipS3Key });

export const rejectDiscountWithdrawal = (id: number, reason: string) =>
  apiPost<{ message: string }>(`${BASE}/discount-withdrawals/${id}/reject`, { reason });

// ── Withdrawal minimum ──────────────────────────────────────────────────────

export const getDiscountSettings = () => apiGet<DiscountSettings>(`${BASE}/discount-settings`);

export const updateDiscountSettings = (withdrawalMinimumLkr: number) =>
  apiPut<DiscountSettings>(`${BASE}/discount-settings`, { withdrawalMinimumLkr });
