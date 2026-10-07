"use client";

import { Inbox, Loader2, PenSquare, Search, Send, Star, Trash2 } from "lucide-react";
import { OptionSelect } from "@/components/inbox/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { EmailAccount } from "@/types/email-account";
import type { MailFolder, MailSummary } from "@/types/mailbox";

const FOLDERS: { id: MailFolder; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "starred", label: "Starred", icon: Star },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

interface Props {
  accounts: EmailAccount[];
  accountId: number;
  folder: MailFolder;
  search: string;
  messages: MailSummary[];
  openId: string | null;
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  canSend: boolean;
  onAccount: (id: number) => void;
  onFolder: (f: MailFolder) => void;
  onSearch: (q: string) => void;
  onOpen: (m: MailSummary) => void;
  onCompose: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
}

/** Mailbox picker, folder tabs, search and the message list. Presentational only. */
export function MailListPane(p: Props) {
  return (
    <div className="flex min-h-0 w-full flex-col bg-card">
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center gap-2">
          <OptionSelect label="Mailbox" value={String(p.accountId)} className="min-w-0 flex-1"
            options={p.accounts.map((a) => ({ value: String(a.id), label: a.email }))}
            onChange={(v) => p.onAccount(Number(v))} />
          {p.canSend && <Button size="sm" onClick={p.onCompose}><PenSquare /> Compose</Button>}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="Search mail" className="pl-8" aria-label="Search mail" />
        </div>
        <div className="flex gap-1">
          {FOLDERS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => p.onFolder(id)} aria-pressed={p.folder === id}
              className={cn("flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                p.folder === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {p.loading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : p.error ? (
          <div className="p-4 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(p.error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={p.onRetry}>Retry</Button>
          </div>
        ) : p.messages.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No messages.</p>
        ) : (
          <ul className="divide-y">
            {p.messages.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => p.onOpen(m)} aria-current={p.openId === m.id}
                  className={cn("block w-full px-4 py-3 text-left transition-colors hover:bg-muted/60", p.openId === m.id && "bg-primary/10")}>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("min-w-0 flex-1 truncate text-sm", m.unread && "font-bold")}>
                      {p.folder === "sent" ? m.to : (m.from.name ?? m.from.email)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{shortDate(m.date)}</span>
                  </div>
                  <p className={cn("truncate text-sm", m.unread ? "font-semibold" : "text-muted-foreground")}>{m.subject}</p>
                  {m.snippet && <p className="truncate text-xs text-muted-foreground">{m.snippet}</p>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {p.hasMore && (
          <div className="p-3 text-center">
            <Button variant="outline" size="sm" disabled={p.loadingMore} onClick={p.onLoadMore}>
              {p.loadingMore && <Loader2 className="animate-spin" />} Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
