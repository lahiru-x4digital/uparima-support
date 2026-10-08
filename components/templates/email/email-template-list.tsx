"use client";

import Link from "next/link";
import { Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useDeleteEmailTemplate, useEmailTemplates } from "@/lib/hooks/use-email-templates";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import { productLabel } from "../meta-products";
import { TemplateTabs } from "../template-tabs";
import { ListPagination } from "../list-pagination";
import { ListSearch } from "../list-search";

export function EmailTemplateList() {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const { data, isLoading, isFetching, error, refetch } = useEmailTemplates({ q, page });
  const rows = data?.data ?? [];
  useClampPage(page, !!data && rows.length === 0, setPage);
  const remove = useDeleteEmailTemplate();
  const canCreate = useCan("email-template.create");
  const canUpdate = useCan("email-template.update");
  const canDelete = useCan("email-template.delete");

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <TemplateTabs />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Email templates</h1>
            <p className="text-sm text-muted-foreground">Designed emails with images, buttons and {"{{variables}}"}.</p>
          </div>
          {canCreate && <Link href="/templates/email/new" className={buttonVariants()}><Plus /> New email template</Link>}
        </div>

        <ListSearch value={search} onChange={setSearch} placeholder="Search by name or subject" />

        {isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
        ) : error ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            <Mail className="mx-auto mb-2 size-6" /> {q ? `No templates match "${q}".` : "No email templates yet."}
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.subject} · {t.design.blocks.length} block{t.design.blocks.length === 1 ? "" : "s"} · updated {new Date(t.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {t.product && <Badge variant="secondary">{productLabel(t.product)}</Badge>}
                {canUpdate && (
                  <Link href={`/templates/email/${t.id}`} aria-label={`Edit ${t.name}`} className={buttonVariants({ variant: "ghost", size: "icon" })}><Pencil /></Link>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} disabled={remove.isPending}
                    onClick={() => window.confirm(`Delete email template "${t.name}"?`) && remove.mutate(t.id)}>
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
