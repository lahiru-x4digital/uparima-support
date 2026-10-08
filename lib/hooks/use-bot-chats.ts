"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getBotChat, listBotChats } from "@/lib/services/bot-chats.service";
import { botChatKeys } from "./query-keys";

const PER_PAGE = 30;
/** Bot messages are not pushed to staff, so the open views refresh on a timer while visible. */
const LIST_POLL_MS = 15_000;
const THREAD_POLL_MS = 8_000;

export function useBotChatList(search: string) {
  return useInfiniteQuery({
    queryKey: botChatKeys.list(search),
    queryFn: ({ pageParam }) => listBotChats({ page: pageParam, perPage: PER_PAGE, search: search || undefined }),
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
