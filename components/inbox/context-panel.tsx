"use client";

import { useState } from "react";
import { AlertTriangle, Bike, Bookmark, Car, ExternalLink, Mail, MapPin, Paperclip, Phone, Star, StickyNote, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DriverCreateDialog } from "@/components/drivers/driver-create-dialog";
import { DriverDetailsDialog } from "@/components/drivers/driver-details-dialog";
import { DriverLocationDialog } from "@/components/drivers/driver-location-dialog";
import { DriverFollowup } from "@/components/drivers/driver-followup";
import { DriverNotes } from "@/components/drivers/driver-notes";
import { useDriverFollowups } from "@/lib/hooks/use-driver-followups";
import { useDriverNotes } from "@/lib/hooks/use-driver-notes";
import { useDriverDetail } from "@/lib/hooks/use-drivers";
import { useCan, useRide } from "@/lib/hooks/use-desk";
import { formatTime, slaState } from "@/lib/inbox/mappers";
import { assetUrl, cn } from "@/lib/utils";
import { EMPTY_DRIVER_FORM } from "@/types/driver";
import type { Attachment, Conversation, Priority } from "@/types/inbox";
import type { PreviousTicketSummary, Staff } from "@/types/ticket";
import {
  AUTO_CLOSE_REASONS,
  CHANNELS,
  ONBOARDING_CATEGORY,
  ONBOARDING_REASONS,
  PRIORITIES,
  QUEUED_REASONS,
  initials,
  languageLabel,
  topicLabel,
} from "./meta";
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
  onAssign: (userId: number) => void | Promise<void>;
  onPriority: (priority: Priority) => void;
  onClose: () => void;
  /** Opens another of this customer's tickets (from the History section). */
  onOpenTicket?: (ticketId: string) => void;
  /** Bumped by the composer's "Internal note" button to focus the notes box. */
  focusNotesKey?: number;
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

/** The driver's account status in the same colours as the driver pages: green approved, amber
 * pending / unfinished, red suspended / rejected, grey deleted. */
function DriverStatusBadge({ status }: { status: string }) {
  return <StatusBadge value={status} />;
}

/** An unfinished signup: what it still needs, from the driver record (the same query the
 * details dialog uses, so opening it afterwards costs nothing). */
function IncompleteSignupNote({ driverId }: { driverId: number }) {
  const { data } = useDriverDetail(String(driverId));
  const missing = [...(data?.driver.missingFields ?? []), ...(data?.driver.missingDocuments ?? [])];
  return (
    <p className="flex items-start gap-1.5 rounded-md border-l-4 border-l-amber-500 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <strong>Signup not finished</strong>
        {missing.length > 0 && <> — needs {missing.join(", ")}</>}
      </span>
    </p>
  );
}

/** Driver alerts and actions. Status and rating live in the header; this only shows what needs
 * attention — why the account is blocked, an unfinished signup, a balance owed (most drivers
 * have none) — followed by the two actions in one row. */
