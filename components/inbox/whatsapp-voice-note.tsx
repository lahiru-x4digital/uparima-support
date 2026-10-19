"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useVoiceNote } from "@/lib/hooks/use-bot-chats";
import { cn } from "@/lib/utils";

/** A voice note kept only on WhatsApp: fetched from WhatsApp through the backend when the agent
 * presses play (the request needs the agent's sign-in, so a plain `<audio src>` can't load it). */
export function WhatsappVoiceNote({ messageId, out }: { messageId: string; out: boolean }) {
  const [requested, setRequested] = useState(false);
  const { data, isFetching, isError } = useVoiceNote(messageId, requested);
  const url = useMemo(() => (data ? URL.createObjectURL(data) : null), [data]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  if (isError) {
    return <span className="text-xs opacity-80">Voice note no longer available on WhatsApp</span>;
  }
  if (url) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs opacity-80">Voice note</span>
        <audio controls autoPlay src={url} className="h-9 max-w-full" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setRequested(true)}
      disabled={isFetching}
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        out ? "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10" : "border-border hover:bg-background/60",
      )}
    >
      {isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5 fill-current" />}
      {isFetching ? "Loading…" : "Play voice note"}
    </button>
  );
}
