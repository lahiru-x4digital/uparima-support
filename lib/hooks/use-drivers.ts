"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  adjustDriverSubscription,
  approveDriver,
  createDriver,
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

export function useDriverDetail(id: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: driverKeys.detail(id), queryFn: () => getDriver(id), enabled: !!user });
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

export const useUpdateDriver = () =>
  useDriverMutation(
    ({ id, values, files }: { id: string; values: DriverFormValues; files: DriverFormFiles }) =>
      updateDriver(id, values, files),
    "Driver updated",
  );

export const useAdjustDriverSubscription = () =>
  useDriverMutation(
    ({ id, body }: { id: string; body: AdjustSubscriptionBody }) => adjustDriverSubscription(id, body),
    "Subscription updated",
  );
