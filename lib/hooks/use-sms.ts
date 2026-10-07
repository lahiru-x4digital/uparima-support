"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { listSmsCountries, listSmsHistory, sendSms } from "@/lib/services/sms.service";
import type { SendSmsInput, SmsHistoryParams } from "@/types/sms";
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
