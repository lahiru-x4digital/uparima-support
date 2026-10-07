"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useCareTemplates, useDeleteCareTemplate } from "@/lib/hooks/use-care-templates";
import { useCan } from "@/lib/hooks/use-desk";
import { cn } from "@/lib/utils";
import { requestTypeLabel } from "./meta";

export function TemplateList() {
  const { data, isLoading, error, refetch } = useCareTemplates();
  const remove = useDeleteCareTemplate();
  const canCreate = useCan("care-template.create");
  const canUpdate = useCan("care-template.update");
  const canDelete = useCan("care-template.delete");

  function confirmDelete(id: number, name: string) {
    if (window.confirm(`Delete template "${name}"?`)) remove.mutate(id);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Care Templates</h1>
          {canCreate && (
            <Link href="/templates/new" className={buttonVariants()}><Plus /> New Template</Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
        ) : error ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button>
          </div>
        ) : !data?.length ? (
          <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">No templates yet.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {data.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {requestTypeLabel(t.requestType)} · {t.fields.length} custom field{t.fields.length === 1 ? "" : "s"}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                <Badge variant={t.status === "active" ? "default" : "secondary"} className={cn("capitalize")}>{t.status}</Badge>
                {canUpdate && (
                  <Link href={`/templates/${t.id}`} aria-label={`Edit ${t.name}`} className={buttonVariants({ variant: "ghost", size: "icon" })}>
                    <Pencil />
                  </Link>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} disabled={remove.isPending}
                    onClick={() => confirmDelete(t.id, t.name)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
