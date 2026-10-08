"use client";

import { useRef } from "react";
import { Bold, Italic, Link2, List } from "lucide-react";
import { OptionSelect } from "@/components/inbox/option-select";
import { Textarea } from "@/components/ui/textarea";
import { EMAIL_VARIABLES } from "@/lib/email-template/defaults";

const VARIABLE_OPTIONS = [
  { value: "", label: "Insert variable" },
  ...EMAIL_VARIABLES.map((v) => ({ value: v, label: `{{${v}}}` })),
];

/** Textarea with a small formatting toolbar: **bold**, *italic*, [link](url), "- " lists, {{variables}}. */
export function RichTextInput({ value, onChange, rows = 4, label }: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Wraps the selection (or inserts at the cursor) and keeps the selection on the wrapped text. */
  function wrap(before: string, after = "", placeholder = "") {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const picked = value.slice(s, e) || placeholder;
    onChange(value.slice(0, s) + before + picked + after + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + picked.length);
    });
  }

  function bulletList() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const lines = value.slice(start, e).split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`));
    onChange(value.slice(0, start) + lines.join("\n") + value.slice(e));
  }

  const tool = "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <div className="overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring/40">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        <button type="button" className={tool} title="Bold" aria-label="Bold" onClick={() => wrap("**", "**", "bold text")}><Bold className="size-3.5" /></button>
        <button type="button" className={tool} title="Italic" aria-label="Italic" onClick={() => wrap("*", "*", "italic text")}><Italic className="size-3.5" /></button>
        <button type="button" className={tool} title="Link" aria-label="Link" onClick={() => wrap("[", "](https://)", "link text")}><Link2 className="size-3.5" /></button>
        <button type="button" className={tool} title="Bullet list" aria-label="Bullet list" onClick={bulletList}><List className="size-3.5" /></button>
        <div className="ml-auto">
          <OptionSelect label="Insert variable" value="" options={VARIABLE_OPTIONS}
            onChange={(v) => v && wrap(`{{${v}}}`)} className="h-7 text-xs" />
        </div>
      </div>
      <Textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} aria-label={label}
        className="rounded-none border-0 shadow-none focus-visible:ring-0" />
    </div>
  );
}
