"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Loader2, Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useEmailAccounts, useEmailProviders } from "@/lib/hooks/use-email-accounts";
import { useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/lib/hooks/use-desk";
import { emailAccountKeys } from "@/lib/hooks/query-keys";
import type { EmailProvider } from "@/types/email-account";
import { AccountRow } from "./account-row";
import { ConnectPanel } from "./connect-panel";
import { PROVIDER_META } from "./meta";

const PROVIDERS: EmailProvider[] = ["gmail", "outlook", "imap"];

/** Email → Email Config: connect inbound mailboxes (Gmail, Outlook, any IMAP) and manage them. */
export function EmailConfig() {
  const { data, isLoading, error, refetch } = useEmailAccounts();
  const providers = useEmailProviders();
  const canCreate = useCan("email-account.create");
  const canUpdate = useCan("email-account.update");
  const canDelete = useCan("email-account.delete");
  const qc = useQueryClient();
  const [provider, setProvider] = useState<EmailProvider | null>(null);

  // Landing back from the Google / Microsoft consent screen: ?connected=<email> or ?error=<reason>.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const failed = q.get("error");
    if (!connected && !failed) return;
    if (connected) {
      toast.success(`${connected} connected`);
      void qc.invalidateQueries({ queryKey: emailAccountKeys.all });
    } else toast.error(`Sign-in failed: ${failed}`);
    window.history.replaceState(null, "", window.location.pathname);
  }, [qc]);

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">Email Config</h1>
            <Link href="/email/inbox" className={buttonVariants({ variant: "outline", size: "sm" })}><Inbox /> Open Inbox</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect the mailboxes customers write to. Every new email becomes a ticket in the inbox.
          </p>
        </div>

        {canCreate && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Connect a mailbox</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {PROVIDERS.map((p) => (
                <button key={p} type="button" onClick={() => setProvider(p)} aria-pressed={provider === p}
                  className={`flex items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50 ${provider === p ? "border-primary ring-1 ring-primary/40" : ""}`}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plus className="size-4" /></span>
                  <span>
                    <span className="block text-sm font-semibold">{PROVIDER_META[p].label}</span>
                    <span className="block text-xs text-muted-foreground">{PROVIDER_META[p].blurb}</span>
                  </span>
                </button>
              ))}
            </div>
            {provider && (
              <div className="mt-4">
                {/* Remount per provider so a half-filled form never leaks between providers. */}
                <ConnectPanel key={provider} provider={provider} availability={providers.data} onClose={() => setProvider(null)} />
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold">Connected mailboxes</h2>
          {isLoading ? (
            <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
          ) : error ? (
            <div className="rounded-xl border bg-card p-6 text-center text-sm">
              <p className="text-destructive">{getErrorMessage(error)}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button>
            </div>
          ) : !data?.length ? (
            <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              <Mail className="mx-auto mb-2 size-6" /> No mailbox connected yet.
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
              {data.map((a) => <AccountRow key={a.id} account={a} canUpdate={canUpdate} canDelete={canDelete} />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
