"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getMail, listMail, sendMail, setMailRead, trashMail } from "@/lib/services/mailbox.service";
import type { MailFolder } from "@/types/mailbox";
import { mailboxKeys } from "./query-keys";

export function useMailList(accountId: number | null, folder: MailFolder, q: string) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: mailboxKeys.list(accountId ?? 0, folder, q),
    queryFn: ({ pageParam }) => listMail({ accountId: accountId as number, folder, q }, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: !!user && accountId !== null,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useMailMessage(accountId: number | null, id: string | null) {
  return useQuery({
    queryKey: mailboxKeys.message(accountId ?? 0, id ?? ""),
    queryFn: () => getMail(accountId as number, id as string),
    enabled: accountId !== null && !!id,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useSetMailRead(accountId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => setMailRead(accountId as number, id, read),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...mailboxKeys.all, accountId, "list"] }),
  });
}

export function useTrashMail(accountId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trashMail(accountId as number, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...mailboxKeys.all, accountId, "list"] });
      toast.success("Moved to trash");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSendMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendMail,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mailboxKeys.all });
      toast.success("Email sent");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
