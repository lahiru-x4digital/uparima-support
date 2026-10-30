import type {
  CreateAllStatus,
  CreateTicketsSummary,
  IncomingChat,
  IncomingChatRef,
  IncomingFilter,
} from "@/types/whatsapp-incoming";

export const NO_FILTER: IncomingFilter = { q: "", ticket: "all", from: "", to: "" };

/** True when something narrows the list (the "Clear filters" link shows). */
export const isFiltered = (f: IncomingFilter) => !!f.q || f.ticket !== "all" || !!f.from || !!f.to;

/** Query params for the list: empty values left out. */
export function listParams(f: IncomingFilter, page: number, perPage: number) {
  return {
    page,
    perPage,
    ...(f.q ? { search: f.q } : {}),
    ...(f.ticket !== "all" ? { ticket: f.ticket } : {}),
    ...(f.from ? { from: f.from } : {}),
    ...(f.to ? { to: f.to } : {}),
  };
}

/** What "create tickets for all no-ticket chats" sends: the filter minus the ticket choice. */
export const allBody = (f: IncomingFilter) => ({
  ...(f.q ? { search: f.q } : {}),
  ...(f.from ? { from: f.from } : {}),
  ...(f.to ? { to: f.to } : {}),
});

/** A conversation's identity: a phone can have many. */
export const chatKey = (c: IncomingChatRef) => `${c.phone}|${c.sessionId ?? "legacy"}`;

/** Rows that can be given a ticket now: the ones without one. */
export const needsTicket = (c: IncomingChat) => c.ticket === null;

/** The ticked rows to send: only those with no ticket yet, as the plain references the API takes. */
export function ticketsToCreate(rows: IncomingChat[], ticked: ReadonlySet<string>): IncomingChatRef[] {
  return rows
    .filter((c) => ticked.has(chatKey(c)) && needsTicket(c))
    .map(({ phone, sessionId }) => ({ phone, sessionId }));
}

/** The one-line result after creating tickets, e.g. "Created 3 tickets · 2 assigned, 1 waiting". */
export function summaryText(s: CreateTicketsSummary): string {
  const parts: string[] = [];
  const made = s.created + s.existing;
  if (made > 0) {
    const tickets = (n: number) => `${n} ticket${n === 1 ? "" : "s"}`;
    parts.push(
      s.existing > 0 ? `${s.created} new ${s.created === 1 ? "ticket" : "tickets"}, ${s.existing} already open` : `Created ${tickets(made)}`,
    );
    const where = [s.assigned > 0 ? `${s.assigned} assigned` : "", s.queued > 0 ? `${s.queued} waiting for an agent` : ""]
      .filter(Boolean)
      .join(", ");
    if (where) parts.push(where);
  }
  if (s.failed > 0) parts.push(`${s.failed} failed`);
  return parts.join(" · ") || "Nothing to do";
}

/** How far the "create for all" run is: "Working… opened 40 ticket(s) so far, 2 failed". */
export const progressText = (s: Pick<CreateAllStatus, "created" | "failed">) =>
  `Working… opened ${s.created} ticket(s) so far${s.failed ? `, ${s.failed} failed` : ""}`;

/** What the run ended with, including why some conversations got no ticket. */
export function finishedText(s: CreateAllStatus): string {
  const made = `Opened ${s.created} ticket(s)${s.assigned ? `, ${s.assigned} more assigned from the waiting queue` : ""}.`;
  if (!s.failed) return made;
  const why = s.errors?.length ? ` (${s.errors.join("; ")})` : "";
  return `${made} ${s.failed} conversation(s) got no ticket${why}.`;
}
