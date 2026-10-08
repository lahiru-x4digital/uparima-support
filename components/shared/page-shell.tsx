import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The scrolling page area every support screen sits in: a muted background, a centred column and
 * a title row with optional back link and actions on the right.
 */
export function PageShell({
  title,
  description,
  backHref,
  actions,
  children,
  width = "max-w-7xl",
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Shows an arrow before the title that goes here. */
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className={cn("mx-auto space-y-4", width)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Back"
                className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-bold">{title}</h1>
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Shown in place of a screen the signed-in agent has no permission for. */
export function NoAccess({ what }: { what: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-6">
      <p className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        You don&apos;t have access to {what}.
      </p>
    </div>
  );
}
