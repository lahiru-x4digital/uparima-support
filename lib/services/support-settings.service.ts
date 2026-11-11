import { apiGet, apiPut } from "@/lib/api";
import type { RoutingSettings, RoutingSettingsView } from "@/types/support-settings";

/** Admin only (support-routing.view / .update). */
export const getRoutingSettings = () => apiGet<RoutingSettingsView>("/admin/support/routing/settings");

export const updateRoutingSettings = (settings: RoutingSettings) =>
  apiPut<RoutingSettingsView>("/admin/support/routing/settings", settings);
