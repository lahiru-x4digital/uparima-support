"use client";

import { useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { CodeInput } from "@/components/auth/code-input";
import { Button } from "@/components/ui/button";
import { CODE_LENGTH, describeAuthFailure, formatCountdown } from "@/lib/auth-flow";
import { useNow } from "@/lib/hooks/use-now";
import type { TwoFactorChallenge } from "@/types/auth";

/** A challenge plus when this browser received it — its countdowns are measured from there. */
export interface ActiveChallenge extends TwoFactorChallenge {
  receivedAt: number;
}

export const activate = (challenge: TwoFactorChallenge): ActiveChallenge => ({
  ...challenge,
  receivedAt: Date.now(),
});

/**
 * Enter-the-emailed-code step, shared by sign-in and by switching two-factor on. It owns the
 * typing, the wrong-code and expiry messages and the resend countdown; the caller says what a
 * correct code does (`onVerify`) and what "start over" means (`onRestart`).
 */
export function CodeForm({
  challenge,
  submitLabel,
  busyLabel,
  restartLabel,
  onVerify,
  onResend,
  onRestart,
}: {
  challenge: ActiveChallenge;
  submitLabel: string;
  busyLabel: string;
  restartLabel: string;
  /** Rejects with the backend's error for a wrong or expired code. */
  onVerify: (code: string) => Promise<void>;
  /** Asks for a new code; the caller swaps in the refreshed challenge. */
  onResend: () => Promise<void>;
  /** The code can no longer be used. `message` says why, when there is something to say. */
  onRestart: (message?: string) => void;
}) {
  const now = useNow();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A complete code is sent as soon as it's typed — but the same one never twice.
  const lastTried = useRef<string | null>(null);
  const messageId = useId();

  const secondsUntil = (after: number) => Math.ceil((challenge.receivedAt + after * 1000 - now) / 1000);
  const resendIn = secondsUntil(challenge.resendAfterSeconds);
  const expiresIn = secondsUntil(challenge.expiresInSeconds);
  const expired = expiresIn <= 0;

  async function verify(value: string) {
    if (busy || expired) return;
    if (value.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      inputRef.current?.focus();
      return;
    }
    lastTried.current = value;
    setBusy("verify");
    setError(null);
    setInfo(null);
    try {
      await onVerify(value);
      // Left busy on purpose: the caller is navigating away, and a re-enabled button would flicker.
    } catch (err) {
      const failure = describeAuthFailure(err);
      if (failure.action === "restart") {
        onRestart(failure.message);
        return;
      }
      setError(failure.message);
      setCode("");
      setBusy(null);
      inputRef.current?.focus();
    }
  }

  function change(next: string) {
    if (busy) return;
    setCode(next);
    if (error) setError(null);
    if (next.length === CODE_LENGTH && next !== lastTried.current) void verify(next);
  }

  async function resend() {
    if (busy || resendIn > 0) return;
    setBusy("resend");
    setError(null);
    setInfo(null);
    try {
      await onResend();
      setCode("");
      lastTried.current = null;
      setInfo("A new code is on its way. The earlier one no longer works.");
    } catch (err) {
      const failure = describeAuthFailure(err);
      if (failure.action === "restart") {
        onRestart(failure.message);
        return;
      }
      setError(failure.message);
    } finally {
      setBusy(null);
      inputRef.current?.focus();
    }
  }

  if (expired) {
    return (
      <div className="flex flex-col gap-4">
        <AuthAlert>That code has expired.</AuthAlert>
        <Button type="button" size="lg" className="h-11 w-full text-base" onClick={() => onRestart()}>
          {restartLabel}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
    >
      {error ? <AuthAlert>{error}</AuthAlert> : info ? <AuthAlert tone="info">{info}</AuthAlert> : null}

      <div className="flex flex-col gap-2">
        <CodeInput
          ref={inputRef}
          value={code}
          onChange={change}
          invalid={!!error}
          readOnly={busy !== null}
          describedBy={messageId}
          autoFocus
        />
        <p id={messageId} className="text-xs text-muted-foreground">
          The code expires in <span className="tabular-nums">{formatCountdown(expiresIn)}</span>. Check your spam
          folder if it hasn&apos;t arrived.
        </p>
      </div>

      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={busy !== null}>
        {busy === "verify" && <Loader2 className="animate-spin" aria-hidden />}
        {busy === "verify" ? busyLabel : submitLabel}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy !== null || resendIn > 0}
          className="rounded font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline dark:text-accent-foreground"
        >
          {busy === "resend" ? (
            "Sending…"
          ) : resendIn > 0 ? (
            <>
              Resend code in <span className="tabular-nums">{formatCountdown(resendIn)}</span>
            </>
          ) : (
            "Resend code"
          )}
        </button>
        <button
          type="button"
          onClick={() => onRestart()}
          disabled={busy !== null}
          className="rounded text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
        >
          {restartLabel}
        </button>
      </div>
    </form>
  );
}
