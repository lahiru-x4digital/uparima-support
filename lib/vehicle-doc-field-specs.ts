import type { DriverDocumentKey, DriverFormValues } from "@/types/driver";

export type DocFieldSpec = {
  key: keyof DriverFormValues;
  label: string;
  isDate?: boolean;
};

// Which fields to show in the confirm-extraction modal per document slot —
// mirrors the mobile driver app's slotFieldSpecs (document_capture_widgets.dart)
// almost verbatim. Keys match DocumentExtractionResult.fields' keys exactly
// (the backend deliberately names extraction fields after RegisterDriverDto/
// CreateDriverAdminDto 1:1), so no remapping is needed to write a confirmed
// value straight into DriverFormValues.
export const DOC_FIELD_SPECS: Partial<Record<DriverDocumentKey, DocFieldSpec[]>> = {
  licenseFront: [
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "nicNumber", label: "NIC number" },
    { key: "licenseNumber", label: "License number" },
    { key: "licenseExpiryDate", label: "License expiry date", isDate: true },
    { key: "addressLine1", label: "Address" },
  ],
  // No nicNumber — it's only printed on the front (field 4c); the back has
  // no per-driver NIC field, only the category legend/table and expiry date.
  licenseBack: [{ key: "licenseExpiryDate", label: "License expiry date", isDate: true }],
  insuranceCardFront: [
    { key: "insurancePolicyNumber", label: "Insurance policy number" },
    { key: "insuranceExpiryDate", label: "Insurance expiry date", isDate: true },
    { key: "vehicleRegistrationNumber", label: "Vehicle registration number" },
  ],
  revenueLicenseImage: [
    { key: "vehicleRegistrationNumber", label: "Vehicle registration number" },
    { key: "revenueLicenseExpiryDate", label: "Revenue license expiry date", isDate: true },
  ],
  // vehicleType is also returned by the AI but is informational only here —
  // vehicleTypeId is a dropdown selection, not a free-text field to overwrite.
  vehicleFront: [
    { key: "vehicleRegistrationNumber", label: "Vehicle registration number" },
    { key: "vehicleColor", label: "Vehicle color" },
  ],
  // profilePicture: no OCR fields — checkProfilePhoto only returns
  // readable/issues, so it has no entry here (the confirm modal never opens
  // for it, see driver-form.tsx).
};
