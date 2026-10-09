"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDriverTermsStatus } from "@/lib/hooks/use-drivers";
import { DetailList } from "./detail-list";

/**
 * Whether this driver has agreed to the driver terms currently in force. Loaded on its own so the
 * rest of the driver page never depends on it; renders nothing if it can't be read.
 */
export function DriverTermsCard({ driverId }: { driverId: string }) {
  const { data: status } = useDriverTermsStatus(driverId);
  if (!status) return null;
  const { enabled, currentVersion, acceptedCurrent, lastAccepted } = status;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms &amp; Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        {currentVersion == null && !lastAccepted ? (
          <p className="text-sm text-muted-foreground">No driver terms have been published yet.</p>
        ) : (
          <DetailList
            rows={[
              ["Current version", currentVersion != null ? `v${currentVersion}` : "—"],
              [
                "Status",
                acceptedCurrent ? (
                  <StatusBadge key="s" value="approved" label="Agreed" />
                ) : lastAccepted ? (
                  <StatusBadge key="s" value="pending" label={`Agreed to v${lastAccepted.version} only`} />
                ) : enabled ? (
                  <StatusBadge key="s" value="pending" label="Not agreed yet" />
                ) : (
                  <StatusBadge key="s" value="inactive" label="Not asked (switched off)" />
                ),
              ],
              ...(lastAccepted
                ? ([
                    [
                      "Agreed at",
                      new Date(lastAccepted.acceptedAt).toLocaleString("en-LK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                    ],
                    [
                      "Agreed in",
                      [lastAccepted.language.toUpperCase(), lastAccepted.platform, lastAccepted.appVersion]
                        .filter(Boolean)
                        .join(" · "),
                    ],
                  ] as Array<[string, React.ReactNode]>)
                : []),
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
