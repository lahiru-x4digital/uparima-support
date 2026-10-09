"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDriverDevicePermissions } from "@/lib/hooks/use-drivers";
import { DetailList } from "./detail-list";

// Admin-readable names for the permission keys the app reports today. Also fixes the display
// order; anything the app reports that isn't listed here still shows, after these.
const PERMISSION_LABELS: Record<string, string> = {
  location: "Location access",
  locationServices: "Device GPS",
  notifications: "Notifications",
  batteryOptimization: "Battery optimization",
  overlay: "Draw over other apps",
  autostartManufacturer: "Autostart (OEM)",
  camera: "Camera",
  photos: "Photos",
};

// Raw app status -> badge tone + label. `value` picks the colour through StatusBadge's own map
// (approved = green, pending = amber, rejected = red, inactive = neutral).
const STATUS_VIEW: Record<string, { value: string; label: string }> = {
  // Location
  always: { value: "approved", label: "Always" },
  whileInUse: { value: "pending", label: "While using app" },
  denied: { value: "rejected", label: "Denied" },
  deniedForever: { value: "rejected", label: "Denied permanently" },
  unableToDetermine: { value: "inactive", label: "Unknown" },
  // Location services
  enabled: { value: "approved", label: "On" },
  disabled: { value: "rejected", label: "Off" },
  // Notifications
  granted: { value: "approved", label: "Granted" },
  provisional: { value: "pending", label: "Quiet delivery only" },
  notDetermined: { value: "pending", label: "Not asked yet" },
  // Battery optimization
  exempt: { value: "approved", label: "Exempt" },
  optimized: { value: "rejected", label: "Being optimized" },
  // Autostart
  affected: { value: "pending", label: "Needs manual autostart" },
  notAffected: { value: "approved", label: "Not affected" },
  // permission_handler statuses (camera / photos)
  permanentlyDenied: { value: "rejected", label: "Denied permanently" },
  restricted: { value: "inactive", label: "Restricted" },
  limited: { value: "pending", label: "Limited" },
  provisionalAccess: { value: "pending", label: "Provisional" },
  // Shared
  notApplicable: { value: "inactive", label: "N/A on iOS" },
  unknown: { value: "inactive", label: "Could not read" },
};

// The statuses that actually stop a driver receiving work, and what to tell them. This line is
// the point of the card.
const SYMPTOMS: { key: string; bad: string[]; message: string }[] = [
  { key: "location", bad: ["denied", "deniedForever"], message: "Location denied — this driver will not receive ride offers." },
  { key: "locationServices", bad: ["disabled"], message: "Device GPS is switched off — dispatch cannot locate this driver." },
  { key: "notifications", bad: ["denied"], message: "Notifications denied — ride alerts will not appear or make a sound." },
  { key: "overlay", bad: ["denied"], message: "Draw over other apps denied — the full-screen ride offer will not pop up." },
  {
    key: "batteryOptimization",
    bad: ["optimized"],
    message: "Not exempt from battery optimization — the app may be killed in the background, missing alerts.",
  },
];

/**
 * The OS permissions this driver's device grants, as last reported by their app. Loaded on its own
 * so the rest of the driver page never depends on it; renders nothing if it can't be read or the
 * driver has never reported.
 */
export function DriverDevicePermissionsCard({ driverId }: { driverId: string }) {
  const { data } = useDriverDevicePermissions(driverId);
  if (!data) return null;
  const { permissions } = data;

  // Known keys first, in the order above, then anything newer the app sent.
  const known = Object.keys(PERMISSION_LABELS).filter((k) => k in permissions);
  const extra = Object.keys(permissions).filter((k) => !(k in PERMISSION_LABELS));
  const rows = [...known, ...extra];

  const problems = SYMPTOMS.filter((s) => permissions[s.key] && s.bad.includes(permissions[s.key]));

  const device = [data.deviceManufacturer, data.deviceModel].filter(Boolean).join(" ");
  const build = [data.platform, data.appVersion, data.osVersion].filter(Boolean).join(" · ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        {problems.length > 0 && (
          <ul className="mb-3 space-y-1 rounded-lg bg-amber-100 p-3 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            {problems.map((p) => (
              <li key={p.key}>{p.message}</li>
            ))}
          </ul>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permission statuses were reported.</p>
        ) : (
          <DetailList
            rows={rows.map((key): [string, React.ReactNode] => {
              const raw = permissions[key];
              const view = STATUS_VIEW[raw];
              return [
                PERMISSION_LABELS[key] ?? key,
                <StatusBadge key={key} value={view?.value ?? "inactive"} label={view?.label ?? raw} />,
              ];
            })}
          />
        )}

        <div className="mt-3 border-t pt-3">
          <DetailList
            rows={[
              ...(device ? ([["Device", device]] as Array<[string, React.ReactNode]>) : []),
              ...(build ? ([["App", build]] as Array<[string, React.ReactNode]>) : []),
              [
                "Last reported",
                new Date(data.updatedAt).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" }),
              ],
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
