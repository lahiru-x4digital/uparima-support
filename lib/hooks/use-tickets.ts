"use client";

import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import { toListParams } from "@/lib/inbox/filters";
import { getTicket, listTickets } from "@/lib/services/tickets.service";
import type { ConversationFilters } from "@/types/inbox";
import type { Paginated, TicketListParams, TicketRow } from "@/types/ticket";
import { ticketKeys } from "./query-keys";

const PER_PAGE = 20;
/** Customers' new replies are not pushed to staff, so the open views refresh on a timer while visible. */
const LIST_POLL_MS = 30_000;
const THREAD_POLL_MS = 15_000;

/** The ticket list for the current tab, loaded page by page. */
export function useTicketList(filters: ConversationFilters) {
  const params = toListParams(filters);
  return useInfiniteQuery({
    queryKey: ticketKeys.list(params),
    queryFn: ({ pageParam }) => listTickets({ ...params, page: pageParam, perPage: PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    refetchInterval: LIST_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

export function flattenRows(data: InfiniteData<Paginated<TicketRow>> | undefined): TicketRow[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

/** One ticket with its replies and submitter. */
export function useTicketDetail(id: string | null) {
  return useQuery({
    queryKey: ticketKeys.detail(id ?? ""),
    queryFn: () => getTicket(id as string),
    enabled: !!id,
    refetchInterval: THREAD_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** Just the total of a filtered list (one-row page), for badges and dashboard cards. */
export function useTicketCount(name: string, params: TicketListParams) {
  return useQuery({
    queryKey: ticketKeys.count(`${name}:${JSON.stringify(params)}`),
    queryFn: async () => (await listTickets({ ...params, page: 1, perPage: 1 })).meta.total,
    refetchInterval: LIST_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** How many waiting hand-offs are already past their response time (checked over the 50 most overdue). */
export function useOverdueHandoffs() {
  return useQuery({
    queryKey: ticketKeys.count("overdue-handoffs"),
    queryFn: async () => {
      const { data } = await listTickets({ needsContact: true, page: 1, perPage: 50 });
      const now = Date.now();
      return data.filter((t) => t.slaDueAt && new Date(t.slaDueAt).getTime() < now).length;
    },
    refetchInterval: LIST_POLL_MS,
    refetchIntervalInBackground: false,
  });
}
