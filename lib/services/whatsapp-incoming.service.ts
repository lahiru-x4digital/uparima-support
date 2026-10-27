import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import { allBody, listParams } from "@/lib/whatsapp-incoming/filters";
import type {
  CreateAllStatus,
  CreateTicketsSummary,
  IncomingChat,
  IncomingChatRef,
  IncomingFilter,
} from "@/types/whatsapp-incoming";

const BASE = "/support-desk/whatsapp-incoming";

/** Admins only: every incoming WhatsApp conversation, with its ticket if it has one. */
export const listIncomingChats = (filter: IncomingFilter, page: number, perPage: number) =>
  apiGetPage<IncomingChat>(BASE, { params: listParams(filter, page, perPage) });

/** Opens a ticket for each conversation (up to 100) and routes it to an agent now. */
export const createIncomingTickets = (items: IncomingChatRef[]) =>
  apiPost<CreateTicketsSummary>(`${BASE}/create-tickets`, { items });

/** Starts the background run that does the same for every no-ticket conversation matching the
 * filter's search and dates; poll `getCreateAllStatus` for progress. */
export const startCreateAllTickets = (filter: IncomingFilter) =>
  apiPost<CreateAllStatus>(`${BASE}/create-tickets/all`, allBody(filter));

export const getCreateAllStatus = () => apiGet<CreateAllStatus | null>(`${BASE}/create-tickets/all`);
