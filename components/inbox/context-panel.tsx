"use client";

import { Bike, Car, Phone, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRide } from "@/lib/hooks/use-desk";
import { formatTime, slaState } from "@/lib/inbox/mappers";
import { cn } from "@/lib/utils";
import type { Conversation, Priority } from "@/types/inbox";
import type { Staff } from "@/types/ticket";
import { PRIORITIES, initials, languageLabel, topicLabel } from "./meta";
import { OptionSelect } from "./option-select";

const PRIORITY_OPTIONS = (Object.keys(PRIORITIES) as Priority[]).map((p) => ({ value: p, label: PRIORITIES[p].label }));
const UNASSIGNED = "__none__";

interface Props {
  conversation: Conversation;
  staff: Staff[];
  canUpdate: boolean;
  onAssign: (userId: number) => void;
  onPriority: (priority: Priority) => void;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function RideCard({ rideId }: { rideId: string }) {
  const { data: ride, isLoading, isError } = useRide(rideId);
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Linked ride</p>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && <p className="text-muted-foreground">Couldn&apos;t load this ride.</p>}
      {ride && (
        <div className="flex flex-col gap-1">
          <p className="truncate">{ride.pickupAddress ?? "Pickup"} → {ride.dropoffAddress ?? "Dropoff"}</p>
          <p className="text-xs text-muted-foreground">
            {ride.status} · LKR {Math.round(Number(ride.fareLkr))}{ride.createdAt ? ` · ${formatTime(ride.createdAt)}` : ""}
          </p>
          {ride.driver && <p className="text-xs text-muted-foreground">Driver: {ride.driver.name} · {ride.driver.vehicleRegistrationNumber ?? "—"}</p>}
          {ride.rider && <p className="text-xs text-muted-foreground">Rider: {ride.rider.name ?? "—"}{ride.rider.phone ? ` · ${ride.rider.phone}` : ""}</p>}
        </div>
      )}
    </div>
  );
}

export function ContextPanel({ conversation: c, staff, canUpdate, onAssign, onPriority, onClose }: Props) {
  const RoleIcon = c.role === "rider" ? Bike : Car;
  const sla = slaState(c.slaDueAt);
  const topic = topicLabel(c.topic);
  const language = languageLabel(c.language);
  const assignOptions = [
    { value: UNASSIGNED, label: c.assignedToUserId == null ? "Unassigned" : "Reassign to…" },
    ...staff.map((s) => ({ value: String(s.id), label: s.name ?? `Staff #${s.id}` })),
  ];
  const assignedValue = c.assignedToUserId == null ? UNASSIGNED : String(c.assignedToUserId);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">Details</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details"><X /></Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar size="lg" className="size-14"><AvatarFallback className="text-base">{initials(c.customerName)}</AvatarFallback></Avatar>
            <div>
              <p className="font-semibold">{c.customerName}</p>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <RoleIcon className="size-3" /> {c.role === "rider" ? "Rider" : "Driver"}
                {c.submitter?.kind === "driver" ? ` · ${c.submitter.status}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{c.phone}</span>
            {c.submitter?.kind === "driver" && c.submitter.vehicleRegistrationNumber && (
              <span className="flex items-center gap-2"><Car className="size-4 text-muted-foreground" />{c.submitter.vehicleRegistrationNumber}</span>
            )}
            {c.submitter?.kind === "hire_tenant" && <span className="text-muted-foreground">Business: {c.submitter.tenantName}</span>}
          </div>

          {c.rideId && <RideCard rideId={c.rideId} />}

          <Separator />

          <div className="flex flex-col gap-2">
            <Row label="Ticket" value={c.ticketNumber} />
            <Row label="Opened" value={formatTime(c.createdAt)} />
            {topic && <Row label="Topic" value={topic} />}
            {language && <Row label="Language" value={language} />}
            {c.contactPreference && <Row label="Wants" value={c.contactPreference === "message" ? "A message" : "A call"} />}
            {sla && <Row label="Response" value={<span className={cn(sla.overdue && "text-red-600 dark:text-red-400")}>{sla.label}</span>} />}
            {c.contactedAt && <Row label="Contacted" value={formatTime(c.contactedAt)} />}
          </div>

          <Separator />

          <Field label="Assigned to">
            {canUpdate ? (
              <OptionSelect label="Assignee" className="w-full" value={assignedValue} options={assignOptions}
                onChange={(v) => v !== UNASSIGNED && onAssign(Number(v))} />
            ) : (
              <p className="text-sm">{c.assignedTo ?? "Unassigned"}</p>
            )}
          </Field>
          <Field label="Priority">
            {canUpdate ? (
              <OptionSelect label="Priority" className="w-full" value={c.priority} options={PRIORITY_OPTIONS} onChange={onPriority} />
            ) : (
              <p className="text-sm">{PRIORITIES[c.priority].label}</p>
            )}
          </Field>
        </div>
      </ScrollArea>
    </aside>
  );
}
