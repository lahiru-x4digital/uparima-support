"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createCareTemplate,
  deleteCareTemplate,
  getCareTemplate,
  listCareTemplates,
  updateCareTemplate,
} from "@/lib/services/care-templates.service";
import type { CareTemplateInput } from "@/types/care-template";
import type { TemplateListParams } from "@/types/template-list";
import { careTemplateKeys } from "./query-keys";

export function useCareTemplates(params: TemplateListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: careTemplateKeys.list(params),
    queryFn: () => listCareTemplates(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useCareTemplate(id: number | null) {
  return useQuery({
    queryKey: careTemplateKeys.detail(id ?? 0),
    queryFn: () => getCareTemplate(id as number),
    enabled: id !== null,
    retry: false,
  });
}

/** Creates (no id) or updates (id) a template, then refreshes the list. */
export function useSaveCareTemplate(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CareTemplateInput) => (id === null ? createCareTemplate(body) : updateCareTemplate(id, body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: careTemplateKeys.all });
      toast.success(id === null ? "Template created" : "Template saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteCareTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCareTemplate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: careTemplateKeys.all });
      toast.success("Template deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
