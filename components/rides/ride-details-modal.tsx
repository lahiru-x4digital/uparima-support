"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/shared/modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { VehicleTag } from "./vehicle-tag";

/** A label plus any already-formatted value; each caller decides which rows are relevant. */
export type DetailRow = { label: string; value: ReactNode };

export type PartyDetails = {
  name?: string | null;
  phone?: string | null;
  vehicle?: { type?: string | null; number?: string | null };
};

function Party({ title, party }: { title: string; party: PartyDetails }) {
  const name = party.name?.trim();
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="mt-1 text-sm font-medium">{name || "—"}</p>
      {party.vehicle && <VehicleTag type={party.vehicle.type} number={party.vehicle.number} className="mb-1" />}
      {party.phone ? (
        <a href={`tel:${party.phone}`} className="text-sm text-primary hover:underline">
          {party.phone}
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">No phone on file</p>
      )}
    </div>
  );
}

/** One ride at a glance: status, the two parties, and the detail rows the caller supplies. */
export function RideDetailsModal({
  open,
  onClose,
  title,
  status,
  rider,
  driver,
  rows,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  status?: string;
  rider: PartyDetails;
  driver: PartyDetails;
  rows: DetailRow[];
  footer?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="sm:max-w-2xl">
      <div className="space-y-4">
        {status && <StatusBadge value={status} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Party title="Rider" party={rider} />
          <Party title="Driver" party={driver} />
        </div>

        <dl className="divide-y rounded-xl border">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3 px-3 py-2">
              <dt className="w-32 shrink-0 text-xs tracking-wide text-muted-foreground uppercase">{row.label}</dt>
              <dd className="flex-1 text-sm break-words">{row.value}</dd>
            </div>
          ))}
        </dl>

        {footer}
      </div>
    </Modal>
  );
}
