import { Inbox } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/types/inbox";
import { ConversationItem } from "./conversation-item";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

// TODO(api): add loading skeletons, an error state with retry, and "load more" / infinite scroll
// (GET /support-desk/tickets is paginated) — only the empty state exists in this design.
export function ConversationList({ conversations, activeId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <Inbox className="size-8" />
        No conversations match your filters.
      </div>
    );
  }
  return (
    <ScrollArea className="min-h-0 flex-1">
      {conversations.map((c) => (
        <ConversationItem key={c.id} conversation={c} active={c.id === activeId} onSelect={() => onSelect(c.id)} />
      ))}
    </ScrollArea>
  );
}
