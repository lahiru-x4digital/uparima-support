"use client";

import { useState } from "react";
import { AlertTriangle, Bike, Car, ExternalLink, Mail, Paperclip, Phone, Star, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DriverCreateDialog } from "@/components/drivers/driver-create-dialog";
import { DriverDetailsDialog } from "@/components/drivers/driver-details-dialog";
import { useRide } from "@/lib/hooks/use-desk";
import { formatTime, slaState } from "@/lib/inbox/mappers";
import { assetUrl, cn } from "@/lib/utils";
import { EMPTY_DRIVER_FORM } from "@/types/driver";
import type { Attachment, Conversation, Priority } from "@/types/inbox";
import type { PreviousTicketSummary, Staff } from "@/types/ticket";
import { CHANNELS, PRIORITIES, initials, languageLabel, topicLabel } from "./meta";
import { OptionSelect } from "./option-select";

const PRIORITY_OPTIONS = (Object.keys(PRIORITIES) as Priority[]).map((p) => ({ value: p, label: PRIORITIES[p].label }));
const UNASSIGNED = "__none__";

/** Driver account states that need a visible flag in the panel — the agent
 * is likely on this ticket precisely because the driver is blocked. */
const FLAGGED_DRIVER_STATUSES = new Set(["suspended", "rejected"]);

interface Props {
  conversation: Conversation;
  staff: Staff[];
  canUpdate: boolean;
  onAssign: (userId: number) => void;
  onPriority: (priority: Priority) => void;
  onClose: () => void;
  /** Opens another of this customer's tickets (from the History section). */
  onOpenTicket?: (ticketId: string) => void;
}

/** A conversation only ever carries one display name — split it for the
 * registration form's separate first/last name fields. "Unknown caller" and
 * phone-only placeholders aren't real names, so they're left blank rather
 * than prefilled as someone's first name. */
