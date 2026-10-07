"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlignLeft, ArrowLeft, FileText, Flag, ListChecks, Loader2, Plus, Save, Tag, ToggleLeft, Trash2, Type, Workflow } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionSelect } from "@/components/inbox/option-select";
import { useCan } from "@/lib/hooks/use-desk";
import { useCareTemplate, useSaveCareTemplate } from "@/lib/hooks/use-care-templates";
import { getErrorMessage } from "@/lib/api";
import type { CareFieldRow, CareFieldType, CareTemplate, CareTemplateForm } from "@/types/care-template";
import { PRIORITIES, REQUEST_TYPES } from "./meta";

const REQUEST_TYPE_OPTIONS = [{ value: "", label: "— Select Request Type —" }, ...REQUEST_TYPES];
const PRIORITY_OPTIONS = [{ value: "", label: "— None —" }, ...PRIORITIES];
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;
const FIELD_TYPES: { value: CareFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "file", label: "File" },
];
const REQUIRED = [
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Template name is required"),
  requestType: z.string().min(1, "Select a request type"),
  fields: z.array(z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/, "Field keys use lowercase letters, numbers and _"), label: z.string().trim().min(1, "Every field needs a label") })),
});

const EMPTY: CareTemplateForm = {
  name: "", requestType: "", description: "", priority: "", status: "active", ticketTitle: "", ticketDescription: "", fields: [],
};

let rowSeq = 0;
const newField = (): CareFieldRow => ({ id: `f${++rowSeq}`, key: "", label: "", type: "text", required: false });

function FieldLabel({ icon: Icon, children, required }: { icon: typeof Tag; children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="mb-1.5 gap-1.5 text-xs font-semibold">
      <Icon className="size-3.5 text-primary" />
      {children}
      {required && <span className="text-destructive">*</span>}
    </Label>
  );
}

const toForm = (t: CareTemplate): CareTemplateForm => ({
  name: t.name,
  requestType: t.requestType,
  description: t.description ?? "",
  priority: t.priority ?? "",
  status: t.status,
  ticketTitle: t.ticketTitle ?? "",
  ticketDescription: t.ticketDescription ?? "",
  fields: t.fields.map((f) => ({ ...f, id: `f${++rowSeq}` })),
});

/** New / edit care template page. Pass `templateId` to edit. */
export function TemplateFormPage({ templateId }: { templateId?: number }) {
  const id = templateId ?? null;
  const { data, isLoading, error } = useCareTemplate(id);
  const canWrite = useCan(id === null ? "care-template.create" : "care-template.update");

  if (id !== null && isLoading) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (id !== null && !data) {
    return <p className="p-6 text-sm text-destructive">{error ? getErrorMessage(error) : "Template not found."}</p>;
  }
  // `key` remounts the form when a different template loads, so its state starts from that template.
  return <TemplateForm key={data?.id ?? "new"} id={id} template={data ?? null} canWrite={canWrite} />;
}

