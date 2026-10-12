"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  cancelBulkSmsBatch,
  listBulkSmsBatches,
  listBulkSmsCustomerIds,
  listBulkSmsCustomers,
  listSmsCountries,
  listSmsHistory,
  sendBulkSms,
  sendSms,
} from "@/lib/services/sms.service";
import type {
  BulkSmsCustomerFilter,
  BulkSmsCustomerParams,
  SendBulkSmsInput,
  SendSmsInput,
  SmsHistoryParams,
} from "@/types/sms";
import { smsKeys } from "./query-keys";

export function useSmsCountries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: smsKeys.countries,
    queryFn: listSmsCountries,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useSmsHistory(params: SmsHistoryParams) {
  const { user } = useAuth();
  return useQuery({ queryKey: smsKeys.history(params), queryFn: () => listSmsHistory(params), enabled: !!user });
}

export function useSendSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendSmsInput) => sendSms(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sms", "history"] });
      toast.success("SMS sent");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ---- Bulk SMS (super admins only)

/** The customers a bulk SMS can go to. The last page stays up while the next one loads. */
export function useBulkSmsCustomers(params: BulkSmsCustomerParams, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: smsKeys.bulkCustomers(params),
    queryFn: () => listBulkSmsCustomers(params),
    enabled: !!user && enabled,
    placeholderData: keepPreviousData,
  });
}

/** Every customer matching a filter — what "select all matching" selects. */
export function useBulkSmsCustomerIds() {
  return useMutation({
    mutationFn: (filter: BulkSmsCustomerFilter) => listBulkSmsCustomerIds(filter),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

const BATCHES_SHOWN = 5;

/** The latest bulk sends. Re-read every few seconds while one is still going out. */
export function useBulkSmsBatches(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: smsKeys.bulkBatches,
    queryFn: () => listBulkSmsBatches({ page: 1, perPage: BATCHES_SHOWN }),
    enabled: !!user && enabled,
    refetchInterval: (query) => (query.state.data?.data.some((b) => b.pending > 0) ? 3000 : false),
  });
}

export function useSendBulkSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendBulkSmsInput) => sendBulkSms(input),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: smsKeys.bulkBatches });
      void qc.invalidateQueries({ queryKey: ["sms", "history"] });
      const left = result.skipped > 0 ? ` ${result.skipped} left out (no usable number, or a repeat).` : "";
      toast.success(`${result.queued} message${result.queued === 1 ? "" : "s"} queued.${left}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCancelBulkSmsBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBulkSmsBatch(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smsKeys.bulkBatches });
      void qc.invalidateQueries({ queryKey: ["sms", "history"] });
      toast.success("Batch stopped. Messages already sent can't be taken back.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
