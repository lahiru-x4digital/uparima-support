"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { useDriverDuplicateDocuments } from "@/lib/hooks/use-drivers";
import { useCanViewDrivers } from "@/lib/hooks/use-desk";
import { DocumentPreviewModal, type DocumentPreview } from "./document-preview-modal";

/**
 * The detail behind a "possible reused/shared document" warning: which other driver accounts hold
 * a document this driver's document matches, with both images side by side to compare.
 */
export function DriverDuplicateDocuments({ driverId }: { driverId: string }) {
  const { data: matches, isLoading, error } = useDriverDuplicateDocuments(driverId);
  const viewDrivers = useCanViewDrivers();
  const canOpenOtherDriver = viewDrivers.any; // pendingOnly staff can't open approved/active drivers
  const [preview, setPreview] = useState<DocumentPreview | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Looking for matching documents…</p>;
  if (error) return <p className="text-sm text-destructive">{getErrorMessage(error)}</p>;

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Matching documents on other drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No match found now. The warning was raised when the documents were last validated; the document it
            matched may since have been removed, or this driver&apos;s documents replaced.
          </p>
        </CardContent>
      </Card>
    );
  }

  const otherDrivers = [...new Map(matches.map((m) => [m.otherDriver.id, m.otherDriver])).values()];

  return (
    <Card className="ring-amber-400/60">
      <CardHeader>
        <CardTitle className="text-amber-700 dark:text-amber-400">Matching documents on other drivers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {canOpenOtherDriver && (
          <div className="flex flex-wrap gap-3">
            {otherDrivers.map((d) => (
              <a
                key={d.id}
                href={`/drivers/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {d.name ?? `Driver #${d.id}`} (#{d.id})
              </a>
            ))}
          </div>
        )}
        {matches.map((m, i) => {
          const otherName = m.otherDriver.name || `Driver #${m.otherDriver.id}`;
          return (
            <div key={`${m.slot}-${m.otherDriver.id}-${i}`} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold first-letter:uppercase">{m.label}</span>
                <span className="text-muted-foreground">matches a document of</span>
                {canOpenOtherDriver ? (
                  <Link href={`/drivers/${m.otherDriver.id}`} className="font-semibold text-primary hover:underline">
                    {otherName} (#{m.otherDriver.id})
                  </Link>
                ) : (
                  <span className="font-semibold">{otherName} (#{m.otherDriver.id})</span>
                )}
                <StatusBadge value={m.otherDriver.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {[m.otherDriver.phone, m.otherDriver.nicNumber && `NIC ${m.otherDriver.nicNumber}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.reason === "shared-number"
                  ? `Same document number: ${m.sharedIdentifiers.join(", ")}.`
                  : "The images are near-identical and a document number couldn't be read on one of them, so reuse can't be ruled out."}{" "}
                Image difference {m.distance} (0 = identical).
              </p>
              <div className="grid max-w-xl grid-cols-2 gap-3">
                {[
                  { who: "This driver", url: m.ownImageUrl },
                  { who: otherName, url: m.otherImageUrl },
                ].map(({ who, url }) => (
                  <figure key={who} className="space-y-1">
                    {url ? (
                      <button
                        type="button"
                        onClick={() => setPreview({ label: `${m.label} - ${who}`, url })}
                        className="block w-full overflow-hidden rounded-lg border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL */}
                        <img src={url} alt={`${m.label} - ${who}`} className="h-40 w-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                        Image not available
                      </div>
                    )}
                    <figcaption className="truncate text-xs text-muted-foreground">{who}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
      <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </Card>
  );
}
