"use client";

import { useState } from "react";
import { Loader2, MailCheck, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { AuthAlert } from "@/components/auth/auth-alert";
import { activate, CodeForm, type ActiveChallenge } from "@/components/auth/code-form";
import { Modal } from "@/components/shared/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { describeAuthFailure } from "@/lib/auth-flow";
import { useTwoFactorStatus } from "@/lib/hooks/use-two-factor";
import * as authService from "@/lib/services/auth.service";
import type { TwoFactorStatus } from "@/types/auth";

/** Two-factor sign-in for the signed-in account: what it is, whether it's on, and switching it on. */
export function TwoFactorCard() {
  const status = useTwoFactorStatus();
  const [setupOpen, setSetupOpen] = useState(false);
  const data = status.data;

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {data?.enabled ? <ShieldCheck className="size-5" aria-hidden /> : <ShieldOff className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1 basis-64 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-base font-semibold">Two-factor sign-in</h2>
            {data && data.available && (
              <Badge variant={data.enabled ? "default" : "outline"}>{data.enabled ? "On" : "Off"}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            After your password, we email a 6-digit code and ask for it before you&apos;re let in. Someone who learns
            your password still can&apos;t sign in without your inbox.
          </p>
          <Details status={status.isPending ? "loading" : status.isError ? "error" : data!} onRetry={() => void status.refetch()} />
        </div>
        {data?.available && !data.enabled && (
          <Button size="lg" onClick={() => setSetupOpen(true)}>
            Turn on
          </Button>
        )}
      </div>

      {data?.available && !data.enabled && (
        <EnableDialog open={setupOpen} onClose={() => setSetupOpen(false)} emailHint={data.emailHint} />
      )}
    </section>
  );
}

function Details({ status, onRetry }: { status: "loading" | "error" | TwoFactorStatus; onRetry: () => void }) {
  if (status === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking your setting…
      </p>
    );
  }
  if (status === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        Couldn&apos;t load your setting.{" "}
        <button type="button" onClick={onRetry} className="font-medium underline underline-offset-4">
          Try again
        </button>
      </p>
    );
  }
  if (!status.available) {
    return (
      <p className="text-sm text-muted-foreground">
        It isn&apos;t available for this account
        {status.emailHint ? "." : " because it has no email address. Ask an administrator to add one."}
      </p>
    );
  }
  return status.enabled ? (
    <p className="text-sm text-muted-foreground">
      Codes go to <span className="font-medium text-foreground">{status.emailHint}</span>. To turn it off, ask an
      administrator — it&apos;s switched off in Staff Management.
    </p>
  ) : (
    <p className="text-sm text-muted-foreground">
      Codes will go to <span className="font-medium text-foreground">{status.emailHint}</span>.
    </p>
  );
}

/**
 * Two steps: say what will happen and send the code, then enter it. Entering it proves the inbox
 * works before sign-in starts depending on it.
 */
function EnableDialog({ open, onClose, emailHint }: { open: boolean; onClose: () => void; emailHint: string | null }) {
  const { endSession } = useAuth();
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setChallenge(null);
    setError(null);
    onClose();
  }

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      setChallenge(activate(await authService.startTwoFactorEnable()));
    } catch (err) {
      setError(describeAuthFailure(err).message);
    } finally {
      setSending(false);
    }
  }

  async function confirm(code: string) {
    if (!challenge) return;
    await authService.confirmTwoFactorEnable(challenge.challengeId, code);
    // The backend has just ended every session for this account, this one included.
    toast.success("Two-factor sign-in is on");
    endSession("two-factor-on");
  }

  return (
    <Modal open={open} onClose={close} title="Turn on two-factor sign-in" className="sm:max-w-md">
      {challenge ? (
        <div className="flex flex-col gap-4 p-0.5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <MailCheck className="size-5" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{challenge.emailHint}</span>.
              Enter it to switch two-factor sign-in on.
            </p>
          </div>
          <CodeForm
            challenge={challenge}
            submitLabel="Turn on"
            busyLabel="Turning on…"
            restartLabel="Start again"
            onVerify={confirm}
            onResend={async () =>
              setChallenge(activate(await authService.resendTwoFactorEnable(challenge.challengeId)))
            }
            onRestart={(message) => {
              setChallenge(null);
              setError(message ?? null);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-0.5">
          {error && <AuthAlert>{error}</AuthAlert>}
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              We&apos;ll email a 6-digit code to <span className="font-medium text-foreground">{emailHint}</span> —
              make sure you can open that inbox.
            </li>
            <li>Once it&apos;s on, you&apos;re signed out on every device and sign in again with a code.</li>
            <li>Only an administrator can turn it off again.</li>
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="lg" onClick={close} disabled={sending}>
              Cancel
            </Button>
            <Button size="lg" onClick={() => void sendCode()} disabled={sending}>
              {sending && <Loader2 className="animate-spin" aria-hidden />}
              {sending ? "Sending…" : "Email me a code"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
