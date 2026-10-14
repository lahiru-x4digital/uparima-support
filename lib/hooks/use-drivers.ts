"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, getErrorMessage } from "@/lib/api";
import { loadDistrictCities, loadProvinceDistricts, loadProvinces, searchAreas } from "@/lib/driver-cities";
import { useAuth } from "@/lib/auth-context";
import {
  adjustDriverSubscription,
  approveDriver,
  createDriver,
  createDriverDraft,
  deleteDriverPermanently,
  getDriver,
  getDriverDevicePermissions,
  getDriverSubscription,
  getDriverTermsStatus,
  listDrivers,
  listPendingDrivers,
  listVehicleMakes,
  listVehicleModels,
  listVehicleTypes,
  rejectDriver,
  removeDriverDocument,
  restoreDriver,
  suspendDriver,
  updateDriver,
  validateDriverWithAi,
} from "@/lib/services/drivers.service";
import type { AdjustSubscriptionBody, DriverFormFiles, DriverFormValues } from "@/types/driver";
import { driverKeys } from "./query-keys";

// ── Reads ───────────────────────────────────────────────────────────────────

export function useDrivers(status: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: driverKeys.list(status), queryFn: () => listDrivers(status), enabled: !!user });
}

export function usePendingDrivers() {
  const { user } = useAuth();
  return useQuery({ queryKey: driverKeys.pending, queryFn: listPendingDrivers, enabled: !!user });
}

const LIVE_DRIVER_POLL_MS = 5_000;

/**
 * One driver. `live` keeps it fresh while it is on screen, for a signup the WhatsApp bot is still
 * filling in (documents and details arrive after the page loaded): "incomplete" polls only while
 * the signup is unfinished, "always" polls whatever the status. Leave it off while the data feeds
 * an edit form — a refresh underneath a half-typed edit would shift what counts as changed.
 */
export function useDriverDetail(id: string, options: { live?: "incomplete" | "always" | false } = {}) {
  const { user } = useAuth();
  const { live = false } = options;
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => getDriver(id),
    enabled: !!user,
    refetchInterval: (query) => {
      if (!live) return false;
      return live === "always" || query.state.data?.driver.status === "incomplete" ? LIVE_DRIVER_POLL_MS : false;
    },
  });
}

/** The provinces, named as the driver app saves them. */
export function useProvinces() {
  return useQuery({ queryKey: driverKeys.provinces, queryFn: () => loadProvinces(apiGet), staleTime: 60 * 60_000 });
}

/** The districts of the province picked in the driver form. */
export function useProvinceDistricts(province: string) {
  return useQuery({
    queryKey: driverKeys.provinceDistricts(province),
    queryFn: () => loadProvinceDistricts(apiGet, province),
    enabled: province !== "",
    staleTime: 60 * 60_000,
  });
}

/** Towns matching what was typed in the city search, from every district. Waits for two letters. */
export function useAreaSearch(text: string) {
  const wanted = text.trim();
  return useQuery({
    queryKey: driverKeys.areaSearch(wanted),
    queryFn: () => searchAreas(apiGet, wanted),
    enabled: wanted.length >= 2,
    staleTime: 60 * 60_000,
  });
}

/** The cities of the district picked in the driver form — the list the driver app registers with. */
export function useDistrictCities(province: string, district: string) {
  return useQuery({
    queryKey: driverKeys.districtCities(province, district),
    queryFn: () => loadDistrictCities(apiGet, province, district),
    enabled: province !== "" && district !== "",
    // Reference data: it doesn't change while a form is open.
    staleTime: 60 * 60_000,
  });
}

export function useVehicleTypes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverKeys.vehicleTypes,
    queryFn: listVehicleTypes,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

/** Makes are scoped to the chosen vehicle type; nothing is fetched until one is picked. */
export function useVehicleMakes(vehicleTypeId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverKeys.vehicleMakes(vehicleTypeId),
    queryFn: () => listVehicleMakes(vehicleTypeId),
    enabled: !!user && !!vehicleTypeId,
    staleTime: 5 * 60_000,
  });
}

/** Models are scoped to the (type, make) pair — one make offers different models per type. */
export function useVehicleModels(vehicleTypeId: string, vehicleMakeId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverKeys.vehicleModels(vehicleTypeId, vehicleMakeId),
    queryFn: () => listVehicleModels(vehicleTypeId, vehicleMakeId),
    enabled: !!user && !!vehicleTypeId && !!vehicleMakeId,
    staleTime: 5 * 60_000,
  });
}

export function useDriverSubscription(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverKeys.subscription(id),
    queryFn: () => getDriverSubscription(id),
    enabled: !!user,
  });
}

/** Loaded on its own so the rest of the page never depends on it; `data` is null when never reported. */
export function useDriverDevicePermissions(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverKeys.devicePermissions(id),
    queryFn: () => getDriverDevicePermissions(id),
    enabled: !!user,
    retry: false,
  });
}

export function useDriverTermsStatus(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: driverKeys.termsStatus(id),
    queryFn: () => getDriverTermsStatus(id),
    enabled: !!user,
    retry: false,
  });
}

// ── Changes ─────────────────────────────────────────────────────────────────
// Every one refreshes all driver data (lists, detail, pending queue) and shows the backend's
// message if it refuses; the caller can still await mutateAsync to react to the result.

function useDriverMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  successMessage?: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driverKeys.all });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export const useApproveDriver = () => useDriverMutation((id: number) => approveDriver(id), "Driver approved");

export const useRejectDriver = () =>
  useDriverMutation(({ id, reason }: { id: number; reason: string }) => rejectDriver(id, reason), "Driver rejected");

export const useSuspendDriver = () => useDriverMutation((id: number) => suspendDriver(id), "Driver suspended");

export const useRestoreDriver = () =>
  useDriverMutation((id: number) => restoreDriver(id), "Driver restored to Pending");

export const useValidateDriverWithAi = () => useDriverMutation((id: string) => validateDriverWithAi(id));

export const useRemoveDriverDocument = () =>
  useDriverMutation(
    ({ id, slot }: { id: string; slot: string }) => removeDriverDocument(id, slot),
    "Document removed — the driver must re-upload it",
  );

export const useDeleteDriverPermanently = () =>
  useDriverMutation((id: string) => deleteDriverPermanently(id), "Driver permanently deleted");

export const useCreateDriver = () =>
  useDriverMutation(({ values, files }: { values: DriverFormValues; files: DriverFormFiles }) =>
    createDriver(values, files),
  );

export const useCreateDriverDraft = () =>
  useDriverMutation(
    ({ values, files }: { values: DriverFormValues; files: DriverFormFiles }) => createDriverDraft(values, files),
    "Draft saved — finish it from the driver's details",
  );

export const useUpdateDriver = () =>
  useDriverMutation(
    // Only the fields an edit changed — see changedDriverFields.
    ({ id, values, files }: { id: string; values: Partial<DriverFormValues>; files: DriverFormFiles }) =>
      updateDriver(id, values, files),
    "Driver updated",
  );

export const useAdjustDriverSubscription = () =>
  useDriverMutation(
    ({ id, body }: { id: string; body: AdjustSubscriptionBody }) => adjustDriverSubscription(id, body),
    "Subscription updated",
  );
