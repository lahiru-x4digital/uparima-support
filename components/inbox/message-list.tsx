"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/inbox";
import { MessageBubble } from "./message-bubble";

interface Props {
  conversationId: string;
  messages: Message[];
}

const NEAR_BOTTOM_PX = 120;

export function MessageList({ conversationId, messages }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Follow new messages only while the agent is already at the bottom, so reading
  // older replies is not interrupted by a refresh.
  const stick = useRef(true);

  useEffect(() => {
    stick.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (stick.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [conversationId, messages.length]);

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
      className="min-h-0 flex-1 overflow-y-auto bg-muted/30"
    >
      <div className="flex flex-col gap-3 p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
