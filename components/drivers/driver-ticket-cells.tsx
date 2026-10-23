"use client";

import { HeaderCalls, LogCallButton } from "@/components/shared/ticket-calls";
import type { Driver } from "@/types/driver";

const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");

/** "Contacted via call, whatsapp by Azmi · 21/10/2026" under a driver's name; nothing if not contacted. */
export function DriverContactLine({ driver }: { driver: Driver }) {
  const contact = driver.contact;
  if (!contact || contact.methods.length === 0) return null;
  return (
    <span className="text-xs font-normal text-muted-foreground">
      Contacted via {contact.methods.join(", ")} by {contact.agents.map((a) => a.name ?? `Staff #${a.id}`).join(", ")}
      {contact.lastContactedAt ? ` · ${formatDate(contact.lastContactedAt)}` : ""}
    </span>
  );
}

/** The driver's open support ticket and who has it. */
export function DriverTicketCell({ driver }: { driver: Driver }) {
  const ticket = driver.supportTicket;
  if (!ticket) return <span className="text-muted-foreground">No ticket</span>;
  return (
    <div className="flex flex-col">
      <span className="font-medium">{ticket.ticketNumber}</span>
      <span className="text-xs text-muted-foreground">
        {ticket.assignedAgent ? (ticket.assignedAgent.name ?? `Agent #${ticket.assignedAgent.id}`) : "Unassigned"}
      </span>
    </div>
  );
}

/** The calls logged on the driver's ticket, and — with `canLog` — a button to log the next one. */
export function DriverCallsCell({ driver, canLog }: { driver: Driver; canLog: boolean }) {
  const ticket = driver.supportTicket;
  if (!ticket) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <HeaderCalls ticketId={ticket.id} />
      {canLog && <LogCallButton ticketId={ticket.id} />}
    </div>
  );
}
