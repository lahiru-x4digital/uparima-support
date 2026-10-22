"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createAudioTemplate,
  deleteAudioTemplate,
  getAudioTemplate,
  listAudioTemplates,
  sendAudioTemplate,
  updateAudioTemplate,
} from "@/lib/services/audio-templates.service";
import type { AudioTemplateInput } from "@/types/message-template";
import type { TemplateListParams } from "@/types/template-list";
import { botChatKeys, messageTemplateKeys, ticketKeys } from "./query-keys";

export function useAudioTemplates(params: TemplateListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: messageTemplateKeys.audioList(params),
    queryFn: () => listAudioTemplates(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useAudioTemplate(id: number | null) {
  return useQuery({
    queryKey: messageTemplateKeys.audioDetail(id ?? 0),
    queryFn: () => getAudioTemplate(id as number),
    enabled: id !== null,
    retry: false,
  });
}

export function useSaveAudioTemplate(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AudioTemplateInput) => (id === null ? createAudioTemplate(body) : updateAudioTemplate(id, body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.audio });
      toast.success(id === null ? "Audio template created" : "Audio template saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteAudioTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAudioTemplate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messageTemplateKeys.audio });
      toast.success("Audio template deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/** Inbox: a voice note on WhatsApp, an audio attachment on other channels. */
export function useSendAudioTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: Parameters<typeof sendAudioTemplate>[1] }) => sendAudioTemplate(id, to),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
      void qc.invalidateQueries({ queryKey: botChatKeys.all });
      toast.success("Audio template sent");
    },
    onError: (error) => toast.error(`Audio not sent: ${getErrorMessage(error)}`),
  });
}
