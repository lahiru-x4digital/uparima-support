"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createWhatsappTemplate,
  deleteWhatsappTemplate,
  getWhatsappMetaStatus,
  getWhatsappTemplate,
  listWhatsappTemplates,
  submitWhatsappTemplate,
  syncWhatsappTemplates,
  updateWhatsappTemplate,
} from "@/lib/services/whatsapp-templates.service";
import type { WhatsappTemplateInput } from "@/types/message-template";
import type { TemplateListParams } from "@/types/template-list";
import { messageTemplateKeys } from "./query-keys";

export function useWhatsappTemplates(params: TemplateListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: messageTemplateKeys.whatsappList(params),
    queryFn: () => listWhatsappTemplates(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useWhatsappTemplate(id: number | null) {
  return useQuery({
    queryKey: messageTemplateKeys.whatsappDetail(id ?? 0),
    queryFn: () => getWhatsappTemplate(id as number),
    enabled: id !== null,
    retry: false,
  });
}

export function useWhatsappMetaStatus() {
  const { user } = useAuth();
  return useQuery({ queryKey: messageTemplateKeys.whatsappMeta, queryFn: getWhatsappMetaStatus, enabled: !!user, staleTime: 5 * 60_000 });
}

export function useSaveWhatsappTemplate(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WhatsappTemplateInput) =>
      id === null ? createWhatsappTemplate(body) : updateWhatsappTemplate(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: messageTemplateKeys.whatsapp }),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSubmitWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => submitWhatsappTemplate(id),
    onSuccess: (t) => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.whatsapp });
      toast.success(t.status === "approved" ? "Approved by Meta" : "Sent to Meta for review");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSyncWhatsappTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncWhatsappTemplates,
    onSuccess: ({ updated }) => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.whatsapp });
      toast.success(updated ? `${updated} template status(es) updated` : "All statuses are up to date");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWhatsappTemplate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.whatsapp });
      toast.success("WhatsApp template deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
