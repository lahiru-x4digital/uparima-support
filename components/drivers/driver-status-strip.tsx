"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signupGaps } from "@/lib/driver-review";
import { cn } from "@/lib/utils";
import type { AiValidationResult, Driver } from "@/types/driver";

type Tone = "amber" | "red" | "green";

const TONE: Record<Tone, string> = {
  amber: "border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
  red: "border-l-destructive bg-destructive/5 text-destructive",
  green: "border-l-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
};

function Line({
  tone,
  icon,
  children,
  action,
  details,
  title,
}: {
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  details?: string[];
  title?: string;
}) {
  return (
    <div className={cn("rounded-md border-l-4 px-3 py-1.5 text-sm", TONE[tone])} title={title}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="shrink-0 [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 flex-1">{children}</span>
        {action}
      </div>
      {details && details.length > 0 && (
        <details className="mt-1 pl-6 text-xs">
          <summary className="cursor-pointer select-none opacity-80 hover:opacity-100">
            {details.length} issue{details.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Everything that needs the agent's attention, one line each, with the action that fixes it —
 * replacing stacked banner cards that pushed the actual details below the fold.
 */
export function DriverStatusStrip({
  driver,
  aiResult,
  canUpdate,
  onCompleteDetails,
  onOpenDocuments,
}: {
  driver: Driver;
  aiResult: AiValidationResult | null;
  canUpdate: boolean;
  onCompleteDetails: () => void;
  onOpenDocuments: () => void;
}) {
  const gaps = signupGaps(driver);
  const lines: ReactNode[] = [];

  if (gaps && gaps.length > 0) {
    lines.push(
      <Line
        key="gaps"
        tone="amber"
        icon={<AlertTriangle />}
        title="Once these are saved the driver moves to Pending and can be approved or AI-validated."
        action={
          canUpdate && (
            <Button size="xs" variant="outline" onClick={onCompleteDetails}>
              Complete details
            </Button>
          )
        }
      >
        <strong>Signup not finished</strong> — still needs {gaps.join(", ")}
      </Line>,
    );
  } else if (gaps) {
    lines.push(
      <Line key="ready" tone="green" icon={<CheckCircle2 />}>
        <strong>Ready for review</strong> — check the documents, then Approve or AI Validate
      </Line>,
    );
  }

  if (driver.missingDocuments.length > 0 && !(gaps && gaps.length > 0)) {
    lines.push(
      <Line
        key="docs"
        tone="amber"
        icon={<AlertTriangle />}
        title="Registered with “Bypass Document Validation” on, or completed by staff without it. Confirm before approving."
        action={
          <Button size="xs" variant="outline" onClick={onOpenDocuments}>
            Open documents
          </Button>
        }
      >
        <strong>Missing:</strong> {driver.missingDocuments.join(", ")}
      </Line>,
    );
  }

  if (aiResult) {
    lines.push(
      <Line
        key="ai"
        tone={aiResult.valid ? "green" : "amber"}
        icon={<Sparkles />}
        details={aiResult.issues}
      >
        <strong>{aiResult.valid ? "AI validation passed" : "AI validation found issues"}</strong>
        {aiResult.summary && ` — ${aiResult.summary}`}
        {aiResult.filledLicenseNumber && (
          <>
            {" "}
            · Licence no. <span className="font-mono font-semibold">{aiResult.filledLicenseNumber}</span> read from the photo
            and saved — check it.
          </>
        )}
        {aiResult.approved && " · Driver was automatically approved."}
      </Line>,
    );
  } else if (driver.reviewValid === false) {
    lines.push(
      <Line
        key="review"
        tone="red"
        icon={<CircleAlert />}
        details={driver.reviewIssues ?? []}
        action={
          <Button size="xs" variant="outline" onClick={onOpenDocuments}>
            Open documents
          </Button>
        }
      >
        <strong>Document issues found</strong>
        {driver.reviewSummary && ` — ${driver.reviewSummary}`}
      </Line>,
    );
  }

  if (lines.length === 0) return null;
  return <div className="space-y-1.5">{lines}</div>;
}
