"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { activate, CodeForm, type ActiveChallenge } from "@/components/auth/code-form";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { useAuth } from "@/lib/auth-context";
import { safeNextPath, signInNotice, type SignInValues } from "@/lib/auth-flow";
import * as authService from "@/lib/services/auth.service";

/**
 * The sign-in screen: email and password, then — for an account with two-factor sign-in on —
 * the code that was emailed. `next` and `reason` come from the address bar (see lib/auth-flow.ts).
 */
export function LoginForm({ next, reason }: { next?: string; reason?: string }) {
  const { user, loading, login, verifyLoginCode } = useAuth();
  const router = useRouter();
  const destination = safeNextPath(next);

  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  // Shown above the password form: why you're here, or why the code step sent you back.
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(() => {
    const text = signInNotice(reason);
    return text ? { tone: "info", text } : null;
  });

  // One place decides where a signed-in agent goes — whether they just signed in or already were.
  useEffect(() => {
    if (!loading && user) router.replace(destination);
  }, [loading, user, router, destination]);

  async function signIn(values: SignInValues) {
    setNotice(null);
    setEmail(values.email);
    const pending = await login(values.email, values.password);
    if (pending) setChallenge(activate(pending));
  }

  function backToPassword(message?: string) {
    setChallenge(null);
    setNotice(message ? { tone: "error", text: message } : null);
  }

  if (user) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Opening the support desk…
      </div>
    );
  }

  if (challenge) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MailCheck className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-bold">
              {challenge.emailSent === false ? "Enter your sign-in code" : "Check your email"}
            </h1>
            {challenge.emailSent === false ? (
              <p className="text-sm text-muted-foreground">
                Your account needs a 6-digit code to finish signing in.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{challenge.emailHint}</span>.
                Enter it to finish signing in.
              </p>
            )}
          </div>
        </header>
        {challenge.emailSent === false && (
          <AuthAlert>
            We couldn&apos;t email your code to {challenge.emailHint}. Ask a super admin for it — they can see it in
            the admin dashboard under Sign-in Codes.
          </AuthAlert>
        )}
        <CodeForm
          challenge={challenge}
          submitLabel="Verify and sign in"
          busyLabel="Verifying…"
          restartLabel="Use a different account"
          onVerify={(code) => verifyLoginCode(challenge.challengeId, code)}
          onResend={async () => setChallenge(activate(await authService.resendLoginCode(challenge.challengeId)))}
          onRestart={backToPassword}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in with your Uparima staff account.</p>
      </header>
      {notice && <AuthAlert tone={notice.tone}>{notice.text}</AuthAlert>}
      <CredentialsForm initialEmail={email} onSubmit={signIn} />
    </div>
  );
}
