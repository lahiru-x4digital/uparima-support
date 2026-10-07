"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createEmailAccount,
  createServiceAccountEmail,
  deleteEmailAccount,
  getEmailProviders,
  listEmailAccounts,
  startEmailOauth,
  syncEmailAccount,
  testEmailConnection,
  updateEmailAccount,
} from "@/lib/services/email-accounts.service";
import type { EmailAccountInput, EmailAccountUpdate, ServiceAccountInput } from "@/types/email-account";
import { emailAccountKeys } from "./query-keys";

export function useEmailAccounts() {
  const { user } = useAuth();
  // Light polling so "last synced" / imported counts stay fresh while the page is open.
  return useQuery({ queryKey: emailAccountKeys.all, queryFn: listEmailAccounts, enabled: !!user, refetchInterval: 30_000 });
}

export function useEmailProviders() {
  const { user } = useAuth();
  return useQuery({ queryKey: emailAccountKeys.providers, queryFn: getEmailProviders, enabled: !!user, staleTime: 5 * 60_000 });
}

export function useCreateEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmailAccountInput) => createEmailAccount(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
      toast.success("Mailbox connected");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCreateServiceAccountEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ServiceAccountInput) => createServiceAccountEmail(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
      toast.success("Mailbox connected");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: EmailAccountUpdate }) => updateEmailAccount(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
      toast.success("Mailbox updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEmailAccount(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
      toast.success("Mailbox removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/** Connection test: the result (ok / message) is shown by the caller, so errors are not toasted. */
export const useTestEmailConnection = () => useMutation({ mutationFn: testEmailConnection });

export function useSyncEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => syncEmailAccount(id),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
      toast.success(
        r.baseline
          ? "Mailbox is ready — new emails from now on will become tickets"
          : `${r.imported} new ticket(s), ${r.replies} repl${r.replies === 1 ? "y" : "ies"} added`,
      );
    },
    onError: (error) => {
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
      toast.error(getErrorMessage(error));
    },
  });
}

export function useStartEmailOauth() {
  return useMutation({
    mutationFn: ({ provider, ...body }: { provider: "gmail" | "outlook" } & Parameters<typeof startEmailOauth>[1]) =>
      startEmailOauth(provider, body),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
