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

  // Voice notes: one plays at a time, and whatever is playing stops when the agent switches
  // conversation or leaves. Media events don't bubble, so this listens in the capture phase.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let playing: HTMLMediaElement | null = null;
    const onPlay = (e: Event) => {
      const media = e.target as HTMLMediaElement;
      if (playing && playing !== media) playing.pause();
      playing = media;
    };
    el.addEventListener("play", onPlay, true);
    return () => {
      el.removeEventListener("play", onPlay, true);
      playing?.pause();
    };
  }, [conversationId]);

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
        {messages.map((m) =>
          m.kind === "divider" ? (
            <div key={m.id} role="separator" className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span className="shrink-0">{m.body}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : (
            <MessageBubble key={m.id} message={m} />
          ),
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
