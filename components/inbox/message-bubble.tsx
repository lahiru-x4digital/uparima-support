import { AlertCircle, Check, Clock, ExternalLink, FileText, Image as ImageIcon, MapPin, MapPinned, Paperclip } from "lucide-react";
import { assetUrl, cn } from "@/lib/utils";
import type { Attachment, Message } from "@/types/inbox";

function StateIcon({ state }: { state?: Message["state"] }) {
  if (state === "sending") return <Clock className="size-3.5 opacity-70" aria-label="Sending" />;
  if (state === "failed") return <AlertCircle className="size-3.5" aria-label="Not sent" />;
  if (state === undefined) return <Check className="size-3.5 opacity-70" aria-label="Sent" />;
  return null;
}

function Attachments({ items, out }: { items: Attachment[]; out: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      {items.map((a) => {
        const url = assetUrl(a.key);
        if (a.kind === "image") {
          return (
            <a key={a.key} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote user upload, size unknown */}
              <img src={url} alt={a.name} loading="lazy" className="max-h-52 rounded-lg object-cover" />
            </a>
          );
        }
        if (a.kind === "audio") {
          return (
            <div key={a.key} className="flex flex-col gap-1">
              <span className="text-xs opacity-80">Voice note</span>
              <audio controls preload="none" src={url} className="h-9 max-w-full" />
            </div>
          );
        }
        return (
          <a
            key={a.key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={cn("flex items-center gap-1 text-xs underline underline-offset-2", out ? "text-primary-foreground" : "text-primary")}
          >
            <Paperclip className="size-3" /> {a.name}
          </a>
        );
      })}
    </div>
  );
}

/** What a kind-specific message shows instead of (or alongside) its plain body — an icon-led
 * line for a one-off event (location, media, link), matching how WhatsApp itself renders them. */
function KindLine({ m }: { m: Message }) {
  switch (m.kind) {
    case "location":
      return (
        <p className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" /> <span className="whitespace-pre-wrap break-words">{m.body}</span>
        </p>
      );
    case "location_request":
      return (
        <p className="flex items-center gap-1.5">
          <MapPinned className="size-3.5 shrink-0" /> <span className="whitespace-pre-wrap break-words">{m.body}</span>
        </p>
      );
    case "media":
      return (
        <p className="flex items-center gap-1.5">
          {m.meta?.mediaKind === "image" ? <ImageIcon className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />}
          {m.body}
        </p>
      );
    case "cta":
      return (
        <div>
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs opacity-80">
            <ExternalLink className="size-3 shrink-0" /> {m.meta?.label ?? "Open link"}
          </p>
        </div>
      );
    default:
      return <p className="whitespace-pre-wrap break-words">{m.body}</p>;
  }
}

/** The menu's option titles, shown as their own full-width rows under the bubble — the way
 * WhatsApp renders a list or quick-reply buttons message (not as plain text in the bubble). */
function OptionRows({ options }: { options: string[] }) {
  if (options.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-px overflow-hidden rounded-lg border border-current/15">
      {options.map((o, i) => (
        <div key={`${o}-${i}`} className="bg-background/50 px-3 py-1.5 text-center text-sm font-medium text-primary">
          {o}
        </div>
      ))}
    </div>
  );
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

  const out = m.direction === "outbound";

  // What the customer tapped: WhatsApp shows this as the customer's own
  // small reply bubble, not a full message — same side, same style, just
  // the chosen option's title as its body.
  if (m.kind === "tap") {
    return (
      <div className={cn("flex", out ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", out ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
          <div className={cn("mb-0.5 text-xs", out ? "opacity-80" : "text-muted-foreground")}>{m.sender}</div>
          <p className="font-medium">{m.body}</p>
          <div className={cn("mt-1 flex items-center justify-end gap-1 text-[11px]", !out && "text-muted-foreground")}>
            <span className={cn(out && "opacity-80")}>{m.time}</span>
            {out && <StateIcon state={m.state} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          out ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
          m.state === "failed" && "bg-destructive text-destructive-foreground",
        )}
      >
        <div className={cn("mb-0.5 text-xs", out ? "opacity-80" : "text-muted-foreground")}>{m.sender}</div>
        <KindLine m={m} />
        {m.kind === "options" && <OptionRows options={m.meta?.options ?? []} />}
        <Attachments items={m.attachments} out={out} />
        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[11px]", !out && "text-muted-foreground")}>
          <span className={cn(out && "opacity-80")}>{m.time}</span>
          {out && <StateIcon state={m.state} />}
        </div>
      </div>
    </div>
  );
}
