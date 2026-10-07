"use client";

import { useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSendMail } from "@/lib/hooks/use-mailbox";
import type { ComposeDraft } from "@/lib/hooks/use-mail-inbox";

const MAX_FILE = 15 * 1024 * 1024;

/** Compose a new mail, or reply to `draft.replyTo` (prefilled and threaded). */
export function MailCompose({ accountId, fromEmail, draft, onClose }: {
  accountId: number;
  fromEmail: string;
  draft: ComposeDraft;
  onClose: () => void;
}) {
  const orig = draft.replyTo;
  const [to, setTo] = useState(orig ? (orig.replyTo ?? orig.from.email) : "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(orig ? (/^re:/i.test(orig.subject) ? orig.subject : `Re: ${orig.subject}`) : "");
  const [text, setText] = useState(() =>
    orig
      ? `\n\nOn ${new Date(orig.date).toLocaleString()}, ${orig.from.name ?? orig.from.email} wrote:\n` +
        (orig.text ?? "").split("\n").map((l) => `> ${l}`).join("\n")
      : "",
  );
  const [files, setFiles] = useState<File[]>([]);
  const send = useSendMail();

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const tooBig = picked.find((f) => f.size > MAX_FILE);
    if (tooBig) return void toast.error(`${tooBig.name} is over 15 MB`);
    setFiles((prev) => [...prev, ...picked]);
  }

  function submit() {
    if (!to.trim()) return void toast.error("Add a recipient");
    if (!subject.trim()) return void toast.error("Add a subject");
    if (!text.trim()) return void toast.error("Write a message");
    send.mutate(
      { accountId, to, cc, bcc, subject, text, replyToId: orig?.id, files },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b bg-linear-to-r from-sidebar to-sidebar-end px-4 py-3 text-sidebar-foreground">
        <h2 className="flex-1 text-sm font-semibold">{orig ? "Reply" : "New message"}</h2>
        <Button variant="ghost" size="icon" aria-label="Discard" className="text-sidebar-foreground hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground" onClick={onClose}><X /></Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-xs text-muted-foreground">From: {fromEmail}</p>
        <div>
          <Label className="mb-1 text-xs font-semibold">To</Label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com, other@example.com" />
          {!showCc && <button type="button" className="mt-1 text-xs text-muted-foreground underline underline-offset-4" onClick={() => setShowCc(true)}>Cc / Bcc</button>}
        </div>
        {showCc && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="mb-1 text-xs font-semibold">Cc</Label><Input value={cc} onChange={(e) => setCc(e.target.value)} /></div>
            <div><Label className="mb-1 text-xs font-semibold">Bcc</Label><Input value={bcc} onChange={(e) => setBcc(e.target.value)} /></div>
          </div>
        )}
        <div><Label className="mb-1 text-xs font-semibold">Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} aria-label="Message" />
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">
                <Paperclip className="size-3" /> {f.name}
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="size-3" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-2 border-t p-3">
        <Button onClick={submit} disabled={send.isPending}>{send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
          <Paperclip className="size-4" /> Attach
          <input type="file" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <Button variant="ghost" onClick={onClose}>Discard</Button>
      </div>
    </div>
  );
}
