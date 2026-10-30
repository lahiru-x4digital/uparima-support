"use client";

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MailCheck, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AuthAlert } from "@/components/auth/auth-alert";
import { activate, CodeForm, type ActiveChallenge } from "@/components/auth/code-form";
import { Modal } from "@/components/shared/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { describeAuthFailure } from "@/lib/auth-flow";
import { accountKeys } from "@/lib/hooks/query-keys";
import { useTwoFactorStatus } from "@/lib/hooks/use-two-factor";
import { cn } from "@/lib/utils";
import * as authService from "@/lib/services/auth.service";
import type { TwoFactorChoice, TwoFactorStatus } from "@/types/auth";

/** Two-factor sign-in for the signed-in account: what it is, whether it's on, switching it on, and how codes are sent. */
export function TwoFactorCard() {
  const status = useTwoFactorStatus();
  const [dialog, setDialog] = useState<"enable" | "channel" | null>(null);
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
            After your password, we send a 6-digit code — by text message or email, as you choose — and ask for it
            before you&apos;re let in. Someone who learns your password still can&apos;t sign in without your phone or
            inbox.
          </p>
          <Details status={status.isPending ? "loading" : status.isError ? "error" : data!} onRetry={() => void status.refetch()} />
        </div>
        {data?.available && !data.enabled && (
          <Button size="lg" onClick={() => setDialog("enable")}>
            Turn on
          </Button>
        )}
        {data?.available && data.enabled && (
          <Button variant="outline" onClick={() => setDialog("channel")}>
            Change how codes are sent
          </Button>
        )}
      </div>

      {data?.available && dialog && (
        <ChooseDialog mode={dialog} status={data} onClose={() => setDialog(null)} />
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
  if (!status.enabled) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Codes go{" "}
      {status.channel === "sms" && status.phoneHint ? (
        <>
          by SMS to <span className="font-medium text-foreground">{status.phoneHint}</span> (by email if a text
          can&apos;t be sent)
        </>
      ) : (
        <>
          by email to <span className="font-medium text-foreground">{status.emailHint}</span>
        </>
      )}
      . To turn it off, ask an administrator — it&apos;s switched off in Staff Management.
    </p>
  );
}

/**
 * Choose SMS or email, get a code that way, enter it. Entering it proves the code arrives before
 * sign-in starts depending on it. `enable` switches two-factor on; `channel` changes how codes are
 * sent while it's on.
 */
function ChooseDialog({
  mode,
  status,
  onClose,
}: {
  mode: "enable" | "channel";
  status: TwoFactorStatus;
  onClose: () => void;
}) {
  const { endSession } = useAuth();
  const queryClient = useQueryClient();
  const current = status.channel ?? "email";
  const [channel, setChannel] = useState<"sms" | "email">(
    mode === "channel" ? (current === "sms" ? "email" : "sms") : status.phoneHint ? "sms" : "email",
  );
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsNumber = channel === "sms" && !status.phoneHint;

  async function sendCode() {
    setSending(true);
    setError(null);
    const choice: TwoFactorChoice = needsNumber ? { channel, phone: phone.trim() } : { channel };
    try {
      setChallenge(
        activate(
          await (mode === "enable"
            ? authService.startTwoFactorEnable(choice)
            : authService.startTwoFactorChannel(choice)),
        ),
      );
    } catch (err) {
      setError(describeAuthFailure(err).message);
    } finally {
      setSending(false);
    }
  }

  async function confirm(code: string) {
    if (!challenge) return;
    if (mode === "enable") {
      await authService.confirmTwoFactorEnable(challenge.challengeId, code);
      // The backend has just ended every session for this account, this one included.
      toast.success("Two-factor sign-in is on");
      endSession("two-factor-on");
      return;
    }
    const next = await authService.confirmTwoFactorChannel(challenge.challengeId, code);
    queryClient.setQueryData(accountKeys.twoFactor, next);
    toast.success(next.channel === "sms" ? "Sign-in codes will now come by SMS" : "Sign-in codes will now be emailed");
    onClose();
  }

  const option = (value: "sms" | "email", title: string, detail: ReactNode, icon: ReactNode) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
        channel === value ? "border-primary bg-accent" : "border-border",
      )}
    >
      <input
        type="radio"
        name="two-factor-channel"
        className="mt-1"
        checked={channel === value}
        onChange={() => setChannel(value)}
      />
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="text-sm">
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "enable" ? "Turn on two-factor sign-in" : "How sign-in codes are sent"}
      className="sm:max-w-md"
    >
      {challenge ? (
        <div className="flex flex-col gap-4 p-0.5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              {challenge.channel === "sms" ? (
                <Smartphone className="size-5" aria-hidden />
              ) : (
                <MailCheck className="size-5" aria-hidden />
              )}
            </span>
            <p className="text-sm text-muted-foreground">
              We {challenge.channel === "sms" ? "texted" : "emailed"} a 6-digit code to{" "}
              <span className="font-medium text-foreground">{challenge.emailHint}</span>. Enter it to{" "}
              {mode === "enable" ? "switch two-factor sign-in on" : "get your codes this way"}.
            </p>
          </div>
          <CodeForm
            challenge={challenge}
            submitLabel={mode === "enable" ? "Turn on" : "Save"}
            busyLabel={mode === "enable" ? "Turning on…" : "Saving…"}
            restartLabel="Start again"
            onVerify={confirm}
            onResend={async () =>
              setChallenge(
                activate(
                  await (mode === "enable"
                    ? authService.resendTwoFactorEnable(challenge.challengeId)
                    : authService.resendTwoFactorChannel(challenge.challengeId)),
                ),
              )
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
          <p className="text-sm text-muted-foreground">How should we send your sign-in codes?</p>
          <div className="flex flex-col gap-2">
            {option(
              "sms",
              "SMS",
              status.phoneHint ? <>Text message to {status.phoneHint}</> : <>Your account has no mobile number — enter one below.</>,
              <Smartphone className="size-4" aria-hidden />,
            )}
            {option("email", "Email", <>Email to {status.emailHint}</>, <MailCheck className="size-4" aria-hidden />)}
          </div>
          {needsNumber && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="two-factor-phone">Mobile number</Label>
              <Input
                id="two-factor-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}
          {mode === "enable" && (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>We&apos;ll send a code now — make sure you can get it.</li>
              <li>Once it&apos;s on, you&apos;re signed out on every device and sign in again with a code.</li>
              <li>Only an administrator can turn it off again.</li>
            </ul>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="lg" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => void sendCode()}
              disabled={sending || (needsNumber && !phone.trim()) || (mode === "channel" && channel === current)}
            >
              {sending && <Loader2 className="animate-spin" aria-hidden />}
              {sending ? "Sending…" : "Send me a code"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
