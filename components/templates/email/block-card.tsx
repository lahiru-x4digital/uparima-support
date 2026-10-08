"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Heading, Image as ImageIcon, Minus, MousePointerClick, MoveVertical, Trash2, Type } from "lucide-react";
import { OptionSelect } from "@/components/inbox/option-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeUrl } from "@/lib/email-template/render";
import { cn } from "@/lib/utils";
import type { BlockAlign, EmailBlock, EmailBlockType } from "@/types/message-template";
import { ImageUploadButton } from "../image-upload-button";
import { RichTextInput } from "./rich-text-input";

export const BLOCK_META: Record<EmailBlockType, { label: string; icon: typeof Type }> = {
  heading: { label: "Heading", icon: Heading },
  text: { label: "Text", icon: Type },
  image: { label: "Image", icon: ImageIcon },
  button: { label: "Button", icon: MousePointerClick },
  divider: { label: "Divider", icon: Minus },
  spacer: { label: "Spacer", icon: MoveVertical },
};

const LEVELS = [
  { value: "1", label: "Large (H1)" },
  { value: "2", label: "Medium (H2)" },
  { value: "3", label: "Small (H3)" },
];

function AlignToggle({ value, onChange }: { value: BlockAlign; onChange: (a: BlockAlign) => void }) {
  const opts: { v: BlockAlign; icon: typeof AlignLeft }[] = [
    { v: "left", icon: AlignLeft },
    { v: "center", icon: AlignCenter },
    { v: "right", icon: AlignRight },
  ];
  return (
    <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Alignment">
      {opts.map(({ v, icon: Icon }) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} aria-label={`Align ${v}`} onClick={() => onChange(v)}
          className={cn("inline-flex size-7 items-center justify-center rounded-md", value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

const BadLink = ({ url }: { url: string }) =>
  url.trim() && !safeUrl(url) ? <p className="mt-1 text-xs text-destructive">Use a full https:// link — this one will be left out.</p> : null;

/** One block in the designer: its fields plus move / duplicate / delete. */
export function BlockCard({ block: b, first, last, onChange, onMove, onDuplicate, onRemove }: {
  block: EmailBlock;
  first: boolean;
  last: boolean;
  onChange: (b: EmailBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const meta = BLOCK_META[b.type];
  const Icon = meta.icon;
  const icon = "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30";

  return (
    <li className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="size-4 text-primary" />
        <span className="flex-1 text-sm font-semibold">{meta.label}</span>
        <button type="button" className={icon} disabled={first} aria-label="Move up" onClick={() => onMove(-1)}><ArrowUp className="size-3.5" /></button>
        <button type="button" className={icon} disabled={last} aria-label="Move down" onClick={() => onMove(1)}><ArrowDown className="size-3.5" /></button>
        <button type="button" className={icon} aria-label="Duplicate" onClick={onDuplicate}><Copy className="size-3.5" /></button>
        <button type="button" className={icon} aria-label="Delete block" onClick={onRemove}><Trash2 className="size-3.5 text-destructive" /></button>
      </div>

      <div className="space-y-3 p-3">
        {b.type === "heading" && (
          <>
            <Input value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} aria-label="Heading text" />
            <div className="flex items-center gap-2">
              <OptionSelect label="Heading size" value={String(b.level)} options={LEVELS}
                onChange={(v) => onChange({ ...b, level: Number(v) as 1 | 2 | 3 })} />
              <AlignToggle value={b.align} onChange={(align) => onChange({ ...b, align })} />
            </div>
          </>
        )}

        {b.type === "text" && (
          <>
            <RichTextInput label="Text" value={b.text} onChange={(text) => onChange({ ...b, text })} rows={5} />
            <AlignToggle value={b.align} onChange={(align) => onChange({ ...b, align })} />
          </>
        )}

        {b.type === "image" && (
          <>
            <div className="flex items-center gap-3">
              {b.url && safeUrl(b.url) ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded remote image preview
                <img src={b.url} alt="" className="size-14 rounded-md border object-cover" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-md border border-dashed text-muted-foreground"><ImageIcon className="size-5" /></span>
              )}
              <ImageUploadButton label={b.url ? "Replace image" : "Upload image"} onUploaded={({ url }) => onChange({ ...b, url })} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Image URL</Label>
              <Input value={b.url} onChange={(e) => onChange({ ...b, url: e.target.value })} placeholder="https://…" />
              <BadLink url={b.url} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 text-xs">Alt text (shown if images are blocked)</Label>
                <Input value={b.alt} onChange={(e) => onChange({ ...b, alt: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 text-xs">Link when clicked (optional)</Label>
                <Input value={b.href} onChange={(e) => onChange({ ...b, href: e.target.value })} placeholder="https://…" />
                <BadLink url={b.href} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Width</Label>
              <input type="range" min={20} max={100} step={5} value={b.width} aria-label="Image width"
                onChange={(e) => onChange({ ...b, width: Number(e.target.value) })} className="flex-1 accent-primary" />
              <span className="w-10 text-right text-xs tabular-nums">{b.width}%</span>
              <AlignToggle value={b.align} onChange={(align) => onChange({ ...b, align })} />
            </div>
          </>
        )}

        {b.type === "button" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 text-xs">Button text</Label>
                <Input value={b.label} onChange={(e) => onChange({ ...b, label: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 text-xs">Link</Label>
                <Input value={b.url} onChange={(e) => onChange({ ...b, url: e.target.value })} placeholder="https://…" />
                <BadLink url={b.url} />
              </div>
            </div>
            <AlignToggle value={b.align} onChange={(align) => onChange({ ...b, align })} />
          </>
        )}

        {b.type === "divider" && <p className="text-xs text-muted-foreground">A thin line separating sections.</p>}

        {b.type === "spacer" && (
          <div className="flex items-center gap-3">
            <Label className="text-xs">Height</Label>
            <input type="range" min={8} max={96} step={4} value={b.height} aria-label="Spacer height"
              onChange={(e) => onChange({ ...b, height: Number(e.target.value) })} className="flex-1 accent-primary" />
            <span className="w-12 text-right text-xs tabular-nums">{b.height}px</span>
          </div>
        )}
      </div>
    </li>
  );
}
