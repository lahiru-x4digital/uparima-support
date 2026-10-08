"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useCareTemplates, useDeleteCareTemplate } from "@/lib/hooks/use-care-templates";
import { useCan } from "@/lib/hooks/use-desk";
import { cn } from "@/lib/utils";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import { requestTypeLabel } from "./meta";
import { TemplateTabs } from "./template-tabs";
import { CareTemplateView } from "./care-template-view";
import { ListPagination } from "./list-pagination";
import { ListSearch } from "./list-search";

export function TemplateList() {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const { data, isLoading, isFetching, error, refetch } = useCareTemplates({ q, page });
  const rows = data?.data ?? [];
  useClampPage(page, !!data && rows.length === 0, setPage);
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
        <TemplateTabs />
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Care templates</h1>
          {canCreate && (
            <Link href="/templates/new" className={buttonVariants()}><Plus /> New Template</Link>
          )}
        </div>

        <ListSearch value={search} onChange={setSearch} placeholder="Search care templates" />

        {isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
        ) : error ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">{q ? `No templates match "${q}".` : "No templates yet."}</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {requestTypeLabel(t.requestType)} · {t.fields.length} custom field{t.fields.length === 1 ? "" : "s"}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                <Badge variant={t.status === "active" ? "default" : "secondary"} className={cn("capitalize")}>{t.status}</Badge>
                <CareTemplateView t={t} />
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
        <ListPagination meta={data?.meta} fetching={isFetching && !isLoading} onPage={setPage} />
      </div>
    </div>
  );
}
