import { AlertCircle, Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation, ConversationStatus } from "@/types/inbox";
import { ChatHeader } from "./chat-header";
import { Composer } from "./composer";
import { HandoffBanner } from "./handoff-banner";
import { MessageList } from "./message-list";
import { TemplatePicker } from "./template-picker/template-picker";

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
  /** Email tickets: send a designed email template as the reply. */
  onSendEmailTemplate: (templateId: number, text: string) => Promise<unknown>;
  onMarkContacted: () => void;
}

export function ChatPane({
  conversation, loading, error, contextOpen, canReply, canUpdate, markingContacted,
  onRetry, onBack, onToggleContext, onStatusChange, onSend, onSendEmailTemplate, onMarkContacted,
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
          // A reply always reaches the customer now, in their current
          // session — no template or free text here helps a session that
          // has already ended; open the current one to reply instead.
          <p className="border-t p-3 text-center text-xs text-muted-foreground">
            This conversation has ended. A reply would reach the customer now, in their current conversation — open that one to reply.
          </p>
        ) : conversation.channel === "whatsapp" && !conversation.canReply ? (
          // Outside the 24-hour window only an approved template can reach the customer.
          <div className="flex flex-wrap items-center justify-center gap-3 border-t p-3 text-center text-xs text-muted-foreground">
            <span>The customer&apos;s last WhatsApp message was over 23.5 hours ago — free text can&apos;t be sent, but an approved template can.</span>
            <TemplatePicker conversation={conversation} onSendEmailTemplate={onSendEmailTemplate} sendOnly label="Send a template" />
          </div>
        ) : (
          <Composer onSend={onSend} disabled={conversation.status === "completed" || !!error || loading}
            renderTemplates={(insert) => (
              <TemplatePicker conversation={conversation} onSendEmailTemplate={onSendEmailTemplate} onInsertText={insert} />
            )} />
        )
      ) : (
        <p className="border-t p-3 text-center text-xs text-muted-foreground">Your account can&apos;t reply to tickets.</p>
      )}
    </div>
  );
}
