"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/** Live preview of the rendered email in a fully sandboxed frame, at desktop or phone width. */
export function EmailPreview({ html, subject, preheader }: { html: string; subject: string; preheader: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{subject || "(no subject)"}</p>
          <p className="truncate text-xs text-muted-foreground">{preheader || "Inbox preview line"}</p>
        </div>
        <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Preview size">
          {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
            <button key={d} type="button" role="radio" aria-checked={device === d} aria-label={`${d} preview`} onClick={() => setDevice(d)}
              className={cn("inline-flex size-7 items-center justify-center rounded-md", device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/50 p-3">
        {/* sandbox with no permissions: the preview can't run scripts or navigate. */}
        <iframe title="Email preview" sandbox="" srcDoc={html}
          className={cn("h-full min-h-[520px] rounded-lg border bg-white shadow-sm transition-[width]", device === "desktop" ? "w-full max-w-[680px]" : "w-[375px]")} />
      </div>
    </div>
  );
}
