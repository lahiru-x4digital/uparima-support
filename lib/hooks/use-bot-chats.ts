"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchVoiceNote, getBotChat, listBotChats } from "@/lib/services/bot-chats.service";
import { botChatKeys } from "./query-keys";

const PER_PAGE = 30;
/** Bot messages are not pushed to staff, so the open views refresh on a timer while visible. */
const LIST_POLL_MS = 15_000;
const THREAD_POLL_MS = 8_000;

export function useBotChatList(search: string, incompleteDriver = false, toOnboard = false) {
  return useInfiniteQuery({
    queryKey: botChatKeys.list(search, incompleteDriver, toOnboard),
    queryFn: ({ pageParam }) =>
      listBotChats({ page: pageParam, perPage: PER_PAGE, search: search || undefined, incompleteDriver, toOnboard }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    refetchInterval: LIST_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useBotChatThread(phone: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: botChatKeys.thread(phone ?? "", sessionId),
    queryFn: () => getBotChat(phone as string, sessionId),
    enabled: !!phone,
    refetchInterval: THREAD_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** A voice note's audio from WhatsApp, fetched only once `enabled` (the agent pressed play) and
 * kept for the session. No retry: a 410 means WhatsApp has already deleted it. */
export function useVoiceNote(messageId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...botChatKeys.all, "voice-note", messageId],
    queryFn: () => fetchVoiceNote(messageId),
    enabled,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
}
