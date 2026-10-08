import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  AdjustSubscriptionBody,
  AiValidationResult,
  Driver,
  DriverDetail,
  DriverDevicePermissions,
  DriverFormFiles,
  DriverFormValues,
  DriverSubscriptionInfo,
  DriverTermsStatus,
  DocumentExtractionResult,
  VehicleLookup,
} from "@/types/driver";

// Driver management — the backend's `/support-desk/drivers/*`, which wraps the
// classified dashboard's admin driver endpoints. Each route is gated by its own
// permission (driver.view, driver.update, driver.approve, ...).

const BASE = "/support-desk/drivers";

// Multipart: the browser must set the boundary, so the client's JSON default
// content type is cleared for these calls.
const MULTIPART = { headers: { "Content-Type": undefined } } as const;

function buildFormData(values: Partial<DriverFormValues>, files: DriverFormFiles): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    fd.append(key, String(value));
  }
  for (const [key, file] of Object.entries(files)) {
    if (file) fd.append(key, file);
  }
  return fd;
}

// ── Lists & lookups ─────────────────────────────────────────────────────────

/** Every driver matching `status` ("all" for none). Unpaginated. */
export const listDrivers = (status?: string) =>
  apiGet<Driver[]>(BASE, { params: status && status !== "all" ? { status } : undefined });

export const listPendingDrivers = () => apiGet<Driver[]>(`${BASE}/pending`);

export const listVehicleTypes = () => apiGet<VehicleLookup[]>(`${BASE}/vehicle-types`);

export const listVehicleMakes = (vehicleTypeId?: string) =>
  apiGet<VehicleLookup[]>(`${BASE}/vehicle-makes`, {
    params: vehicleTypeId ? { vehicleTypeId } : undefined,
  });

export const listVehicleModels = (vehicleTypeId?: string, vehicleMakeId?: string) =>
  apiGet<VehicleLookup[]>(`${BASE}/vehicle-models`, {
    params: vehicleTypeId && vehicleMakeId ? { vehicleTypeId, vehicleMakeId } : undefined,
  });

// ── One driver ──────────────────────────────────────────────────────────────

export const getDriver = (id: number | string) => apiGet<DriverDetail>(`${BASE}/${id}`);

export const getDriverSubscription = (id: number | string) =>
  apiGet<DriverSubscriptionInfo>(`${BASE}/${id}/subscription`);

export const adjustDriverSubscription = (id: number | string, body: AdjustSubscriptionBody) =>
  apiPatch<DriverSubscriptionInfo>(`${BASE}/${id}/subscription`, body);

/** Null for a driver whose app has never reported. */
export const getDriverDevicePermissions = (id: number | string) =>
  apiGet<DriverDevicePermissions | null>(`${BASE}/${id}/device-permissions`);

export const getDriverTermsStatus = (id: number | string) =>
  apiGet<DriverTermsStatus>(`${BASE}/${id}/terms-status`);

// ── Register & edit ─────────────────────────────────────────────────────────

export const createDriver = (values: DriverFormValues, files: DriverFormFiles) =>
  apiPost<Driver>(BASE, buildFormData(values, files), MULTIPART);

export function updateDriver(id: number | string, values: Partial<DriverFormValues>, files: DriverFormFiles) {
  // The phone is the account's login — the backend refuses to change it here,
  // and rejects the whole request for an unknown field.
  const editable = { ...values };
  delete editable.phone;
  return apiPatch<Driver>(`${BASE}/${id}`, buildFormData(editable, files), MULTIPART);
}

/** Live per-document AI extraction for the form's upload tiles; no driver needed yet. */
export function extractDriverDocument(slot: string, file: File, isTemporaryLicense?: boolean) {
  const fd = new FormData();
  fd.append("slot", slot);
  if (isTemporaryLicense) fd.append("isTemporaryLicense", "true");
  fd.append("document", file);
  return apiPost<DocumentExtractionResult>(`${BASE}/documents/extract`, fd, MULTIPART);
}

export function extractDriverProfilePicture(file: File) {
  const fd = new FormData();
  fd.append("photo", file);
  return apiPost<DocumentExtractionResult>(`${BASE}/profile-picture/extract`, fd, MULTIPART);
}

// ── Review & status ─────────────────────────────────────────────────────────

export const validateDriverWithAi = (id: number | string) =>
  apiPost<AiValidationResult>(`${BASE}/${id}/ai-validate`);

export const approveDriver = (id: number | string) => apiPost<void>(`${BASE}/${id}/approve`);

export const rejectDriver = (id: number | string, reason: string) =>
  apiPost<void>(`${BASE}/${id}/reject`, { reason });

export const suspendDriver = (id: number | string) => apiPost<void>(`${BASE}/${id}/suspend`);

/** A self-deleted driver goes back to Pending, so they are reviewed and approved again. */
export const restoreDriver = (id: number | string) => apiPost<void>(`${BASE}/${id}/restore`);

/**
 * Pulls a wrong document off the driver's record and forces them through the app's fix-it flow
 * before they can go online again. Doesn't delete the underlying file.
 */
export const removeDriverDocument = (id: number | string, slot: string) =>
  apiDelete<void>(`${BASE}/${id}/documents/${slot}`);

/**
 * Emergency, irreversible removal of the driver and all their rides-side data (the shared user
 * account and riders' ride history are kept). Refused while the driver has a ride in progress.
 */
export const deleteDriverPermanently = (id: number | string) =>
  apiDelete<{ driverId: number; affected: Record<string, number> }>(`${BASE}/${id}`);
