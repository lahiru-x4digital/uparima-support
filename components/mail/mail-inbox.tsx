"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Settings2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useMailInbox } from "@/lib/hooks/use-mail-inbox";
import { cn } from "@/lib/utils";
import { MailCompose } from "./mail-compose";
import { MailListPane } from "./mail-list-pane";
import { EmptyReader, MailReader } from "./mail-reader";

/**
 * A mailbox you can read, reply to and send from. Used by the Messages page ("Email" tab) and
 * Email → Inbox. State lives in `useMailInbox`; the panes below only render it.
 */
export function MailInbox() {
  const s = useMailInbox();

  if (s.accounts.loading) {
    return <div className="flex flex-1 items-center justify-center p-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (s.accounts.error) return <p className="p-6 text-sm text-destructive">{getErrorMessage(s.accounts.error)}</p>;

  if (!s.account) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Mail className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{s.accounts.all.length ? "All mailboxes are paused." : "No mailbox connected yet."}</p>
        <Link href="/email/config" className={buttonVariants()}><Settings2 /> Open Email Config</Link>
      </div>
    );
  }
  const account = s.account;

  return (
    <div className="flex min-h-0 flex-1">
      {/* On narrow screens the list and the reader take turns; from md up they sit side by side. */}
      <section className={cn("flex min-h-0 w-full border-r md:w-96 md:shrink-0", s.detailOpen && "hidden md:flex")}>
        <MailListPane
          accounts={s.accounts.usable}
          accountId={account.id}
          folder={s.folder}
          search={s.search}
          messages={s.list.messages}
          openId={s.openId}
          loading={s.list.isLoading}
          error={s.list.error}
          hasMore={!!s.list.hasNextPage}
          loadingMore={s.list.isFetchingNextPage}
          canSend={s.canSend}
          onAccount={s.selectAccount}
          onFolder={s.selectFolder}
          onSearch={s.setSearch}
          onOpen={s.openMessage}
          onCompose={s.compose}
          onRetry={() => void s.list.refetch()}
          onLoadMore={() => void s.list.fetchNextPage()}
        />
      </section>

      <main className={cn("min-w-0 flex-1 flex-col bg-background", s.detailOpen ? "flex" : "hidden md:flex")}>
        {s.detailOpen && (
          <Button variant="ghost" size="sm" className="m-2 w-fit md:hidden" onClick={s.closeDetail}><ArrowLeft /> Back</Button>
        )}
        {s.draft ? (
          <MailCompose key={s.draft.replyTo?.id ?? "new"} accountId={account.id} fromEmail={account.email} draft={s.draft} onClose={s.closeDraft} />
        ) : s.openId ? (
          <MailReader key={s.openId} accountId={account.id} messageId={s.openId} canSend={s.canSend}
            onReply={s.reply} onTrash={s.trashMessage} />
        ) : (
          <EmptyReader />
        )}
      </main>
    </div>
  );
}
