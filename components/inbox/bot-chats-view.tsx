"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Bot, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getErrorMessage } from "@/lib/api";
import { useBotChatList, useBotChatThread } from "@/lib/hooks/use-bot-chats";
import { formatTime } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import type { BotChatMessage, BotChatRow } from "@/types/bot-chat";
import type { Message } from "@/types/inbox";
import { initials, languageLabel } from "./meta";
import { MessageList } from "./message-list";

const displayName = (c: { name: string | null; phone: string }) => c.name ?? `+${c.phone}`;

function options(meta: BotChatMessage["meta"]): string[] {
  const list = meta?.options;
  return Array.isArray(list) ? list.filter((o): o is string => typeof o === "string") : [];
}

/** What the person saw (or did) in WhatsApp, as one line of text. */
function bodyOf(m: BotChatMessage): string {
  switch (m.kind) {
    case "tap":
      return `Tapped: ${m.body}`;
    case "location":
      return `📍 Shared a location${m.body ? `: ${m.body}` : ""}`;
    case "location_request":
      return `${m.body}\n[Asked for a location]`;
    case "media":
      return `📎 Sent a ${m.body.toLowerCase()}`;
    case "cta":
      return `${m.body}\n[Link: ${typeof m.meta?.label === "string" ? m.meta.label : "open"}]`;
    case "buttons":
    case "list": {
      const opts = options(m.meta);
      return opts.length ? `${m.body}\n[${opts.join(" · ")}]` : m.body;
    }
    default:
      return m.body;
  }
}

function toMessage(m: BotChatMessage, customer: string): Message {
  return {
    id: m.id,
    direction: m.direction === "in" ? "inbound" : "outbound",
    kind: "text",
    body: bodyOf(m),
    time: formatTime(m.createdAt),
    sender: m.direction === "in" ? customer : "Bot",
    attachments: [],
  };
}

function Row({ row, active, onSelect }: { row: BotChatRow; active: boolean; onSelect: () => void }) {
  const name = displayName(row);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn("flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60", active && "bg-muted")}
    >
      <Avatar size="lg">
        <AvatarFallback>{initials(name) || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatTime(row.lastAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {row.lastDirection === "out" ? "Bot: " : ""}
          {row.lastKind === "tap" ? `Tapped: ${row.lastBody}` : row.lastBody || `(${row.lastKind})`}
        </p>
      </div>
    </button>
  );
}

function Thread({ phone, onBack }: { phone: string; onBack: () => void }) {
  const thread = useBotChatThread(phone);
  const contact = thread.data?.contact;
  const customer = contact ? displayName(contact) : `+${phone}`;
  const messages = useMemo(
    () => (thread.data?.messages ?? []).map((m) => toMessage(m, customer)),
    [thread.data, customer],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back to bot chats">
          <ArrowLeft />
        </Button>
        <Avatar>
          <AvatarFallback>{initials(customer) || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{customer}</h2>
          <p className="truncate text-xs text-muted-foreground">
            +{phone}
            {contact?.language ? ` · ${languageLabel(contact.language)}` : ""}
            {contact ? ` · step: ${contact.state}` : ""}
          </p>
        </div>
        <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">Read only</span>
      </header>

      {thread.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
      ) : thread.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="size-8 text-destructive" />
          <p>{getErrorMessage(thread.error)}</p>
          <Button size="sm" variant="outline" onClick={() => void thread.refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          {thread.data?.hasMore && (
            <p className="border-b bg-muted/40 px-3 py-1.5 text-center text-xs text-muted-foreground">Showing the latest messages only.</p>
          )}
          <MessageList conversationId={phone} messages={messages} />
        </>
      )}
    </div>
  );
}

/** Every conversation the WhatsApp bot has had, read only. Staff reply through tickets. */
export function BotChatsView() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const list = useBotChatList(search.trim());
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);

  return (
    <div className="flex min-h-0 flex-1">
      <section className={cn("flex min-h-0 w-full flex-col border-r lg:w-[360px] lg:shrink-0", active && "hidden lg:flex")}>
        <div className="relative border-b p-3">
          <Search className="pointer-events-none absolute top-1/2 left-5.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or number" className="pl-8" aria-label="Search bot chats" />
        </div>
        {list.isLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
        ) : list.isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <AlertCircle className="size-8 text-destructive" />
            <p>{getErrorMessage(list.error)}</p>
            <Button size="sm" variant="outline" onClick={() => void list.refetch()}>Try again</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Bot className="size-8" />
            {search ? "No bot chats match your search." : "No bot conversations yet."}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            {rows.map((r) => (
              <Row key={r.phone} row={r} active={r.phone === active} onSelect={() => setActive(r.phone)} />
            ))}
            {list.hasNextPage && (
              <div className="p-3">
                <Button variant="outline" size="sm" className="w-full" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage ? <Loader2 className="animate-spin" /> : null} Load more
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </section>

      <main className={cn("min-h-0 min-w-0 flex-1", active ? "flex" : "hidden lg:flex")}>
        {active ? (
          <Thread phone={active} onBack={() => setActive(null)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Bot className="size-8" /> Pick a conversation to read it.
          </div>
        )}
      </main>
    </div>
  );
}
