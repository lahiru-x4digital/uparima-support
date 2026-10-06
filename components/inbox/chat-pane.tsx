import { MessagesSquare } from "lucide-react";
import type { Conversation, ConversationStatus } from "@/types/inbox";
import { ChatHeader } from "./chat-header";
import { Composer } from "./composer";
import { MessageList } from "./message-list";

interface Props {
  conversation: Conversation | null;
  contextOpen: boolean;
  typingName: string | null;
  onBack: () => void;
  onToggleContext: () => void;
  onStatusChange: (status: ConversationStatus) => void;
  onSend: (text: string) => void;
  onNote: (text: string) => void;
}

export function ChatPane({ conversation, contextOpen, typingName, onBack, onToggleContext, onStatusChange, onSend, onNote }: Props) {
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
      <ChatHeader conversation={conversation} contextOpen={contextOpen} onBack={onBack}
        onToggleContext={onToggleContext} onStatusChange={onStatusChange} />
      <MessageList messages={conversation.messages} typingName={typingName} />
      <Composer onSend={onSend} onNote={onNote} disabled={conversation.status === "closed"} />
    </div>
  );
}