function splitName(customerName: string): { firstName: string; lastName: string } {
  if (customerName === "Unknown caller" || customerName.startsWith("+")) return { firstName: "", lastName: "" };
  const [firstName = "", ...rest] = customerName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
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

/** Compact driver stats: status (flagged visibly when suspended/rejected),
 * rating/rides as one secondary line, and a balance line that only appears
 * when there's actually something owed — most drivers have none. */
function DriverStats({
  submitter,
  onViewDriver,
}: {
  submitter: Extract<Conversation["submitter"], { kind: "driver" }>;
  onViewDriver: () => void;
}) {
  const flagged = FLAGGED_DRIVER_STATUSES.has(submitter.status);
  // platformFeeOwedLkr/creditBalance/averageRating are Postgres `decimal`/`int` columns that
  // TypeORM can return as strings — coerce before formatting so a string value never crashes
  // `.toFixed`/`.toLocaleString`.
  const platformFeeOwedLkr = Number(submitter.platformFeeOwedLkr);
  const creditBalance = Number(submitter.creditBalance);
  const averageRating = Number(submitter.averageRating);
  const totalRides = Number(submitter.totalRides);
  const owed = platformFeeOwedLkr > 0;
  const credit = creditBalance > 0;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={flagged ? "destructive" : "secondary"} className="capitalize">
          {submitter.status}
        </Badge>
        {flagged && submitter.suspensionReason && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground" title={submitter.suspensionReason}>
            <AlertTriangle className="size-3.5 text-destructive" /> {submitter.suspensionReason.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="size-3.5 fill-current text-amber-500" /> {averageRating.toFixed(1)} · {totalRides.toLocaleString()} rides
      </p>
      {(owed || credit) && (
        <p className={cn("text-xs", owed ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
          {owed ? `Owes LKR ${Math.round(platformFeeOwedLkr).toLocaleString()}` : `Credit: LKR ${Math.round(creditBalance).toLocaleString()}`}
        </p>
      )}
      <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={onViewDriver}>
        <ExternalLink className="size-3.5" /> View / edit driver
      </Button>
    </div>
  );
}

function TicketAttachments({ items }: { items: Attachment[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Attachments</span>
      <div className="flex flex-col gap-1">
        {items.map((a) => (
          <a
            key={a.key}
            href={assetUrl(a.key)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary underline underline-offset-2"
          >
            <Paperclip className="size-3.5 shrink-0" /> <span className="truncate">{a.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function HistoryList({ items, onOpen }: { items: PreviousTicketSummary[]; onOpen?: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">History</span>
      <div className="flex flex-col gap-1">
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen?.(t.id)}
            className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cn("size-1.5 shrink-0 rounded-full", t.status === "completed" ? "bg-muted-foreground" : "bg-amber-500")} />
              <span className="truncate font-medium">{t.subject}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{formatTime(t.createdAt)}</span>
          </button>
        ))}
      </div>
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

export function ContextPanel({ conversation: c, staff, canUpdate, onAssign, onPriority, onClose, onOpenTicket }: Props) {
  const RoleIcon = c.role === "rider" ? Bike : Car;
  const sla = slaState(c.slaDueAt);
  const topic = topicLabel(c.topic);
  const language = languageLabel(c.language);
  const assignOptions = [
    { value: UNASSIGNED, label: c.assignedToUserId == null ? "Unassigned" : "Reassign to…" },
    ...staff.map((s) => ({ value: String(s.id), label: s.name ?? `Staff #${s.id}` })),
  ];
  const assignedValue = c.assignedToUserId == null ? UNASSIGNED : String(c.assignedToUserId);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [createDriverOpen, setCreateDriverOpen] = useState(false);
  // A driver created from a ticket with no existing driver record — shown
  // in the detail dialog right after registration, by id (not c.submitter,
  // which still reflects the conversation's stale pre-registration state).
  const [newDriverId, setNewDriverId] = useState<number | null>(null);

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
            {c.email && <span className="flex items-center gap-2 break-all"><Mail className="size-4 shrink-0 text-muted-foreground" />{c.email}</span>}
            {c.submitter?.kind === "driver" && c.submitter.vehicleRegistrationNumber && (
              <span className="flex items-center gap-2"><Car className="size-4 text-muted-foreground" />{c.submitter.vehicleRegistrationNumber}</span>
            )}
            {c.submitter?.kind === "hire_tenant" && <span className="text-muted-foreground">Business: {c.submitter.tenantName}</span>}
          </div>

          {c.submitter?.kind === "driver" ? (
            <DriverStats submitter={c.submitter} onViewDriver={() => setDriverDialogOpen(true)} />
          ) : c.submitter?.kind !== "hire_tenant" ? (
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setCreateDriverOpen(true)}>
              <UserPlus className="size-3.5" /> Register as driver
            </Button>
          ) : null}

          {c.rideId && <RideCard rideId={c.rideId} />}

          <TicketAttachments items={c.attachments} />

          <Separator />

          <div className="flex flex-col gap-2">
            <Row label="Ticket" value={c.ticketNumber || "—"} />
            <Row label="Opened" value={formatTime(c.createdAt)} />
            <Row label="Channel" value={CHANNELS[c.channel].label} />
            {topic && <Row label="Topic" value={topic} />}
            {language && <Row label="Language" value={language} />}
            {c.contactPreference && <Row label="Wants" value={c.contactPreference === "message" ? "A message" : "A call"} />}
            {sla && <Row label="Response" value={<span className={cn(sla.overdue && "text-red-600 dark:text-red-400")}>{sla.label}</span>} />}
            {c.contactedAt && <Row label="Contacted" value={formatTime(c.contactedAt)} />}
          </div>

          <Separator />

          {c.ticketNumber ? (
            <Field label="Assigned to">
              {canUpdate ? (
                <OptionSelect label="Assignee" className="w-full" value={assignedValue} options={assignOptions}
                  onChange={(v) => v !== UNASSIGNED && onAssign(Number(v))} />
              ) : (
                <p className="text-sm">{c.assignedTo ?? "Unassigned"}</p>
              )}
            </Field>
          ) : (
            <p className="text-xs text-muted-foreground">Assignment is available once a ticket exists.</p>
          )}
          {c.priority ? (
            <Field label="Priority">
              {canUpdate ? (
                <OptionSelect label="Priority" className="w-full" value={c.priority} options={PRIORITY_OPTIONS} onChange={onPriority} />
              ) : (
                <p className="text-sm">{PRIORITIES[c.priority].label}</p>
              )}
            </Field>
          ) : (
            <p className="text-xs text-muted-foreground">No ticket yet — reply to start one.</p>
          )}

          {c.previousTickets.length > 0 && (
            <>
              <Separator />
              <HistoryList items={c.previousTickets} onOpen={onOpenTicket} />
            </>
          )}
        </div>
      </ScrollArea>

      {c.submitter?.kind === "driver" && (
        <DriverDetailsDialog
          driverId={String(c.submitter.driverId)}
          open={driverDialogOpen}
          onClose={() => setDriverDialogOpen(false)}
        />
      )}

      {createDriverOpen && (
        <DriverCreateDialog
          open={createDriverOpen}
          initialValues={{ ...EMPTY_DRIVER_FORM, ...splitName(c.customerName), phone: c.phone }}
          onClose={() => setCreateDriverOpen(false)}
          onCreated={(driverId) => {
            setCreateDriverOpen(false);
            setNewDriverId(driverId);
          }}
        />
      )}

      {newDriverId != null && (
        <DriverDetailsDialog
          driverId={String(newDriverId)}
          open={newDriverId != null}
          onClose={() => setNewDriverId(null)}
        />
      )}
    </aside>
  );
}
