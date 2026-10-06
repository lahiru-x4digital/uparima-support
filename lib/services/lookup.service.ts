import { apiGet } from "@/lib/api";
import type { RideLookup } from "@/types/ticket";

export const getRide = (id: string) => apiGet<RideLookup>(`/support-desk/lookup/rides/${id}`);
