"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Palette, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { OptionSelect } from "@/components/inbox/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/api";
import { blockId, defaultDesign, newBlock } from "@/lib/email-template/defaults";
import { renderEmail } from "@/lib/email-template/render";
import { useCan } from "@/lib/hooks/use-desk";
import { useEmailTemplate, useSaveEmailTemplate } from "@/lib/hooks/use-email-templates";
import type { EmailBlock, EmailBlockType, EmailDesign, EmailFont, EmailSettings, EmailTemplate, TemplateProduct } from "@/types/message-template";
import { PRODUCT_OPTIONS } from "../meta-products";
import { BLOCK_META, BlockCard } from "./block-card";
import { EmailPreview } from "./email-preview";

const FONTS: { value: EmailFont; label: string }[] = [
  { value: "sans", label: "Arial (clean)" },
  { value: "rounded", label: "Trebuchet (friendly)" },
  { value: "serif", label: "Georgia (classic)" },
  { value: "mono", label: "Courier (mono)" },
];

const COLORS: { key: keyof Pick<EmailSettings, "accent" | "text" | "card" | "background">; label: string }[] = [
  { key: "accent", label: "Accent" },
  { key: "text", label: "Text" },
  { key: "card", label: "Card" },
  { key: "background", label: "Page" },
];

const ADDABLE: EmailBlockType[] = ["heading", "text", "image", "button", "divider", "spacer"];

/** New / edit email template. Pass `templateId` to edit. */
export function EmailTemplateEditorPage({ templateId }: { templateId?: number }) {
  const id = templateId ?? null;
  const { data, isLoading, error } = useEmailTemplate(id);
  if (id !== null && isLoading) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (id !== null && !data) return <p className="p-6 text-sm text-destructive">{error ? getErrorMessage(error) : "Template not found."}</p>;
  return <Editor key={data?.id ?? "new"} id={id} template={data ?? null} />;
}

function Editor({ id, template }: { id: number | null; template: EmailTemplate | null }) {
  const router = useRouter();
  const canWrite = useCan(id === null ? "email-template.create" : "email-template.update");
  const save = useSaveEmailTemplate(id);
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [product, setProduct] = useState<TemplateProduct | "">(template?.product ?? "");
  const [design, setDesign] = useState<EmailDesign>(() => template?.design ?? defaultDesign());

  const html = useMemo(() => renderEmail(design, subject), [design, subject]);

  const setSettings = (patch: Partial<EmailSettings>) => setDesign((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const setBlocks = (fn: (b: EmailBlock[]) => EmailBlock[]) => setDesign((d) => ({ ...d, blocks: fn(d.blocks) }));

  function move(i: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const next = [...bs];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  }

  function submit() {
    if (!name.trim()) return void toast.error("Give the template a name");
    if (!subject.trim()) return void toast.error("Add a subject line");
    if (!design.blocks.length) return void toast.error("Add at least one block");
    save.mutate(
      { name: name.trim(), subject: subject.trim(), product: product || null, design, html },
      { onSuccess: (t) => id === null && router.replace(`/templates/email/${t.id}`) },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="outline" size="sm" render={<Link href="/templates/email" />} nativeButton={false}><ArrowLeft /> Email templates</Button>
        <h1 className="text-base font-semibold">{id === null ? "New email template" : "Edit email template"}</h1>
        <div className="ml-auto">
          {canWrite && (
            <Button onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save template</Button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
        {/* Left: details, style and blocks */}
        <div className="space-y-4 lg:overflow-y-auto lg:pr-1">
          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <div>
                <Label className="mb-1 text-xs font-semibold">Template name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ticket received" />
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold">Product</Label>
                <OptionSelect label="Product" value={product} options={PRODUCT_OPTIONS} onChange={setProduct} className="w-full" />
              </div>
            </div>
            <div>
              <Label className="mb-1 text-xs font-semibold">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. We received your request — {{ticket_number}}" />
            </div>
            <div>
              <Label className="mb-1 text-xs font-semibold">Preview line (shown next to the subject in the inbox)</Label>
              <Input value={design.settings.preheader} onChange={(e) => setSettings({ preheader: e.target.value })} />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" /> Style</h2>
            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
              <div>
                <Label className="mb-1 text-xs">Font</Label>
                <OptionSelect label="Font" value={design.settings.font} options={FONTS} onChange={(font) => setSettings({ font })} className="w-full" />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {COLORS.map(({ key, label }) => (
                  <label key={key} className="flex flex-col gap-1 text-xs">
                    {label}
                    <input type="color" value={design.settings[key]} onChange={(e) => setSettings({ [key]: e.target.value })}
                      className="h-8 w-12 cursor-pointer rounded-md border bg-transparent p-0.5" aria-label={`${label} colour`} />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1 text-xs">Footer (small grey text below the card)</Label>
              <Input value={design.settings.footer} onChange={(e) => setSettings({ footer: e.target.value })} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Content</h2>
            {design.blocks.length === 0 && (
              <p className="mb-3 rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Add a block below to start.</p>
            )}
            <ul className="space-y-3">
              {design.blocks.map((b, i) => (
                <BlockCard key={b.id} block={b} first={i === 0} last={i === design.blocks.length - 1}
                  onChange={(nb) => setBlocks((bs) => bs.map((x) => (x.id === b.id ? nb : x)))}
                  onMove={(dir) => move(i, dir)}
                  onDuplicate={() => setBlocks((bs) => [...bs.slice(0, i + 1), { ...b, id: blockId() }, ...bs.slice(i + 1)])}
                  onRemove={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))} />
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-dashed bg-card p-3">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Plus className="size-3.5" /> Add</span>
              {ADDABLE.map((t) => {
                const Icon = BLOCK_META[t].icon;
                return (
                  <Button key={t} type="button" variant="outline" size="sm" onClick={() => setBlocks((bs) => [...bs, newBlock(t)])}>
                    <Icon /> {BLOCK_META[t].label}
                  </Button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: live preview */}
        <div className="min-h-[600px] lg:min-h-0">
          <EmailPreview html={html} subject={subject} preheader={design.settings.preheader} />
        </div>
      </div>
    </div>
  );
}
