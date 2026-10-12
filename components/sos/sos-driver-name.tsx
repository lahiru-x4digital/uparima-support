import Link from "next/link";

/**
 * A driver's name on an SOS alert, linked to their profile page (/drivers/[id], the driver id — `driver_id`
 * on the alert) when `link` is set (the viewer has driver.view). Plain text when there is no id to open.
 */
export function SosDriverName({
  driverId,
  name,
  link,
  className,
}: {
  driverId: number | null;
  name: string | null;
  link: boolean;
  className?: string;
}) {
  const label = name?.trim();
  if (link && driverId) {
    return (
      <Link href={`/drivers/${driverId}`} title="Open driver profile" className={className ?? "hover:text-primary hover:underline"}>
        {label || `Driver #${driverId}`}
      </Link>
    );
  }
  return <>{label || "—"}</>;
}
