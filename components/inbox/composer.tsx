"use client";

import { useState } from "react";
import { Paperclip, Send, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// TODO(api): quick replies are hard-coded. Load canned responses from the backend (no endpoint yet) or a
// per-category template list, and support {placeholders} like the translation files do.
const QUICK_REPLIES = [
  "Thanks for reaching out — I'm looking into this now.",
  "Could you share the ride ID so I can check?",
  "This has been escalated to our finance team.",
];

interface Props {
  disabled?: boolean;
  onSend: (text: string) => void;
  onNote: (text: string) => void;
}

export function Composer({ disabled, onSend, onNote }: Props) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const isNote = mode === "note";

  // TODO(ux): send state — keep the text and show an error toast if the request fails; disable while sending.
  // TODO(ux): emit a "typing" signal (throttled) once a realtime channel exists.
  function submit() {
    const value = text.trim();
    if (!value) return;
    (isNote ? onNote : onSend)(value);
    setText("");
  }

  return (
    <div className={cn("border-t p-3", isNote && "bg-amber-50/70 dark:bg-amber-950/20")}>
      <div className="mb-2 flex items-center gap-1">
        <Button size="xs" variant={isNote ? "ghost" : "secondary"} onClick={() => setMode("reply")}>Reply</Button>
        <Button size="xs" variant={isNote ? "secondary" : "ghost"} onClick={() => setMode("note")}>
          <StickyNote /> Internal note
        </Button>
      </div>

      {!isNote && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_REPLIES.map((q) => (
            <button key={q} type="button" onClick={() => setText(q)}
              className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
              {q.length > 34 ? `${q.slice(0, 34)}…` : q}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={isNote ? "Write an internal note (only staff can see this)…" : "Type a reply… (Enter to send)"}
          aria-label={isNote ? "Internal note" : "Reply"}
          className="max-h-40 min-h-10 resize-none"
          rows={2}
        />
        {/* TODO(api): attachments — open a file picker, upload with the reply (multipart `files` on
            POST /support-desk/tickets/:id/replies), show previews/progress, enforce size/type limits. */}
        <Button variant="ghost" size="icon" aria-label="Attach file" disabled={disabled}><Paperclip /></Button>
        <Button size="icon" aria-label={isNote ? "Add note" : "Send"} disabled={disabled || !text.trim()} onClick={submit}>
          <Send />
        </Button>
      </div>
    </div>
  );
}
