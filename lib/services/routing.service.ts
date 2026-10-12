import { apiGet, apiPut } from "@/lib/api";
import type { MyRouting, Presence } from "@/types/routing";

/** My presence, today's shift and how many open tickets I hold. */
export const getMyRouting = () => apiGet<MyRouting>("/support-desk/me/routing");

/** Online agents receive new tickets; Away and Offline don't. */
export const setMyPresence = (presence: Presence) =>
  apiPut<MyRouting>("/support-desk/me/presence", { presence });
