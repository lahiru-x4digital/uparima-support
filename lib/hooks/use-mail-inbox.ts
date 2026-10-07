"use client";

import { useEffect, useMemo, useState } from "react";
import { useEmailAccounts } from "@/lib/hooks/use-email-accounts";
import { useCan } from "@/lib/hooks/use-desk";
import { useMailList, useSetMailRead, useTrashMail } from "@/lib/hooks/use-mailbox";
import type { MailDetail, MailFolder, MailSummary } from "@/types/mailbox";

/** Compose pane state: a blank message, or a reply to `replyTo`. */
export interface ComposeDraft {
  replyTo: MailDetail | null;
}

/**
 * All the state and data wiring behind the mail inbox (selected mailbox, folder, debounced search,
 * open message, compose draft). The components under `components/mail/` stay purely presentational.
 */
export function useMailInbox() {
  const accounts = useEmailAccounts();
  const canSend = useCan("email-account.send");
  const usable = useMemo(() => (accounts.data ?? []).filter((a) => a.status !== "inactive"), [accounts.data]);

  const [pickedId, setPickedId] = useState<number | null>(null);
  // Fall back to the first mailbox if nothing is picked or the picked one was paused / removed.
  const accountId = pickedId !== null && usable.some((a) => a.id === pickedId) ? pickedId : (usable[0]?.id ?? null);
  const account = usable.find((a) => a.id === accountId) ?? null;

  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);

  // One mailbox query per pause in typing, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const list = useMailList(accountId, folder, query);
  const setRead = useSetMailRead(accountId);
  const trash = useTrashMail(accountId);
  const messages = useMemo(() => list.data?.pages.flatMap((p) => p.messages) ?? [], [list.data]);

  const clearSelection = () => {
    setOpenId(null);
    setDraft(null);
  };

  return {
    accounts: { loading: accounts.isLoading, error: accounts.error, all: accounts.data ?? [], usable },
    account,
    canSend,
    folder,
    search,
    list: { ...list, messages },
    openId,
    draft,
    /** Reader / compose are showing (used to swap panes on narrow screens). */
    detailOpen: !!openId || !!draft,
    setSearch,
    selectAccount: (id: number) => {
      setPickedId(id);
      clearSelection();
    },
    selectFolder: (f: MailFolder) => {
      setFolder(f);
      clearSelection();
    },
    openMessage: (m: MailSummary) => {
      setDraft(null);
      setOpenId(m.id);
      if (m.unread) setRead.mutate({ id: m.id, read: true });
    },
    compose: () => {
      setOpenId(null);
      setDraft({ replyTo: null });
    },
    reply: (m: MailDetail) => setDraft({ replyTo: m }),
    closeDraft: () => setDraft(null),
    closeDetail: clearSelection,
    trashMessage: (id: string) => trash.mutate(id, { onSuccess: () => setOpenId(null) }),
  };
}
