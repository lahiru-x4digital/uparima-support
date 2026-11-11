"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBotTextHistory, listBotTexts, revertBotText, saveBotText } from "@/lib/services/bot-texts.service";
import type { BotTextListParams, BotTextValues } from "@/types/bot-text";
import { botKeys } from "./query-keys";

export function useBotTexts(params: BotTextListParams) {
  return useQuery({ queryKey: botKeys.texts(params), queryFn: () => listBotTexts(params), placeholderData: (prev) => prev });
}

export function useSaveBotText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, values }: { key: string; values: BotTextValues }) => saveBotText(key, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: botKeys.all }),
  });
}

export function useRevertBotText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => revertBotText(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: botKeys.all }),
  });
}

export function useBotTextHistory(key: string | null) {
  return useQuery({ enabled: !!key, queryKey: botKeys.history(key ?? ""), queryFn: () => getBotTextHistory(key as string) });
}
