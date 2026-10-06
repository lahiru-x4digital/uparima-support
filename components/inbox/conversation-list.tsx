import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/types/inbox";
import { ConversationItem } from "./conversation-item";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  /** True when a filter or search hides rows that are already loaded. */
  filtered: boolean;
  onSelect: (id: string) => void;
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
  conversations, activeId, loading, error, hasMore, loadingMore, filtered, onSelect, onRetry, onLoadMore,
}: Props) {
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
      {conversations.map((c) => (
        <ConversationItem key={c.id} conversation={c} active={c.id === activeId} onSelect={() => onSelect(c.id)} />
      ))}
      {hasMore && (
        <div className="p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="animate-spin" /> : null} Load more
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}
