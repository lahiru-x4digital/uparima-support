"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/types/inbox";
import { MessageBubble } from "./message-bubble";

interface Props {
  messages: Message[];
  typingName: string | null;
}

export function MessageList({ messages, typingName }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typingName]);

  return (
    <ScrollArea className="min-h-0 flex-1 bg-muted/30">
      <div className="flex flex-col gap-3 p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {typingName && <p className="text-xs text-muted-foreground">{typingName} is typing…</p>}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
