import { Check, CheckCheck, Clock, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/inbox";

function StateIcon({ state }: { state?: Message["state"] }) {
  // Icons sit on the primary-coloured bubble: dim for in-flight states, full white + bold for "read".
  if (state === "sending") return <Clock className="size-3.5 opacity-70" />;
  if (state === "sent") return <Check className="size-3.5 opacity-70" />;
  if (state === "delivered") return <CheckCheck className="size-3.5 opacity-70" />;
  if (state === "read") return <CheckCheck className="size-3.5 stroke-[2.75] text-primary-foreground" aria-label="Read" />;
  return null;
}

export function MessageBubble({ message: m }: { message: Message }) {
  if (m.kind === "system") {
    return (
      <div className="my-1 flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {m.body} · {m.time}
        </span>
      </div>
    );
  }

  if (m.kind === "note") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <div className="mb-0.5 flex items-center gap-1 text-xs font-medium">
            <StickyNote className="size-3" /> Internal note · {m.sender}
          </div>
          {m.body}
          <div className="mt-1 text-right text-[11px] opacity-70">{m.time}</div>
        </div>
      </div>
    );
  }

  const out = m.direction === "outbound";
  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          out ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
        )}
      >
        {out && <div className="mb-0.5 text-xs opacity-80">{m.sender}</div>}
        <p className="whitespace-pre-wrap">{m.body}</p>
        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[11px]", !out && "text-muted-foreground")}>
          <span className={cn(out && "opacity-80")}>{m.time}</span>
          {out && <StateIcon state={m.state} />}
        </div>
      </div>
    </div>
  );
}
