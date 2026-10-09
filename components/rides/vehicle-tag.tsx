/**
 * A ride's vehicle, shown under the driver in ride tables and cards: the vehicle type the rider
 * booked (else the driver's own) plus the driver's plate number. The plate is the driver's current
 * one; rides don't snapshot it.
 */
export function VehicleTag({
  type,
  number,
  className,
}: {
  type?: string | null;
  number?: string | null;
  className?: string;
}) {
  if (!type && !number) return null;
  return (
    <span className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-xs ${className ?? ""}`}>
      {type && (
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium whitespace-nowrap text-muted-foreground">{type}</span>
      )}
      {number && <span className="font-mono whitespace-nowrap text-muted-foreground">{number}</span>}
    </span>
  );
}
