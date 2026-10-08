"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Bold, Braces, ExternalLink, Italic, Loader2, Phone, Reply, Save, Send, Strikethrough, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OptionSelect } from "@/components/inbox/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import {
  useDeleteWhatsappTemplate,
  useSaveWhatsappTemplate,
  useSubmitWhatsappTemplate,
  useWhatsappMetaStatus,
  useWhatsappTemplate,
} from "@/lib/hooks/use-whatsapp-templates";
import { nextVar, templateVars } from "@/lib/whatsapp-template/format";
import { cn } from "@/lib/utils";
import type { WhatsappButton, WhatsappHeaderType, WhatsappTemplate, WhatsappTemplateInput } from "@/types/message-template";
import { PRODUCT_OPTIONS } from "../meta-products";
import { CATEGORY_OPTIONS, EDITABLE, LANGUAGE_OPTIONS, LIMITS, WA_STATUS } from "./meta";
import { WhatsappPreview } from "@/components/template-preview/whatsapp-preview";

const EMPTY: WhatsappTemplateInput = {
  name: "", language: "en", category: "UTILITY", product: null, headerType: "none", headerText: null, headerExample: null,
  body: "", bodyExamples: [], footer: null, buttons: [],
};

const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 512);

/** New / edit WhatsApp template. Pass `templateId` to edit. */
export function WhatsappTemplateFormPage({ templateId }: { templateId?: number }) {
  const id = templateId ?? null;
  const { data, isLoading, error } = useWhatsappTemplate(id);
  if (id !== null && isLoading) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (id !== null && !data) return <p className="p-6 text-sm text-destructive">{error ? getErrorMessage(error) : "Template not found."}</p>;
  return <Form key={`${data?.id ?? "new"}-${data?.status ?? ""}`} id={id} template={data ?? null} />;
}

