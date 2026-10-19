import { useEffect, useRef } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { ConversationItem, rowHover, rowTint } from "./conversation-item";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  /** True when a filter or search hides rows that are already loaded. */
  filtered: boolean;
  /** Show the red "unfinished" mark on each open card (the "Assigned to me" view). */
  markOpen?: boolean;
  /** The signed-in agent, to mark tickets that just landed on them. */
  meId?: number | null;
  onSelect: (id: string) => void;
  /** Tickets that can be ticked for "Close selected"; omit to hide the checkboxes. */
  canTick?: (c: Conversation) => boolean;
  ticked?: Set<string>;
  onTick?: (id: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
}

function Skeleton() {
  return (
    <div className="flex flex-col" aria-label="Loading conversations">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3 border-b px-3 py-3">
          <div className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationList({
  conversations, activeId, loading, error, hasMore, loadingMore, filtered, markOpen, meId, onSelect, canTick, ticked, onTick, onRetry, onLoadMore,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auto-load the next page once the sentinel after the last row scrolls
  // into view, instead of waiting for a manual "Load more" click.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <AlertCircle className="size-8 text-destructive" />
        <p>{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <Inbox className="size-8" />
        {filtered ? "No conversations match your filters." : "Nothing here yet."}
        {hasMore && <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loadingMore}>Load more</Button>}
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      {conversations.map((c) => {
        const item = (
          <ConversationItem key={c.id} conversation={c} active={c.id === activeId} markOpen={markOpen} meId={meId} onSelect={() => onSelect(c.id)} />
        );
        if (!canTick) return item;
        // The checkbox sits beside the row, not inside it: the row itself is a button.
        return (
          <div key={c.id} className="group/row flex">
            <div className={cn("flex w-8 shrink-0 items-center justify-center border-b transition-colors",
              rowTint(c, c.id === activeId, meId), rowHover(c.id === activeId))}>
              {canTick(c) && (
                <input type="checkbox" aria-label={`Select ${c.ticketNumber ?? c.customerName}`}
                  checked={!!ticked?.has(c.id)} onChange={() => onTick?.(c.id)} />
              )}
            </div>
            <div className="min-w-0 flex-1">{item}</div>
          </div>
        );
      })}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center p-3">
          {loadingMore && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      )}
    </ScrollArea>
  );
}