function DriverStats({
  submitter,
  onViewDriver,
  onEditLocation,
}: {
  submitter: Extract<Conversation["submitter"], { kind: "driver" }>;
  onViewDriver: () => void;
  /** Omitted when the agent may not edit drivers. */
  onEditLocation?: () => void;
}) {
  const flagged = FLAGGED_DRIVER_STATUSES.has(submitter.status);
  // platformFeeOwedLkr/creditBalance are Postgres `decimal` columns that TypeORM can return as
  // strings — coerce before formatting so a string value never crashes `.toLocaleString`.
  const platformFeeOwedLkr = Number(submitter.platformFeeOwedLkr);
  const creditBalance = Number(submitter.creditBalance);
  const owed = platformFeeOwedLkr > 0;
  const credit = creditBalance > 0;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {flagged && submitter.suspensionReason && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" title={submitter.suspensionReason}>
          <AlertTriangle className="size-3.5 shrink-0" /> {submitter.suspensionReason.replace(/_/g, " ")}
        </p>
      )}
      {submitter.status === "incomplete" && <IncompleteSignupNote driverId={submitter.driverId} />}
      {(owed || credit) && (
        <p className={cn("text-xs", owed ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
          {owed ? `Owes LKR ${Math.round(platformFeeOwedLkr).toLocaleString()}` : `Credit: LKR ${Math.round(creditBalance).toLocaleString()}`}
        </p>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="min-w-0 flex-1" title="View / edit driver" onClick={onViewDriver}>
          <ExternalLink className="size-3.5" /> <span className="truncate">View / edit</span>
        </Button>
        {onEditLocation && (
          <Button size="sm" variant="outline" className="min-w-0 flex-1" title="Change location" onClick={onEditLocation}>
            <MapPin className="size-3.5" /> <span className="truncate">Location</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function FollowupSection({ driverId, ticketNumber }: { driverId: number; ticketNumber: string }) {
  const newFiles = (useDriverFollowups(driverId).data ?? []).reduce((sum, f) => sum + f.newFiles, 0);
  return (
    <section aria-labelledby="driver-followup-heading" className="flex flex-col gap-2">
      <h4 id="driver-followup-heading" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Bookmark className="size-3.5" /> Follow-up
        {newFiles > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">{newFiles} new</span>
        )}
      </h4>
      <DriverFollowup driverId={driverId} ticketNumber={ticketNumber || undefined} />
    </section>
  );
}

function NotesSection({ driverId, ticketNumber, focusKey }: { driverId: number; ticketNumber: string; focusKey?: number }) {
  const count = useDriverNotes(driverId).data?.length ?? 0;
  return (
    <section aria-labelledby="driver-notes-heading" className="flex flex-col gap-2">
      <h4 id="driver-notes-heading" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <StickyNote className="size-3.5" /> Internal notes
        {count > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] leading-4 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
            {count}
          </span>
        )}
        <span className="ml-auto font-normal">Staff only</span>
      </h4>
      <DriverNotes driverId={driverId} currentTicketNumber={ticketNumber || undefined} compact focusKey={focusKey} />
    </section>
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

/** How the current assignee was chosen, or why nobody has it yet. */
function AssignmentNote({ conversation: c }: { conversation: Conversation }) {
  const r = c.routing;
  if (!r) return null;
  if (c.assignedToUserId == null) {
    if (r.status !== "queued") return null;
    return (
      <p className={cn("text-xs", r.queuedReason === "no_qualified_agent" ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
        Waiting in the queue: {QUEUED_REASONS[r.queuedReason ?? ""] ?? "no matching agent yet"}.
      </p>
    );
  }
  if (!r.assignmentMethod) return null;
  const when = r.assignedAt ? ` · ${formatTime(r.assignedAt)}` : "";
  return (
    <p className="text-xs text-muted-foreground">
      {r.assignmentMethod === "auto" ? "Auto-assigned" : "Assigned by staff"}{when}
      {r.outOfShift && <span className="text-amber-700 dark:text-amber-300"> · outside their shift</span>}
    </p>
  );
}

export function ContextPanel({ conversation: c, staff, canUpdate, onAssign, onPriority, onClose, onOpenTicket, focusNotesKey }: Props) {
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
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const canEditDriver = useCan("driver.update");
  const canSeeDriver = useCan("driver.view");
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
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-10"><AvatarFallback>{initials(c.customerName)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold" title={c.customerName}>{c.customerName}</p>
                {c.submitter?.kind === "driver" && <DriverStatusBadge status={c.submitter.status} />}
              </div>
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <RoleIcon className="size-3" /> {c.role === "rider" ? "Rider" : "Driver"}
                {c.submitter?.kind === "driver" && (
                  <>
                    <span aria-hidden>·</span>
                    <Star className="size-3 fill-current text-amber-500" />
                    {Number(c.submitter.averageRating).toFixed(1)} · {Number(c.submitter.totalRides).toLocaleString()} rides
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="flex items-center gap-1.5"><Phone className="size-4 text-muted-foreground" />{c.phone}</span>
              {c.submitter?.kind === "driver" && c.submitter.vehicleRegistrationNumber && (
                <span className="flex items-center gap-1.5"><Car className="size-4 text-muted-foreground" />{c.submitter.vehicleRegistrationNumber}</span>
              )}
            </div>
            {c.email && <span className="flex items-center gap-1.5 break-all"><Mail className="size-4 shrink-0 text-muted-foreground" />{c.email}</span>}
            {c.submitter?.kind === "hire_tenant" && <span className="text-muted-foreground">Business: {c.submitter.tenantName}</span>}
          </div>

          {c.submitter?.kind === "driver" ? (
            <DriverStats
              submitter={c.submitter}
              onViewDriver={() => setDriverDialogOpen(true)}
              onEditLocation={canEditDriver ? () => setLocationDialogOpen(true) : undefined}
            />
          ) : c.submitter?.kind !== "hire_tenant" ? (
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setCreateDriverOpen(true)}>
              <UserPlus className="size-3.5" /> Register as driver
            </Button>
          ) : null}

          {c.submitter?.kind === "driver" && canSeeDriver && (
            <FollowupSection driverId={c.submitter.driverId} ticketNumber={c.ticketNumber} />
          )}

          {c.submitter?.kind === "driver" && canSeeDriver && (
            <NotesSection driverId={c.submitter.driverId} ticketNumber={c.ticketNumber} focusKey={focusNotesKey} />
          )}

          {c.rideId && <RideCard rideId={c.rideId} />}

          <TicketAttachments items={c.attachments} />

          <Separator />

          <div className="flex flex-col gap-2">
            <Row label="Ticket" value={c.ticketNumber ? `${c.ticketNumber} · ${formatTime(c.createdAt)}` : `Started ${formatTime(c.createdAt)}`} />
            <Row label="Channel" value={language ? `${CHANNELS[c.channel].label} · ${language}` : CHANNELS[c.channel].label} />
            {topic && <Row label="Topic" value={topic} />}
            {c.contactPreference && <Row label="Wants" value={c.contactPreference === "message" ? "A message" : "A call"} />}
            {sla && (
              <Row label="Response" value={
                <span title="Counted in desk opening hours only" className={cn(sla.overdue && "text-red-600 dark:text-red-400")}>{sla.label}</span>
              } />
            )}
            {c.routing?.category === ONBOARDING_CATEGORY && (
              <Row label="Onboarding" value={ONBOARDING_REASONS[c.routing.onboardingReason ?? ""] ?? "Driver onboarding"} />
            )}
            {c.routing?.autoClosed && (
              <Row label="Closed" value={AUTO_CLOSE_REASONS[c.routing.autoCloseReason ?? ""] ?? "Automatically"} />
            )}
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
            <AssignmentNote conversation={c} />
          </Field>
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
      {c.submitter?.kind === "driver" && locationDialogOpen && (
        <DriverLocationDialog
          driverId={String(c.submitter.driverId)}
          open={locationDialogOpen}
          onClose={() => setLocationDialogOpen(false)}
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
