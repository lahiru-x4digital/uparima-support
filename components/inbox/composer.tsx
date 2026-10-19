"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Square, StickyNote, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatSeconds, useVoiceRecorder, VOICE_MAX_SECONDS } from "@/lib/hooks/use-voice-recorder";

// TODO(api): quick replies are hard-coded; the backend has no canned-response endpoint yet.
const QUICK_REPLIES = [
  "Thanks for reaching out — I'm looking into this now.",
  "Could you share the ride ID so I can check?",
  "This has been escalated to our finance team.",
];

// The upload service accepts these for ticket attachments.
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,audio/ogg,audio/mpeg,audio/mp4";
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  disabled?: boolean;
  /** Resolves when saved, rejects on failure (the composer then keeps the text). */
  onSend: (text: string, files: File[]) => Promise<unknown>;
  /** Renders the Templates button; `insert` adds text to the reply box (after any existing text). */
  renderTemplates?: (insert: (text: string) => void) => React.ReactNode;
  /** Opens the details panel's internal notes (drivers only); without it the button explains why it's off. */
  onInternalNote?: () => void;
  /** WhatsApp only: shows the mic button. Resolves when sent, rejects on failure (the recording is kept). */
  onSendVoice?: (recording: Blob) => Promise<unknown>;
}

export function Composer({ disabled, onSend, renderTemplates, onInternalNote, onSendVoice }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();
  const voiceActive = voice.state.status !== "idle";

  async function sendVoice() {
    if (voice.state.status !== "recorded" || !onSendVoice || sending) return;
    setSending(true);
    try {
      await onSendVoice(voice.state.blob);
      voice.discard();
    } catch {
      // The failure toast comes from the mutation; the recording stays so it can be sent again.
    } finally {
      setSending(false);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        toast.error(`At most ${MAX_FILES} files per reply`);
        break;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than ${MAX_BYTES / 1024 / 1024} MB`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (picker.current) picker.current.value = "";
  }

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onSend(value, files);
      setText("");
      setFiles([]);
    } catch {
      // The failure toast comes from the mutation; the text stays so nothing is lost.
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t p-3">
      <div className="mb-2 flex items-center gap-1">
        <Button size="xs" variant="secondary">Reply</Button>
        {onInternalNote ? (
          <Button size="xs" variant="ghost" onClick={onInternalNote} title="Staff-only note on this driver, in the details panel">
            <StickyNote /> Internal note
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button size="xs" variant="ghost" disabled><StickyNote /> Internal note</Button>
            </TooltipTrigger>
            <TooltipContent>Internal notes are kept on drivers — this customer isn&apos;t one</TooltipContent>
          </Tooltip>
        )}
        {renderTemplates && !disabled && (
          <div className="ml-auto">{renderTemplates((t) => setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${t}` : t)))}</div>
        )}
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {QUICK_REPLIES.map((q) => (
          <button key={q} type="button" onClick={() => setText(q)} disabled={disabled}
            className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
            {q.length > 34 ? `${q.slice(0, 34)}…` : q}
          </button>
        ))}
      </div>

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <Paperclip className="size-3" /> {f.name}
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {voice.error && <p className="mb-2 text-xs text-destructive">{voice.error}</p>}

      {voice.state.status === "recording" ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
          <span className="flex-1 text-sm tabular-nums">
            Recording {formatSeconds(voice.state.seconds)}
            <span className="text-muted-foreground"> / {formatSeconds(VOICE_MAX_SECONDS)}</span>
          </span>
          <Button variant="ghost" size="icon" aria-label="Discard recording" onClick={voice.discard}>
            <Trash2 />
          </Button>
          <Button size="icon" aria-label="Stop recording" onClick={voice.stop}>
            <Square className="fill-current" />
          </Button>
        </div>
      ) : voice.state.status === "recorded" ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1.5">
          <Button variant="ghost" size="icon" aria-label="Discard voice note" disabled={sending} onClick={voice.discard}>
            <Trash2 />
          </Button>
          <audio controls src={voice.state.url} className="h-9 min-w-0 flex-1" />
          <span className="text-xs tabular-nums text-muted-foreground">{formatSeconds(voice.state.seconds)}</span>
          <Button size="icon" aria-label="Send voice note" disabled={disabled || sending} onClick={() => void sendVoice()}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      ) : null}

      <div className={cn("flex items-end gap-2", voiceActive && "hidden")}>
        <Textarea
          value={text}
          disabled={disabled || sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Type a reply… (Enter to send)"
          aria-label="Reply"
          className="max-h-40 min-h-10 resize-none"
          rows={2}
        />
        <input ref={picker} type="file" multiple accept={ACCEPT} hidden onChange={(e) => addFiles(e.target.files)} />
        <Button variant="ghost" size="icon" aria-label="Attach file" disabled={disabled || sending} onClick={() => picker.current?.click()}>
          <Paperclip />
        </Button>
        {onSendVoice && voice.supported && (
          <Button variant="ghost" size="icon" aria-label="Record a voice note" title="Record a voice note"
            disabled={disabled || sending} onClick={() => void voice.start()}>
            <Mic />
          </Button>
        )}
        <Button size="icon" aria-label="Send" disabled={disabled || sending || !text.trim()} onClick={() => void submit()}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}
