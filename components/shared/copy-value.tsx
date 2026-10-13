"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * A value an agent reads out or pastes elsewhere (phone, NIC, licence no.), with a one-click copy
 * button. `href` turns the value itself into a link — `tel:` for phone numbers.
 */
export function CopyValue({
  value,
  href,
  children,
  className,
}: {
  value: string | null | undefined;
  href?: string;
  children?: ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value!);
      setCopied(true);
      toast.success("Copied", { description: value!, duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select the text instead");
    }
  }

  const shown = children ?? value;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {href ? (
        <a href={href} className="text-primary underline-offset-2 hover:underline">
          {shown}
        </a>
      ) : (
        <span className="select-all">{shown}</span>
      )}
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy ${value}`}
        title="Copy"
        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
