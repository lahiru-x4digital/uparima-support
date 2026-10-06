import { apiGet } from "@/lib/api";
import type { DeskProfile, Staff } from "@/types/ticket";

/** The signed-in agent, with the permissions that decide which controls to show. */
export const getMe = () => apiGet<DeskProfile>("/support-desk/me");

/** Active staff for the "Assigned to" dropdown. */
export const listStaff = () => apiGet<Staff[]>("/support-desk/staff");
