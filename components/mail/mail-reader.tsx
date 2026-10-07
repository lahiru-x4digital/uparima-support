"use client";

import { Download, Loader2, MailOpen, Paperclip, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useMailMessage } from "@/lib/hooks/use-mailbox";
import { downloadMailAttachment } from "@/lib/services/mailbox.service";
import type { MailAttachment } from "@/types/mailbox";

const who = (a: { name: string | null; email: string }) => (a.name ? `${a.name} <${a.email}>` : a.email);
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Wraps an email's HTML for the sandboxed preview: links open in a new tab, nothing can run. */
const frameDoc = (html: string) =>
  `<!doctype html><base target="_blank"><meta name="referrer" content="no-referrer"><style>body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:16px;word-wrap:break-word}img{max-width:100%;height:auto}</style>${html}`;

export function MailReader({
  accountId, messageId, canSend, onReply, onTrash,
}: {
  accountId: number;
  messageId: string;
  canSend: boolean;
  onReply: (m: NonNullable<ReturnType<typeof useMailMessage>["data"]>) => void;
  onTrash: (id: string) => void;
}) {
  const { data: m, isLoading, error } = useMailMessage(accountId, messageId);

  async function download(a: MailAttachment) {
    try {
      const url = URL.createObjectURL(await downloadMailAttachment(accountId, messageId, a.id));
      const link = document.createElement("a");
      link.href = url;
      link.download = a.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  if (error || !m) return <p className="p-6 text-sm text-destructive">{error ? getErrorMessage(error) : "Message not found."}</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b p-4">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-base font-semibold">{m.subject}</h2>
          {canSend && <Button size="sm" onClick={() => onReply(m)}><Reply /> Reply</Button>}
          {canSend && (
            <Button size="icon" variant="ghost" aria-label="Move to trash" onClick={() => onTrash(m.id)}><Trash2 className="text-destructive" /></Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{who(m.from)}</strong> · {new Date(m.date).toLocaleString()}
        </p>
        <p className="truncate text-xs text-muted-foreground">To: {m.to}{m.cc ? ` · Cc: ${m.cc}` : ""}</p>
        {m.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {m.attachments.map((a) => (
              <li key={a.id}>
                <Button variant="outline" size="sm" onClick={() => void download(a)}>
                  <Paperclip /> {a.filename} <span className="text-muted-foreground">{size(a.size)}</span> <Download />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {m.html ? (
        // No allow-scripts / allow-same-origin: a hostile email can neither run code nor touch the portal.
        <iframe title="Email content" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"
          srcDoc={frameDoc(m.html)} className="min-h-0 w-full flex-1 bg-white" />
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-sans text-sm">{m.text ?? "(empty message)"}</pre>
      )}
    </div>
  );
}

export function EmptyReader() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
      <MailOpen className="size-8" />
      <p className="text-sm">Select an email to read it</p>
    </div>
  );
}
