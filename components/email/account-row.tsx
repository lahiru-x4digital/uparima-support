"use client";

import { useState } from "react";
import { AlertTriangle, Download, Loader2, Mail, Pause, Pencil, Play, RefreshCw, Save, Trash2 } from "lucide-react";
import { OptionSelect } from "@/components/inbox/option-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteEmailAccount, useImportEmails, useSyncEmailAccount, useUpdateEmailAccount } from "@/lib/hooks/use-email-accounts";
import type { EmailAccount, EmailCategory, EmailPriority } from "@/types/email-account";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, PROVIDER_META, STATUS_META, timeAgo } from "./meta";

/** One connected mailbox: status, last sync, quick actions and an inline editor. */
export function AccountRow({ account: a, canUpdate, canDelete }: { account: EmailAccount; canUpdate: boolean; canDelete: boolean }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateEmailAccount();
  const remove = useDeleteEmailAccount();
  const sync = useSyncEmailAccount();
  const importEmails = useImportEmails();
  const status = STATUS_META[a.status];
  const paused = a.status === "inactive";

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{a.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {a.email} · {PROVIDER_META[a.provider].label} · {a.authType === "oauth" ? "Signed in" : a.authType === "service_account" ? "Service account" : "App password"}
          </p>
          <p className="text-xs text-muted-foreground">
            Last synced {timeAgo(a.lastSyncedAt)} · {a.importedCount} imported · watching {a.folder}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
        {canUpdate && (
          <>
            <Button variant="outline" size="sm" disabled={sync.isPending || paused} onClick={() => sync.mutate(a.id)}>
              {sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync now
            </Button>
            <Button variant="outline" size="sm" disabled={importEmails.isPending || paused}
              title="Turn the last 30 days of mail already in this mailbox into tickets"
              onClick={() => importEmails.mutate({ ids: [a.id], days: 30 })}>
              {importEmails.isPending ? <Loader2 className="animate-spin" /> : <Download />} Import 30 days
            </Button>
            <Button variant="ghost" size="icon" aria-label={paused ? `Resume ${a.name}` : `Pause ${a.name}`} title={paused ? "Resume" : "Pause"}
              disabled={update.isPending} onClick={() => update.mutate({ id: a.id, body: { status: paused ? "active" : "inactive" } })}>
              {paused ? <Play /> : <Pause />}
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Edit ${a.name}`} onClick={() => setEditing((v) => !v)}><Pencil /></Button>
          </>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" aria-label={`Remove ${a.name}`} disabled={remove.isPending}
            onClick={() => window.confirm(`Remove ${a.email}? Existing tickets are kept; no new email will be imported.`) && remove.mutate(a.id)}>
            <Trash2 className="text-destructive" />
          </Button>
        )}
      </div>

      {a.lastError && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {a.lastError}
        </p>
      )}

      {editing && canUpdate && <EditForm account={a} onDone={() => setEditing(false)} />}
    </li>
  );
}

function EditForm({ account: a, onDone }: { account: EmailAccount; onDone: () => void }) {
  const update = useUpdateEmailAccount();
  const [name, setName] = useState(a.name);
  const [category, setCategory] = useState<EmailCategory>(a.defaultCategory);
  const [priority, setPriority] = useState<EmailPriority>(a.defaultPriority);
  const [folder, setFolder] = useState(a.folder);
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [host, setHost] = useState(a.imapHost);
  const [port, setPort] = useState(String(a.imapPort));
  const [smtpHost, setSmtpHost] = useState(a.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(String(a.smtpPort ?? 465));


  function save() {
    update.mutate(
      {
        id: a.id,
        body: {
          name: name.trim(),
          defaultCategory: category,
          defaultPriority: priority,
          folder: folder.trim() || "INBOX",
          ...(a.provider === "imap" && {
            imapHost: host.trim(),
            imapPort: Number(port) || 993,
            ...(smtpHost.trim() && { smtpHost: smtpHost.trim(), smtpPort: Number(smtpPort) || 465, smtpSecure: (Number(smtpPort) || 465) === 465 }),
          }),
          ...(password && { password }),
          ...(privateKey && { privateKey }),
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border bg-muted/40 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div><Label className="mb-1.5 text-xs font-semibold">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label className="mb-1.5 text-xs font-semibold">Product</Label><OptionSelect label="Product" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} className="w-full" /></div>
        <div><Label className="mb-1.5 text-xs font-semibold">Priority</Label><OptionSelect label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} className="w-full" /></div>
        <div><Label className="mb-1.5 text-xs font-semibold">Folder</Label><Input value={folder} onChange={(e) => setFolder(e.target.value)} /></div>
        {a.provider === "imap" && (
          <>
            <div><Label className="mb-1.5 text-xs font-semibold">IMAP host</Label><Input value={host} onChange={(e) => setHost(e.target.value)} /></div>
            <div><Label className="mb-1.5 text-xs font-semibold">Port</Label><Input inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} /></div>
            <div><Label className="mb-1.5 text-xs font-semibold">SMTP host</Label><Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" /></div>
            <div><Label className="mb-1.5 text-xs font-semibold">SMTP port</Label><Input inputMode="numeric" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ""))} /></div>
          </>
        )}
        {a.authType === "service_account" && (
          <div className="md:col-span-3">
            <Label className="mb-1.5 text-xs font-semibold">New private key (PEM)</Label>
            <Textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} rows={3} spellCheck={false}
              placeholder="Leave blank to keep the current key" className="font-mono text-xs" />
          </div>
        )}
        {a.authType === "password" && (
          <div>
            <Label className="mb-1.5 text-xs font-semibold">New password</Label>
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
        )}
      </div>
      {(folder !== a.folder || password || privateKey || (a.provider === "imap" && host !== a.imapHost)) && (
        <p className="text-xs text-muted-foreground">Changing the folder, host or password restarts syncing from now — older mail is not imported.</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={update.isPending || !name.trim()}>
          {update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
