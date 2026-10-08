"use client";

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import {
  assignTicket,
  markTicketContacted,
  replyToTicket,
  updateTicketPriority,
  updateTicketStatus,
} from "@/lib/services/tickets.service";
import type { Paginated, Ticket, TicketDetail, TicketPriority, TicketReply, TicketRow, TicketStatus } from "@/types/ticket";
import { useMe } from "./use-desk";
import { ticketKeys } from "./query-keys";

type Snapshot = Array<[QueryKey, unknown]>;

/** Applies `patch` to the ticket in the list and detail caches; returns what to restore on failure. */
function patchTicket(qc: QueryClient, id: string, patch: Partial<Ticket>): Snapshot {
  const snapshot: Snapshot = [
    ...qc.getQueriesData({ queryKey: ticketKeys.lists() }),
    ...qc.getQueriesData({ queryKey: ticketKeys.detail(id) }),
  ];
  qc.setQueriesData<InfiniteData<Paginated<TicketRow>>>({ queryKey: ticketKeys.lists() }, (old) =>
    old && {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      })),
    },
  );
  qc.setQueryData<TicketDetail>(ticketKeys.detail(id), (old) =>
    old && { ...old, ticket: { ...old.ticket, ...patch } },
  );
  return snapshot;
}

function restore(qc: QueryClient, snapshot: Snapshot) {
  for (const [key, data] of snapshot) qc.setQueryData(key, data);
}

function refresh(qc: QueryClient, id: string) {
  void qc.invalidateQueries({ queryKey: ticketKeys.lists() });
  void qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
  void qc.invalidateQueries({ queryKey: ["tickets", "count"] });
}

/** Builds a mutation that updates the ticket optimistically and rolls back with a toast on failure. */
function useTicketPatch<V>(
  id: string,
  call: (value: V) => Promise<unknown>,
  toPatch: (value: V) => Partial<Ticket>,
  failure: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: call,
    onMutate: async (value: V) => {
      await qc.cancelQueries({ queryKey: ticketKeys.all });
      return { snapshot: patchTicket(qc, id, toPatch(value)) };
    },
    onError: (error, _value, context) => {
      if (context) restore(qc, context.snapshot);
      toast.error(`${failure}: ${getErrorMessage(error)}`);
    },
    onSettled: () => refresh(qc, id),
  });
}

export const useUpdateStatus = (id: string) =>
  useTicketPatch<TicketStatus>(id, (status) => updateTicketStatus(id, status), (status) => ({ status }), "Couldn't change the status");

export const useUpdatePriority = (id: string) =>
  useTicketPatch<TicketPriority>(id, (priority) => updateTicketPriority(id, priority), (priority) => ({ priority }), "Couldn't change the priority");

export const useAssign = (id: string) =>
  useTicketPatch<number>(id, (userId) => assignTicket(id, userId), (assignedToUserId) => ({ assignedToUserId }), "Couldn't assign the ticket");

/** A driver who asked the WhatsApp bot for a person has been contacted. */
export const useMarkContacted = (id: string) =>
  useTicketPatch<void>(
    id,
    () => markTicketContacted(id),
    () => ({ needsContact: false, contactedAt: new Date().toISOString() }),
    "Couldn't mark as contacted",
  );

/** Sends a reply with an optimistic bubble; rejects on failure so the composer can keep the text. */
export function useReply(id: string) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  return useMutation({
    mutationFn: ({ message, files, emailTemplateId }: { message: string; files: File[]; emailTemplateId?: number }) =>
      replyToTicket(id, message, files, emailTemplateId),
    onMutate: async ({ message }) => {
      await qc.cancelQueries({ queryKey: ticketKeys.detail(id) });
      const previous = qc.getQueryData<TicketDetail>(ticketKeys.detail(id));
      const temp: TicketReply = {
        id: `tmp-${Date.now()}`,
        ticketId: id,
        authorId: me?.id ?? 0,
        isStaffReply: true,
        message,
        attachments: null,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<TicketDetail>(ticketKeys.detail(id), (old) =>
        old && { ...old, replies: [...old.replies, temp] },
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      qc.setQueryData(ticketKeys.detail(id), context?.previous);
      toast.error(`Reply not sent: ${getErrorMessage(error)}`);
    },
    onSettled: () => refresh(qc, id),
  });
}
