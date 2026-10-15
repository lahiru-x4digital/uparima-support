import { apiGet, apiGetPage } from "@/lib/api";
import type { CompletedTicket, MyApprovals, MyPerformance } from "@/types/performance";
import type { Paginated } from "@/types/ticket";

/** The signed-in agent's own numbers for a period of Sri Lanka days (YYYY-MM-DD, both inclusive). */
export const getMyPerformance = (from: string, to: string) =>
  apiGet<MyPerformance>("/support-desk/me/performance", { params: { from, to } });

/** Drivers approved in the period that the agent is credited with, and how they took part. */
export const getMyApprovals = (from: string, to: string) =>
  apiGet<MyApprovals>("/support-desk/me/approvals", { params: { from, to } });

/** Tickets the agent completed in the period, newest first. */
export const getMyCompletedTickets = (from: string, to: string, page: number): Promise<Paginated<CompletedTicket>> =>
  apiGetPage<CompletedTicket>("/support-desk/me/completed-tickets", { params: { from, to, page } });
