"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  adjustPlatformFeeBalance,
  adjustPromotionBalance,
  approveDiscountWithdrawal,
  getDiscountSettings,
  listDiscountWithdrawals,
  listPlatformFeeBalances,
  listPlatformFeeTransactions,
  listPromotionBalances,
  rejectDiscountWithdrawal,
  updateDiscountSettings,
} from "@/lib/services/driver-payments.service";
import type { DiscountWithdrawalStatus } from "@/types/driver-payment";
import { driverPaymentKeys } from "./query-keys";

export function usePlatformFeeBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverPaymentKeys.platformFees,
    queryFn: listPlatformFeeBalances,
    enabled: !!user,
  });
}

/** `driverId` null keeps it idle (no dialog open). */
export function usePlatformFeeLedger(driverId: number | null, page: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverPaymentKeys.platformFeeLedger(driverId ?? 0, page),
    queryFn: () => listPlatformFeeTransactions(driverId as number, page),
    enabled: !!user && driverId !== null,
  });
}

export function usePromotionBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverPaymentKeys.promotionBalances,
    queryFn: listPromotionBalances,
    enabled: !!user,
  });
}

export function useDiscountWithdrawals(status: DiscountWithdrawalStatus | undefined, page: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverPaymentKeys.withdrawals(status ?? "all", page),
    queryFn: () => listDiscountWithdrawals(status, page),
    enabled: !!user,
  });
}

export function useDiscountSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverPaymentKeys.settings,
    queryFn: getDiscountSettings,
    enabled: !!user,
  });
}

// ── Changes ─────────────────────────────────────────────────────────────────
// Each refreshes everything money-related and shows the backend's message if it refuses.

function usePaymentMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, successMessage: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driverPaymentKeys.all });
      toast.success(successMessage);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

type AdjustVars = { driverId: number; amountLkr: number; reason: string };

export const useAdjustPlatformFeeBalance = () =>
  usePaymentMutation(
    ({ driverId, amountLkr, reason }: AdjustVars) => adjustPlatformFeeBalance(driverId, amountLkr, reason),
    "Platform fee balance adjusted",
  );

export const useAdjustPromotionBalance = () =>
  usePaymentMutation(
    ({ driverId, amountLkr, reason }: AdjustVars) => adjustPromotionBalance(driverId, amountLkr, reason),
    "Promotion balance adjusted",
  );

export const useApproveWithdrawal = () =>
  usePaymentMutation(
    ({ id, slipS3Key }: { id: number; slipS3Key?: string }) => approveDiscountWithdrawal(id, slipS3Key),
    "Withdrawal approved",
  );

export const useRejectWithdrawal = () =>
  usePaymentMutation(
    ({ id, reason }: { id: number; reason: string }) => rejectDiscountWithdrawal(id, reason),
    "Withdrawal rejected",
  );

export const useUpdateDiscountSettings = () =>
  usePaymentMutation((withdrawalMinimumLkr: number) => updateDiscountSettings(withdrawalMinimumLkr), "Saved");
