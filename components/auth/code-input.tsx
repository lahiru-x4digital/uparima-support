"use client";

import { useState, type Ref } from "react";
import { CODE_LENGTH, sanitizeCode } from "@/lib/auth-flow";
import { cn } from "@/lib/utils";

/**
 * Six boxes for an emailed code. They are a picture of one real text field stretched invisibly
 * over them — so typing, Backspace, pasting "123 456", the phone's "from Messages/Mail" suggestion
 * and password managers all behave exactly as they do in any other field.
 */
export function CodeInput({
  value,
  onChange,
  invalid,
  readOnly,
  disabled,
  describedBy,
  autoFocus,
  ref,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  const [focused, setFocused] = useState(false);
  // The box the next digit lands in (the last one once the code is complete).
  const activeIndex = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        aria-label={`${CODE_LENGTH}-digit code`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoFocus={autoFocus}
        readOnly={readOnly}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(sanitizeCode(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // The caret can't be seen, so it always sits at the end: digits append, Backspace removes the last.
        onSelect={(e) => e.currentTarget.setSelectionRange(value.length, value.length)}
        className="absolute inset-0 z-10 size-full cursor-text rounded-lg opacity-0 disabled:cursor-not-allowed"
      />
      <div aria-hidden className={cn("grid grid-cols-6 gap-2", disabled && "opacity-50")}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = focused && !disabled && i === activeIndex;
          return (
            <div
              key={i}
              className={cn(
                "flex h-12 items-center justify-center rounded-lg border border-input bg-transparent font-mono text-xl font-semibold tabular-nums transition-colors dark:bg-input/30",
                active && "border-ring ring-3 ring-ring/50",
                invalid && "border-destructive dark:border-destructive/50",
                invalid && active && "ring-destructive/20 dark:ring-destructive/40",
              )}
            >
              {value[i] ?? (active && <span className="h-5 w-px animate-pulse bg-foreground" />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
