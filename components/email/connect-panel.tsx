"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, LogIn, Plug, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { OptionSelect } from "@/components/inbox/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateEmailAccount,
  useCreateServiceAccountEmail,
  useStartEmailOauth,
  useTestEmailConnection,
} from "@/lib/hooks/use-email-accounts";
import { getErrorMessage } from "@/lib/api";
import type { EmailCategory, EmailPriority, EmailProvider, EmailProviderAvailability, EmailTestResult } from "@/types/email-account";
import { APP_PASSWORD_HINT, CATEGORY_OPTIONS, PRIORITY_OPTIONS, PROVIDER_META } from "./meta";

const schema = z.object({
  name: z.string().trim().min(1, "Give this mailbox a name"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  imapHost: z.string().optional(),
  defaultCategory: z.string().min(1, "Choose a ticket category"),
});

/** Step 2 of the flow: details for the chosen provider, then OAuth sign-in or password + test + connect. */
export function ConnectPanel({
  provider,
  availability,
  onClose,
}: {
  provider: EmailProvider;
  availability: EmailProviderAvailability | undefined;
  onClose: () => void;
}) {
  const create = useCreateEmailAccount();
  const createSa = useCreateServiceAccountEmail();
  const oauth = useStartEmailOauth();
  const test = useTestEmailConnection();

  const oauthAvailable = provider !== "imap" && !!availability?.[provider].oauth;
  // Gmail can also use a Google Workspace service account (no per-user sign-in needed).
  const [service, setService] = useState(false);
  const [manual, setManual] = useState(!oauthAvailable);
  const [saEmail, setSaEmail] = useState("");
  const [pem, setPem] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("993");
  const [ssl, setSsl] = useState(true);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [folder, setFolder] = useState("INBOX");
  const [category, setCategory] = useState<EmailCategory>("riders");
  const [priority, setPriority] = useState<EmailPriority>("normal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EmailTestResult | null>(null);

  const effectiveCategory = category;
  const showManual = (manual || !oauthAvailable) && !service;

  function validateShared(): boolean {
    if (!name.trim()) return fail("name", "Give this mailbox a name");
    if (!effectiveCategory) return fail("defaultCategory", "Choose a ticket category");
    return true;
  }
  function fail(field: string, message: string): false {
    setErrors({ [field]: message });
    toast.error(message);
    return false;
  }

  function signIn() {
    setErrors({});
    if (provider === "imap" || !validateShared()) return;
    oauth.mutate({ provider, name: name.trim(), defaultCategory: effectiveCategory, defaultPriority: priority });
  }

  function runServiceTest() {
    if (!email.trim() || !saEmail.trim() || !pem.trim()) return void toast.error("Enter the mailbox, service account email and private key first");
    setResult(null);
    test.mutate(
      { provider: "gmail", username: email.trim(), serviceAccountEmail: saEmail.trim(), privateKey: pem, folder: folder.trim() || "INBOX" },
      { onSuccess: setResult, onError: (e) => setResult({ ok: false, message: getErrorMessage(e) }) },
    );
  }

  function submitService() {
    if (!validateShared()) return;
    if (!email.trim() || !saEmail.trim() || !pem.trim()) return void toast.error("Mailbox, service account email and private key are all required");
    setErrors({});
    createSa.mutate(
      { name: name.trim(), email: email.trim(), serviceAccountEmail: saEmail.trim(), privateKey: pem, folder: folder.trim() || "INBOX", defaultCategory: effectiveCategory, defaultPriority: priority },
      { onSuccess: onClose },
    );
  }

  const connection = () => ({
    provider,
    imapHost: provider === "imap" ? host.trim() : undefined,
    imapPort: provider === "imap" ? Number(port) || 993 : undefined,
    imapSecure: provider === "imap" ? ssl : undefined,
    smtpHost: provider === "imap" ? smtpHost.trim() || undefined : undefined,
    smtpPort: provider === "imap" && smtpHost.trim() ? Number(smtpPort) || 465 : undefined,
    smtpSecure: provider === "imap" && smtpHost.trim() ? (Number(smtpPort) || 465) === 465 : undefined,
    username: email.trim(),
    password,
    folder: folder.trim() || "INBOX",
  });

  function runTest() {
    if (!email.trim() || !password) return void toast.error("Enter the email address and password first");
    if (provider === "imap" && !host.trim()) return void toast.error("Enter the IMAP host");
    setResult(null);
    test.mutate(connection(), {
      onSuccess: setResult,
      onError: (e) => setResult({ ok: false, message: getErrorMessage(e) }),
    });
  }

  function submit() {
    const parsed = schema.safeParse({ name, email, password, imapHost: host, defaultCategory: effectiveCategory });
    if (!parsed.success || (provider === "imap" && !host.trim())) {
      const issue = parsed.success ? { path: ["imapHost"], message: "IMAP host is required" } : parsed.error.issues[0];
      return fail(String(issue.path[0]), issue.message) && undefined;
    }
    setErrors({});
    create.mutate(
      { ...connection(), name: name.trim(), email: email.trim(), defaultCategory: effectiveCategory, defaultPriority: priority },
      { onSuccess: onClose },
    );
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between bg-linear-to-r from-sidebar to-sidebar-end px-5 py-3.5 text-sidebar-foreground">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Plug className="size-4" /> Connect {PROVIDER_META[provider].label}</h2>
        <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground" onClick={onClose}>Cancel</Button>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-1.5 text-xs font-semibold">Mailbox name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support inbox" aria-invalid={!!errors.name} />
            {err("name")}
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold">Product</Label>
            <OptionSelect label="Product" value={effectiveCategory} options={CATEGORY_OPTIONS} onChange={setCategory} className="w-full" />
            {err("defaultCategory") || <p className="mt-1 text-xs text-muted-foreground">Tickets from this mailbox are filed under it.</p>}
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold">Priority</Label>
            <OptionSelect label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} className="w-full" />
          </div>
        </div>

        {oauthAvailable && (
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Recommended — you sign in on {provider === "gmail" ? "Google" : "Microsoft"}; no password is shared with us.
            </p>
            <Button onClick={signIn} disabled={oauth.isPending}>
              {oauth.isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
              Sign in with {provider === "gmail" ? "Google" : "Microsoft"}
            </Button>
            {provider === "gmail" && (
              <button type="button" onClick={() => { setService(true); setResult(null); }} className="ml-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Use a Google Workspace service account
              </button>
            )}
            {!manual && (
              <button type="button" onClick={() => setManual(true)} className="ml-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Use an app password instead
              </button>
            )}
          </div>
        )}

        {provider === "gmail" && !service && !oauthAvailable && (
          <button type="button" onClick={() => { setService(true); setResult(null); }} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Use a Google Workspace service account instead
          </button>
        )}

        {service && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-primary" /> Service account (Google Workspace)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-xs font-semibold">Mailbox email (impersonate)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@yourcompany.com" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold">Service account email</Label>
                <Input type="email" value={saEmail} onChange={(e) => setSaEmail(e.target.value)} placeholder="name@project.iam.gserviceaccount.com" />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold">Private key (PEM)</Label>
              <Textarea value={pem} onChange={(e) => setPem(e.target.value)} rows={5} spellCheck={false} autoComplete="off"
                placeholder={"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----"} className="font-mono text-xs" />
              <p className="mt-1 text-xs text-muted-foreground">
                Paste the <code>private_key</code> from the service account&apos;s JSON key. It is stored encrypted and never shown again.
                The service account needs domain-wide delegation with scope <code>https://mail.google.com/</code> (Workspace admin → Security → API controls).
              </p>
            </div>
            <div className="max-w-xs">
              <Label className="mb-1.5 text-xs font-semibold">Folder to watch</Label>
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
            </div>
            {result && (
              <p className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${result.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                {result.message}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runServiceTest} disabled={test.isPending}>
                {test.isPending && <Loader2 className="animate-spin" />} Test connection
              </Button>
              <Button onClick={submitService} disabled={createSa.isPending}>
                {createSa.isPending && <Loader2 className="animate-spin" />} Connect mailbox
              </Button>
              <Button variant="ghost" onClick={() => { setService(false); setResult(null); }}>Back</Button>
            </div>
          </div>
        )}

        {showManual && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-primary" /> {oauthAvailable ? "App password" : "Mailbox login"}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-xs font-semibold">Email address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@yourcompany.com" aria-invalid={!!errors.email} />
                {err("email")}
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold">Password</Label>
                <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
                {err("password") || <p className="mt-1 text-xs text-muted-foreground">{APP_PASSWORD_HINT[provider]}</p>}
              </div>
            </div>
            {provider === "imap" && (
              <div className="grid gap-4 md:grid-cols-[1fr_120px_auto]">
                <div>
                  <Label className="mb-1.5 text-xs font-semibold">IMAP host</Label>
                  <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="imap.example.com" aria-invalid={!!errors.imapHost} />
                  {err("imapHost")}
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-semibold">Port</Label>
                  <Input inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} className="size-4 accent-primary" /> SSL / TLS
                </label>
              </div>
            )}
            {provider === "imap" && (
              <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                <div>
                  <Label className="mb-1.5 text-xs font-semibold">SMTP host (for sending)</Label>
                  <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
                  <p className="mt-1 text-xs text-muted-foreground">Needed to send and reply. Leave blank to guess it from the IMAP host.</p>
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-semibold">SMTP port</Label>
                  <Input inputMode="numeric" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
            )}
            <div className="max-w-xs">
              <Label className="mb-1.5 text-xs font-semibold">Folder to watch</Label>
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
            </div>

            {result && (
              <p className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${result.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                {result.message}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runTest} disabled={test.isPending}>
                {test.isPending && <Loader2 className="animate-spin" />} Test connection
              </Button>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />} Connect mailbox
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Once connected, open <strong>Email → Inbox</strong> to read, reply and send. New emails that arrive <strong>after</strong> you connect also become tickets; replies that mention the ticket number (TKT-…) are added to that ticket.
        </p>
      </div>
    </div>
  );
}
