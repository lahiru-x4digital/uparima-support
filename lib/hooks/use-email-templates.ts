"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "@/lib/services/email-templates.service";
import { uploadTemplateImage } from "@/lib/services/template-images.service";
import type { EmailTemplateInput } from "@/types/message-template";
import type { TemplateListParams } from "@/types/template-list";
import { messageTemplateKeys } from "./query-keys";

export function useEmailTemplates(params: TemplateListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: messageTemplateKeys.emailList(params),
    queryFn: () => listEmailTemplates(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useEmailTemplate(id: number | null) {
  return useQuery({
    queryKey: messageTemplateKeys.emailDetail(id ?? 0),
    queryFn: () => getEmailTemplate(id as number),
    enabled: id !== null,
    retry: false,
  });
}

export function useSaveEmailTemplate(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmailTemplateInput) => (id === null ? createEmailTemplate(body) : updateEmailTemplate(id, body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.email });
      toast.success(id === null ? "Email template created" : "Email template saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEmailTemplate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.email });
      toast.success("Email template deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/** Image upload for both editors; errors are toasted, the caller gets the result. */
export function useUploadTemplateImage() {
  return useMutation({
    mutationFn: (file: File) => uploadTemplateImage(file),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