function TemplateForm({ id, template, canWrite }: { id: number | null; template: CareTemplate | null; canWrite: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<CareTemplateForm>(() => (template ? toForm(template) : EMPTY));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveCareTemplate(id);

  const set = <K extends keyof CareTemplateForm>(key: K, value: CareTemplateForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setField = (id: string, patch: Partial<CareFieldRow>) =>
    set("fields", form.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  function submit() {
    const result = schema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      toast.error(result.error.issues[0].message);
      return;
    }
    setErrors({});
    save.mutate(
      {
        name: form.name.trim(),
        requestType: form.requestType,
        description: form.description.trim() || null,
        priority: form.priority || null,
        status: form.status,
        ticketTitle: form.ticketTitle.trim() || null,
        ticketDescription: form.ticketDescription.trim() || null,
        fields: form.fields.map(({ key, label, type, required }) => ({ key: key.trim(), label: label.trim(), type, required })),
      },
      { onSuccess: () => router.push("/templates") },
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <Button variant="outline" size="sm" className="mb-4" render={<Link href="/templates" />} nativeButton={false}>
        <ArrowLeft /> Back to Care Templates
      </Button>

      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 bg-linear-to-r from-sidebar to-sidebar-end px-5 py-4 text-sidebar-foreground">
          {id === null ? <Plus className="size-5" /> : <Tag className="size-5" />}
          <h1 className="text-base font-semibold">{id === null ? "New Care Template" : "Edit Care Template"}</h1>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel icon={Tag} required>Template Name</FieldLabel>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Customer Complaint - Quality"
                aria-invalid={!!errors.name} />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <FieldLabel icon={Workflow} required>Request Type</FieldLabel>
              <OptionSelect label="Request type" value={form.requestType} options={REQUEST_TYPE_OPTIONS} onChange={(v) => set("requestType", v)} className="w-full" />
              {errors.requestType
                ? <p className="mt-1 text-xs text-destructive">{errors.requestType}</p>
                : <p className="mt-1 text-xs text-muted-foreground">Only one ACTIVE template can exist per request type.</p>}
            </div>
          </div>

          <div>
            <FieldLabel icon={AlignLeft}>Description</FieldLabel>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
              placeholder="Short description to help agents choose this template" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel icon={Flag}>Default Priority</FieldLabel>
              <OptionSelect label="Default priority" value={form.priority} options={PRIORITY_OPTIONS} onChange={(v) => set("priority", v)} className="w-full" />
            </div>
            <div>
              <FieldLabel icon={ToggleLeft}>Status</FieldLabel>
              <OptionSelect label="Status" value={form.status} options={[...STATUSES]} onChange={(v) => set("status", v)} className="w-full" />
            </div>
          </div>

          <div>
            <FieldLabel icon={Type}>Default Ticket Title (template)</FieldLabel>
            <Input value={form.ticketTitle} onChange={(e) => set("ticketTitle", e.target.value)} placeholder="e.g. Complaint - {{customer_name}}" />
          </div>

          <div>
            <FieldLabel icon={FileText}>Default Description (template)</FieldLabel>
            <Textarea value={form.ticketDescription} onChange={(e) => set("ticketDescription", e.target.value)} rows={4}
              placeholder="Default ticket description used when this template is picked." />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4 text-primary" /> Custom Fields</h2>
              <Button size="sm" onClick={() => set("fields", [...form.fields, newField()])}><Plus /> Add Field</Button>
            </div>
            {form.fields.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">No custom fields yet.</p>
            ) : (
              <ul className="space-y-2">
                {form.fields.map((f) => (
                  <li key={f.id} className="grid gap-2 rounded-xl border bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_130px_130px_auto]">
                    <Input value={f.key} onChange={(e) => setField(f.id, { key: e.target.value })} placeholder="key (e.g. order_id)" aria-label="Field key" />
                    <Input value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} placeholder="Label (e.g. Order ID)" aria-label="Field label" />
                    <OptionSelect label="Field type" value={f.type} options={FIELD_TYPES} onChange={(v) => setField(f.id, { type: v })} className="w-full" />
                    <OptionSelect label="Required" value={f.required ? "required" : "optional"} options={REQUIRED}
                      onChange={(v) => setField(f.id, { required: v === "required" })} className="w-full" />
                    <Button variant="destructive" size="icon" aria-label="Remove field" onClick={() => set("fields", form.fields.filter((x) => x.id !== f.id))}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {errors.fields && <p className="mt-1 text-xs text-destructive">{errors.fields}</p>}
            <p className="mt-2 text-xs text-muted-foreground">These fields appear inside the Care wizard &quot;Details&quot; step. File uploads use S3 (same as global tickets).</p>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3">
          <Button variant="secondary" onClick={() => router.push("/templates")} disabled={save.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={!canWrite || save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}
