"use client";

import { useId, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeAuthFailure, validateSignIn, type SignInErrors, type SignInValues } from "@/lib/auth-flow";

const FIELD = "h-11 pl-10 text-base md:text-sm";
const FIELD_ICON = "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

/** Email + password. Checks the input, shows what's wrong next to the field, and reports refusals from the server. */
export function CredentialsForm({
  initialEmail = "",
  onSubmit,
}: {
  initialEmail?: string;
  /** Rejects with the backend's error when the sign-in is refused. */
  onSubmit: (values: SignInValues) => Promise<void>;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignInErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const emailErrorId = `${id}-email-error`;
  const passwordErrorId = `${id}-password-error`;
  const capsLockId = `${id}-caps-lock`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const values = { email: email.trim(), password };
    const errors = validateSignIn(values);
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email) return emailRef.current?.focus();
    if (errors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await onSubmit(values);
      // Left "submitting" on purpose: the caller is moving to the next step or page.
    } catch (err) {
      setFormError(describeAuthFailure(err).message);
      setPassword("");
      setSubmitting(false);
      passwordRef.current?.focus();
    }
  }

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {formError && <AuthAlert>{formError}</AuthAlert>}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <div className="relative">
          <Mail className={FIELD_ICON} aria-hidden />
          <Input
            ref={emailRef}
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={!initialEmail}
            placeholder="you@uparima.lk"
            required
            // Read-only, not disabled, while the request is out: a disabled field can't take the
            // focus back when the sign-in is refused.
            readOnly={submitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={!!fieldErrors.email || undefined}
            aria-describedby={fieldErrors.email ? emailErrorId : undefined}
            className={FIELD}
          />
        </div>
        {fieldErrors.email && (
          <p id={emailErrorId} className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-password`}>Password</Label>
        <div className="relative">
          <LockKeyhole className={FIELD_ICON} aria-hidden />
          <Input
            ref={passwordRef}
            id={`${id}-password`}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoFocus={!!initialEmail}
            required
            readOnly={submitting}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            onKeyDown={trackCapsLock}
            onKeyUp={trackCapsLock}
            onBlur={() => setCapsLock(false)}
            aria-invalid={!!fieldErrors.password || undefined}
            aria-describedby={
              [fieldErrors.password && passwordErrorId, capsLock && capsLockId].filter(Boolean).join(" ") || undefined
            }
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={submitting}
            className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none"
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        {fieldErrors.password && (
          <p id={passwordErrorId} className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        )}
        {capsLock && (
          <p id={capsLockId} className="text-xs text-muted-foreground">
            Caps Lock is on.
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-1 h-11 w-full text-base" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" aria-hidden />}
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Forgot your password? An administrator can reset it for you from Staff Management.
      </p>
    </form>
  );
}
