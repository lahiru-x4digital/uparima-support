"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { replyToBotChat } from "@/lib/services/bot-chats.service";
import { botChatKeys, ticketKeys } from "./query-keys";

/** Replies to a WhatsApp conversation that has no ticket yet (or whose
 * ticket is closed) — the backend opens/reuses a ticket and delivers the
 * message over WhatsApp. Rejects with a toast if the 23.5h window has
 * closed; the composer keeps the text so nothing is lost. */
export function useReplyToBotChat(phone: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => replyToBotChat(phone, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: botChatKeys.all });
      void qc.invalidateQueries({ queryKey: ticketKeys.lists() });
      void qc.invalidateQueries({ queryKey: ["tickets", "count"] });
    },
    onError: (error) => {
      toast.error(`Reply not sent: ${getErrorMessage(error)}`);
    },
  });
}