function Form({ id, template }: { id: number | null; template: WhatsappTemplate | null }) {
  const router = useRouter();
  const meta = useWhatsappMetaStatus();
  const save = useSaveWhatsappTemplate(id);
  const submitToMeta = useSubmitWhatsappTemplate();
  const remove = useDeleteWhatsappTemplate();
  const canWrite = useCan(id === null ? "whatsapp-template.create" : "whatsapp-template.update");
  const canSubmit = useCan("whatsapp-template.submit");
  const canDelete = useCan("whatsapp-template.delete");

  const [t, setT] = useState<WhatsappTemplateInput>(() => (template ? { ...EMPTY, ...template } : EMPTY));
  const body = useRef<HTMLTextAreaElement>(null);
  const set = <K extends keyof WhatsappTemplateInput>(k: K, v: WhatsappTemplateInput[K]) => setT((p) => ({ ...p, [k]: v }));

  const status = template?.status ?? "draft";
  const editable = canWrite && EDITABLE.includes(status);
  const submitted = !!template?.metaId;
  const vars = templateVars(t.body);
  const headerHasVar = templateVars(t.headerText ?? "").length > 0;
  const count = (type: WhatsappButton["type"]) => t.buttons.filter((b) => b.type === type).length;

  function wrapBody(mark: string) {
    const el = body.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const picked = t.body.slice(s, e) || "text";
    set("body", t.body.slice(0, s) + mark + picked + mark + t.body.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + 1, s + 1 + picked.length);
    });
  }

  function addVariable() {
    const el = body.current;
    const at = el?.selectionStart ?? t.body.length;
    set("body", `${t.body.slice(0, at)}{{${nextVar(t.body)}}}${t.body.slice(at)}`);
  }

  function addButton(type: WhatsappButton["type"]) {
    const label = type === "url" ? "Visit website" : type === "phone" ? "Call us" : "Reply";
    set("buttons", [...t.buttons, { type, text: label, ...(type === "url" && { url: "https://" }), ...(type === "phone" && { phone: "+94" }) }]);
  }

  function payload(): WhatsappTemplateInput | null {
    if (!t.name) return toast.error("Give the template a name"), null;
    if (!t.body.trim()) return toast.error("Write the message body"), null;
    return { ...t, bodyExamples: vars.map((_, i) => t.bodyExamples[i] ?? "") };
  }

  function saveDraft(thenSubmit = false) {
    const body = payload();
    if (!body) return;
    save.mutate(body, {
      onSuccess: (saved) => {
        if (thenSubmit) {
          submitToMeta.mutate(saved.id, { onSuccess: () => id === null && router.replace(`/templates/whatsapp/${saved.id}`) });
        } else {
          toast.success("Draft saved");
          if (id === null) router.replace(`/templates/whatsapp/${saved.id}`);
        }
      },
    });
  }

  const busy = save.isPending || submitToMeta.isPending;
  const field = "mb-1 text-xs font-semibold";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="outline" size="sm" render={<Link href="/templates/whatsapp" />} nativeButton={false}><ArrowLeft /> WhatsApp templates</Button>
        <h1 className="text-base font-semibold">{id === null ? "New WhatsApp template" : t.name}</h1>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", WA_STATUS[status].className)}>{WA_STATUS[status].label}</span>
        <div className="ml-auto flex gap-2">
          {id !== null && canDelete && (
            <Button variant="ghost" size="sm" disabled={remove.isPending}
              onClick={() => window.confirm(`Delete "${t.name}"${submitted ? " here and in Meta" : ""}?`) &&
                remove.mutate(id, { onSuccess: () => router.replace("/templates/whatsapp") })}>
              <Trash2 className="text-destructive" /> Delete
            </Button>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={() => saveDraft(false)} disabled={busy}>
              {save.isPending && !submitToMeta.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save draft
            </Button>
          )}
          {editable && canSubmit && (
            <Button size="sm" onClick={() => saveDraft(true)} disabled={busy || !meta.data?.configured}
              title={meta.data?.configured ? undefined : "WhatsApp is not configured on the server"}>
              {submitToMeta.isPending ? <Loader2 className="animate-spin" /> : <Send />} {status === "rejected" ? "Resubmit to Meta" : "Submit to Meta"}
            </Button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {status === "rejected" && template?.rejectedReason && (
            <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Meta rejected this template: {template.rejectedReason}. Edit it and resubmit.
            </p>
          )}
          {!editable && id !== null && (
            <p className="rounded-xl border bg-card p-3 text-sm text-muted-foreground">
              {WA_STATUS[status].hint} {status !== "draft" && "Approved and in-review templates can't be edited — create a new one to change the wording."}
            </p>
          )}
          {meta.data && !meta.data.configured && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> You can save drafts, but submitting needs WHATSAPP_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in the backend .env.
            </p>
          )}

          <fieldset disabled={!editable} className="space-y-4">
            <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className={field}>Template name</Label>
                <Input value={t.name} onChange={(e) => set("name", toSlug(e.target.value))} placeholder="e.g. ticket_update" disabled={submitted}
                  className="font-mono" />
                <p className="mt-1 text-xs text-muted-foreground">Lowercase letters, numbers and _ only.{submitted && " Can't change after submitting."}</p>
              </div>
              <div>
                <Label className={field}>Category</Label>
                <OptionSelect label="Category" value={t.category} options={CATEGORY_OPTIONS} onChange={(v) => set("category", v)} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={field}>Language</Label>
                  <OptionSelect label="Language" value={t.language} options={LANGUAGE_OPTIONS} onChange={(v) => set("language", v)} className="w-full" />
                </div>
                <div>
                  <Label className={field}>Product</Label>
                  <OptionSelect label="Product" value={t.product ?? ""} options={PRODUCT_OPTIONS} onChange={(v) => set("product", v || null)} className="w-full" />
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Header <span className="font-normal text-muted-foreground">(optional)</span></h2>
                <div className="flex rounded-lg border p-0.5 text-xs" role="radiogroup" aria-label="Header type">
                  {(["none", "text"] as WhatsappHeaderType[]).map((h) => (
                    <button key={h} type="button" role="radio" aria-checked={t.headerType === h} onClick={() => set("headerType", h)}
                      className={cn("rounded-md px-2.5 py-1 capitalize", t.headerType === h ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              {t.headerType === "text" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Input value={t.headerText ?? ""} maxLength={LIMITS.header} onChange={(e) => set("headerText", e.target.value)} placeholder="e.g. Ticket {{1}} update" />
                    <p className="mt-1 text-xs text-muted-foreground">{(t.headerText ?? "").length}/{LIMITS.header} · one variable {"{{1}}"} allowed</p>
                  </div>
                  {headerHasVar && (
                    <Input value={t.headerExample ?? ""} onChange={(e) => set("headerExample", e.target.value)} placeholder="Sample for {{1}}" aria-label="Header sample" />
                  )}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Message</h2>
              <div className="overflow-hidden rounded-lg border">
                <div className="flex items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
                  {([["*", Bold, "Bold"], ["_", Italic, "Italic"], ["~", Strikethrough, "Strikethrough"]] as const).map(([mark, Icon, label]) => (
                    <button key={mark} type="button" title={label} aria-label={label} onClick={() => wrapBody(mark)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="ml-1 h-7 text-xs" onClick={addVariable}><Braces /> Add variable</Button>
                  <span className={cn("ml-auto pr-1 text-xs tabular-nums", t.body.length > LIMITS.body ? "text-destructive" : "text-muted-foreground")}>
                    {t.body.length}/{LIMITS.body}
                  </span>
                </div>
                <Textarea ref={body} value={t.body} onChange={(e) => set("body", e.target.value)} rows={7} aria-label="Message body"
                  placeholder={"Hi {{1}}, your ticket {{2}} has been updated. Reply to this message if you need more help."}
                  className="rounded-none border-0 shadow-none focus-visible:ring-0" />
              </div>
              {vars.length > 0 && (
                <div>
                  <p className={field}>Sample values <span className="font-normal text-muted-foreground">(Meta needs these to review the template)</span></p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {vars.map((n, i) => (
                      <label key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-10 shrink-0 font-mono text-muted-foreground">{`{{${n}}}`}</span>
                        <Input value={t.bodyExamples[i] ?? ""} placeholder={n === 1 ? "Kamal" : "TKT-1234"}
                          onChange={(e) => {
                            const next = [...t.bodyExamples];
                            next[i] = e.target.value;
                            set("bodyExamples", next);
                          }} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className={field}>Footer <span className="font-normal text-muted-foreground">(optional, no variables)</span></Label>
                <Input value={t.footer ?? ""} maxLength={LIMITS.footer} onChange={(e) => set("footer", e.target.value || null)} placeholder="e.g. Uparima Support" />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-sm font-semibold">Buttons <span className="font-normal text-muted-foreground">(optional)</span></h2>
                <Button type="button" variant="outline" size="sm" disabled={t.buttons.length >= LIMITS.buttons} onClick={() => addButton("quick_reply")}><Reply /> Quick reply</Button>
                <Button type="button" variant="outline" size="sm" disabled={t.buttons.length >= LIMITS.buttons || count("url") >= LIMITS.url} onClick={() => addButton("url")}><ExternalLink /> Website</Button>
                <Button type="button" variant="outline" size="sm" disabled={t.buttons.length >= LIMITS.buttons || count("phone") >= LIMITS.phone} onClick={() => addButton("phone")}><Phone /> Call</Button>
              </div>
              {t.buttons.length === 0 ? (
                <p className="text-xs text-muted-foreground">Quick replies let customers answer with one tap; website and call buttons open a link or dial a number.</p>
              ) : (
                <ul className="space-y-2">
                  {t.buttons.map((b, i) => {
                    const update = (patch: Partial<WhatsappButton>) => set("buttons", t.buttons.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <li key={i} className="grid items-center gap-2 rounded-lg border bg-muted/30 p-2 sm:grid-cols-[90px_1fr_1fr_auto]">
                        <span className="text-xs font-medium">{b.type === "url" ? "Website" : b.type === "phone" ? "Call" : "Quick reply"}</span>
                        <Input value={b.text} maxLength={LIMITS.button} onChange={(e) => update({ text: e.target.value })} aria-label="Button text" />
                        {b.type === "url" ? (
                          <Input value={b.url ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="https://uparima.lk" aria-label="Button link" />
                        ) : b.type === "phone" ? (
                          <Input value={b.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} placeholder="+94771234567" aria-label="Phone number" />
                        ) : <span />}
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove button" onClick={() => set("buttons", t.buttons.filter((_, j) => j !== i))}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </fieldset>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Preview with sample values</p>
          <WhatsappPreview t={t} />
        </div>
      </div>
    </div>
  );
}
