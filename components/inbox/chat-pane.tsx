import { AlertCircle, Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation, ConversationStatus } from "@/types/inbox";
import { ChatHeader } from "./chat-header";
import { Composer } from "./composer";
import { HandoffBanner } from "./handoff-banner";
import { MessageList } from "./message-list";

interface Props {
  conversation: Conversation | null;
  /** True while the thread (replies) is loading for a selected ticket. */
  loading: boolean;
  error: string | null;
  contextOpen: boolean;
  canReply: boolean;
  canUpdate: boolean;
  markingContacted: boolean;
  onRetry: () => void;
  onBack: () => void;
  onToggleContext: () => void;
  onStatusChange: (status: ConversationStatus) => void;
  onSend: (text: string, files: File[]) => Promise<unknown>;
  onMarkContacted: () => void;
}

export function ChatPane({
  conversation, loading, error, contextOpen, canReply, canUpdate, markingContacted,
  onRetry, onBack, onToggleContext, onStatusChange, onSend, onMarkContacted,
}: Props) {
  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <MessagesSquare className="size-10" />
        <p className="text-sm">Select a conversation to start</p>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader conversation={conversation} contextOpen={contextOpen} canUpdate={canUpdate} onBack={onBack}
        onToggleContext={onToggleContext} onStatusChange={onStatusChange} />
      {conversation.channel === "whatsapp" && (
        <HandoffBanner conversation={conversation} canUpdate={canUpdate} marking={markingContacted} onMarkContacted={onMarkContacted} />
      )}
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="size-8 text-destructive" />
          <p>{error}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
        </div>
      ) : loading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
      ) : (
        <MessageList conversationId={conversation.id} messages={conversation.messages} />
      )}
      {canReply ? (
        conversation.channel === "whatsapp" && !conversation.isCurrentSession ? (
          <p className="border-t p-3 text-center text-xs text-muted-foreground">
            This conversation has ended. A reply would reach the customer now, in their current conversation — open that one to reply.
          </p>
        ) : conversation.channel === "whatsapp" && !conversation.canReply ? (
          <p className="border-t p-3 text-center text-xs text-muted-foreground">
            Can&apos;t reply: this customer&apos;s last WhatsApp message was over 23.5 hours ago. They&apos;ll need to write again first.
          </p>
        ) : (
          <Composer onSend={onSend} disabled={conversation.status === "completed" || !!error || loading} />
        )
      ) : (
        <p className="border-t p-3 text-center text-xs text-muted-foreground">Your account can&apos;t reply to tickets.</p>
      )}
    </div>
  );
}
