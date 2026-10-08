"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, MessageCircle, Pencil, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useSyncWhatsappTemplates, useWhatsappMetaStatus, useWhatsappTemplates } from "@/lib/hooks/use-whatsapp-templates";
import { cn } from "@/lib/utils";
import { useClampPage, usePagedListState } from "@/lib/hooks/use-paged-list";
import { productLabel } from "../meta-products";
import { TemplateTabs } from "../template-tabs";
import { WA_STATUS } from "./meta";
import { ListPagination } from "../list-pagination";
import { ListSearch } from "../list-search";

export function WhatsappTemplateList() {
  const { search, setSearch, q, page, setPage } = usePagedListState();
  const { data, isLoading, isFetching, error, refetch } = useWhatsappTemplates({ q, page });
  const rows = data?.data ?? [];
  useClampPage(page, !!data && rows.length === 0, setPage);
  const meta = useWhatsappMetaStatus();
  const sync = useSyncWhatsappTemplates();
  const canCreate = useCan("whatsapp-template.create");
  const canView = useCan("whatsapp-template.view");

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <TemplateTabs />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex-1">
            <h1 className="text-xl font-bold">WhatsApp templates</h1>
            <p className="text-sm text-muted-foreground">Message templates approved by Meta, for messaging customers outside the 24-hour reply window.</p>
          </div>
          {canView && meta.data?.configured && (
            <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh status from Meta
            </Button>
          )}
          {canCreate && <Link href="/templates/whatsapp/new" className={buttonVariants()}><Plus /> New WhatsApp template</Link>}
        </div>

        {meta.data && !meta.data.configured && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Drafts can be saved, but submitting to Meta needs WHATSAPP_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in the backend .env.
          </p>
        )}

        <ListSearch value={search} onChange={setSearch} placeholder="Search by name or message" />

        {isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
        ) : error ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm">
            <p className="text-destructive">{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            <MessageCircle className="mx-auto mb-2 size-6" /> {q ? `No templates match "${q}".` : "No WhatsApp templates yet."}
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <MessageCircle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-semibold">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.language} · {t.category === "UTILITY" ? "Utility" : "Marketing"} · {t.body}
                  </p>
                  {t.status === "rejected" && t.rejectedReason && <p className="truncate text-xs text-destructive">Rejected: {t.rejectedReason}</p>}
                </div>
                {t.product && <Badge variant="secondary">{productLabel(t.product)}</Badge>}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", WA_STATUS[t.status].className)} title={WA_STATUS[t.status].hint}>
                  {WA_STATUS[t.status].label}
                </span>
                <Link href={`/templates/whatsapp/${t.id}`} aria-label={`Open ${t.name}`} className={buttonVariants({ variant: "ghost", size: "icon" })}><Pencil /></Link>
              </li>
            ))}
          </ul>
        )}
        <ListPagination meta={data?.meta} fetching={isFetching && !isLoading} onPage={setPage} />
      </div>
    </div>
  );
}
