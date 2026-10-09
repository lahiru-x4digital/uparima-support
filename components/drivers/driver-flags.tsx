import { AlertTriangle, FileWarning } from "lucide-react";
import { TonePill } from "@/components/shared/status-badge";
import type { Driver } from "@/types/driver";

type DriverFlagsInput = Pick<Driver, "missingDocuments" | "reviewValid" | "reviewIssues">;

/**
 * Compact badges for the drivers list and detail page: an application with nothing to review yet
 * (created or resubmitted while "Bypass Document Validation" was on), and one the AI review
 * already flagged a document problem on — visible without opening the driver. Both come from the
 * backend (RidesAdminService.missingRequiredDocuments, DriverReviewService), not derived here.
 */
export function DriverFlags({ driver, className }: { driver: DriverFlagsInput; className?: string }) {
  const missing = driver.missingDocuments ?? [];
  // reviewValid is null until the first AI review completes — only false is a flagged problem.
  const issues = driver.reviewValid === false ? (driver.reviewIssues ?? []) : [];
  if (missing.length === 0 && issues.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {missing.length > 0 && (
        <TonePill tone="amber" title={`Missing: ${missing.join(", ")}`}>
          <FileWarning className="size-3" />
          Incomplete
        </TonePill>
      )}
      {issues.length > 0 && (
        <TonePill tone="red" title={issues.join("\n")}>
          <AlertTriangle className="size-3" />
          {issues.length === 1 ? "1 document issue" : `${issues.length} document issues`}
        </TonePill>
      )}
    </div>
  );
}
