"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { licenseNumberProblem, normalizeLicenseNumber } from "@/lib/driver-form-rules";
import { useVehicleMakes, useVehicleModels, useVehicleTypes } from "@/lib/hooks/use-drivers";
import { SRI_LANKA_DISTRICTS_BY_PROVINCE, SRI_LANKA_PROVINCES } from "@/lib/sri-lanka-locations";
import { extractDriverDocument, extractDriverProfilePicture } from "@/lib/services/drivers.service";
import { DOC_FIELD_SPECS } from "@/lib/vehicle-doc-field-specs";
import { cn } from "@/lib/utils";
import {
  EMPTY_DRIVER_FORM,
  type DriverDocumentKey,
  type DriverFormFiles,
  type DriverFormValues,
} from "@/types/driver";
import { DocumentPreviewModal } from "./document-preview-modal";
import { NameWordPicker } from "./name-word-picker";

const CURRENT_YEAR = new Date().getFullYear();
const VEHICLE_YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR - i));

type Step = {
  key: string;
  title: string;
  // Heading of the step's main card when it differs from the tab's title.
  cardTitle?: string;
  fields: (keyof DriverFormValues)[];
};

const STEPS: Step[] = [
  // Documents come first, mirroring the driver app's registration flow: the paperwork is
  // photographed before typing any of the fields those photos can autofill. No required fields
  // here — this stays assistive, a driver can still be created with zero photos and everything
  // typed by hand.
  { key: "documents", title: "Documents", fields: [] },
  { key: "personal", title: "Personal Information", fields: ["phone", "firstName", "lastName", "nicNumber"] },
  { key: "address", title: "Address Details", fields: ["addressLine1", "province", "district", "city"] },
  {
    key: "vehicle",
    title: "Vehicle Information",
    fields: ["vehicleTypeId", "vehicleMakeId", "vehicleModelId", "vehicleYom", "vehicleColor", "vehicleRegistrationNumber"],
  },
  { key: "license", title: "Driving License Details", fields: ["licenseNumber", "licenseExpiryDate"] },
  { key: "insurance", title: "Insurance Details", fields: ["insurancePolicyNumber", "insuranceExpiryDate"] },
  { key: "revenue", title: "Vehicle Revenue License", fields: ["revenueLicenseExpiryDate"] },
  { key: "ownership", title: "Ownership & Bank Details", cardTitle: "Vehicle Ownership", fields: [] },
];

const SECTION_LABEL = "mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground";

function SwitchRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium select-none">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function UploadTile({
  label,
  description,
  file,
  existingUrl,
  onChange,
  onPreview,
  extractSlot,
  isTemporaryLicense,
  onConfirmFields,
}: {
  label: string;
  description: string;
  file?: File;
  existingUrl?: string;
  onChange: (file: File) => void;
  onPreview: (label: string, url: string) => void;
  // When set, a picked file is immediately run through the same live AI extraction the driver app
  // uses — assistive only: fields can still be filled by hand whatever (or whether) this returns.
  extractSlot?: DriverDocumentKey;
  isTemporaryLicense?: boolean;
  onConfirmFields?: (fields: Partial<DriverFormValues>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Local preview of the picked file. Created when it is picked (not in an effect) and revoked when
  // replaced or when the tile goes away.
  const objectUrlRef = useRef<string | undefined>(undefined);
  const [objectUrl, setObjectUrl] = useState<string | undefined>();
  const [extracting, setExtracting] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [pendingFields, setPendingFields] = useState<Record<string, string> | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  async function handlePicked(picked: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(picked);
    setObjectUrl(objectUrlRef.current);
    onChange(picked);
    setIssues([]);
    setPendingFields(null);
    if (!extractSlot) return;

    setExtracting(true);
    try {
      const result =
        extractSlot === "profilePicture"
          ? await extractDriverProfilePicture(picked)
          : await extractDriverDocument(extractSlot, picked, isTemporaryLicense);
      if (!result.readable) {
        setIssues(result.issues.length > 0 ? result.issues : ["Photo unclear — consider retaking it."]);
        return;
      }
      const extracted: Record<string, string> = {};
      for (const spec of DOC_FIELD_SPECS[extractSlot] ?? []) {
        const value = result.fields[spec.key];
        if (value != null && value !== "") extracted[spec.key] = value;
      }
      if (Object.keys(extracted).length > 0) setPendingFields(extracted);
    } catch (e) {
      // Assistive only — a failed live check (network / AI trouble) never blocks attaching the
      // file or filling fields in by hand.
      setIssues([getErrorMessage(e) || "Extraction failed — you can still fill in the details manually."]);
    } finally {
      setExtracting(false);
    }
  }

  const previewUrl = objectUrl ?? existingUrl;
  return (
    <div className="relative">
      <button
        type="button"
        disabled={extracting}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center gap-2.5 rounded-lg border border-dashed p-5 text-center transition-colors hover:border-ring hover:bg-accent",
          file && "border-amber-400 bg-amber-50 dark:bg-amber-500/10",
          extracting && "opacity-60",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={label} className="h-20 w-full rounded-md object-cover" />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-md bg-muted">
            <Upload className="size-4 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {extracting
              ? "Reading document…"
              : file
                ? file.name
                : existingUrl
                  ? "Uploaded — click to replace"
                  : description}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={label}
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void handlePicked(picked);
          }}
        />
      </button>
      {previewUrl && (
        <button
          type="button"
          aria-label={`Preview ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onPreview(label, previewUrl);
          }}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow hover:text-foreground"
        >
          <Eye className="size-3.5" />
        </button>
      )}
      {issues.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {issues.map((issue, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              {issue}
            </p>
          ))}
        </div>
      )}

      <Modal
        open={!!pendingFields}
        onClose={() => setPendingFields(null)}
        title={`Confirm details — ${label}`}
        className="sm:max-w-md"
      >
        {pendingFields && extractSlot && (
          <DocConfirmFields
            slot={extractSlot}
            fields={pendingFields}
            onSkip={() => setPendingFields(null)}
            onConfirm={(edited) => {
              onConfirmFields?.(edited as Partial<DriverFormValues>);
              setPendingFields(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// Editable review step for a slot's extracted fields: the agent just explicitly reviewed these, so
// confirming overwrites unconditionally (same contract as the driver app's confirm sheet). Only
// entries the AI actually returned a value for are shown.
function DocConfirmFields({
  slot,
  fields,
  onConfirm,
  onSkip,
}: {
  slot: DriverDocumentKey;
  fields: Record<string, string>;
  onConfirm: (fields: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const spec = (DOC_FIELD_SPECS[slot] ?? []).filter((f) => fields[f.key] !== undefined);
  const [edited, setEdited] = useState(fields);

  return (
    <div className="space-y-3">
      {spec.map((f) => (
        <Field key={f.key} label={f.label}>
          <Input
            type={f.isDate ? "date" : "text"}
            value={edited[f.key] ?? ""}
            onChange={(e) => setEdited((p) => ({ ...p, [f.key]: e.target.value }))}
          />
        </Field>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onSkip}>
          Skip
        </Button>
        <Button type="button" onClick={() => onConfirm(edited)}>
          Use these details
        </Button>
      </div>
    </div>
  );
}

/**
 * The add / edit driver wizard. `onSubmit` throws to show an error under the steps; the form stays
 * on screen so nothing typed is lost.
 */
export function DriverForm({
  mode,
  initialValues,
  existingDocs = {},
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initialValues?: DriverFormValues;
  existingDocs?: Partial<Record<DriverDocumentKey, string>>;
  onSubmit: (values: DriverFormValues, files: DriverFormFiles) => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<DriverFormValues>(initialValues ?? EMPTY_DRIVER_FORM);
  const [files, setFiles] = useState<DriverFormFiles>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);

  // Makes are scoped to the chosen vehicle type (many-to-many); models to the (type, make) pair —
  // a make like Honda offers different models under Car vs. Bike. Both refetch as their parent
  // changes, and stay disabled until it is chosen (like Province / District).
  const vehicleTypes = useVehicleTypes().data ?? [];
  const vehicleMakes = useVehicleMakes(values.vehicleTypeId).data ?? [];
  const vehicleModels = useVehicleModels(values.vehicleTypeId, values.vehicleMakeId).data ?? [];

  const districts = useMemo(
    () => (values.province ? (SRI_LANKA_DISTRICTS_BY_PROVINCE[values.province] ?? []) : []),
    [values.province],
  );

  function set<K extends keyof DriverFormValues>(key: K, val: DriverFormValues[K]) {
    setValues((p) => ({ ...p, [key]: val }));
  }

  function setFile(key: DriverDocumentKey, file: File) {
    setFiles((p) => ({ ...p, [key]: file }));
  }

  // Confirming a document's extracted fields overwrites unconditionally.
  function applyExtractedFields(fields: Partial<DriverFormValues>) {
    setValues((p) => ({
      ...p,
      ...fields,
      // Read off a photo, so tidy it the same way as a typed one.
      ...(fields.licenseNumber !== undefined
        ? { licenseNumber: normalizeLicenseNumber(fields.licenseNumber, p.isTemporaryLicense) }
        : {}),
    }));
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  // Bank details are optional but never half-filled: bank, holder and number go together (the
  // backend refuses a partial account too). All empty leaves the driver's account as it is.
  const bankStarted = [values.bankName, values.bankAccountName, values.bankAccountNumber, values.bankBranch].some(
    (v) => v.trim() !== "",
  );
  const bankValid =
    !bankStarted || [values.bankName, values.bankAccountName, values.bankAccountNumber].every((v) => v.trim() !== "");
  const hadBankAccount = mode === "edit" && (initialValues?.bankAccountNumber ?? "") !== "";

  // The licence number is only judged when this edit touched it (or its kind). One already on
  // file in an older format is left alone — and not sent — so it can't block an unrelated save.
  const licenseTouched =
    mode === "create" ||
    values.licenseNumber !== initialValues?.licenseNumber ||
    values.isTemporaryLicense !== initialValues?.isTemporaryLicense;
  const licenseProblem = licenseTouched
    ? licenseNumberProblem(values.licenseNumber, values.isTemporaryLicense)
    : null;

  const stepValid =
    current.fields.every((f) => String(values[f] ?? "").trim() !== "") &&
    (current.key !== "ownership" || bankValid) &&
    (current.key !== "license" || !licenseProblem);
  const allValid = STEPS.every((s) => s.fields.every((f) => String(values[f] ?? "").trim() !== "")) && bankValid;

  async function submit() {
    // Steps can be opened in any order, so the last one can be reached without passing this check.
    if (licenseProblem) {
      setError(licenseProblem);
      setStep(STEPS.findIndex((s) => s.key === "license"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values, files);
    } catch (e) {
      setError(getErrorMessage(e) || "Failed to save driver");
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    if (!stepValid) return;
    if (isLast) {
      await submit();
      return;
    }
    setStep((s) => s + 1);
  }

  const submitLabel = busy ? "Saving…" : mode === "create" ? "Create Driver" : "Save Changes";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(i)}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="space-y-4">
          <p className={SECTION_LABEL}>{current.cardTitle ?? current.title}</p>

          {current.key === "ownership" && (
            <div className="space-y-2">
              <p className="text-sm">Do you own the vehicle?</p>
              <SwitchRow
                checked={values.ownsVehicle}
                onChange={(v) => set("ownsVehicle", v)}
                label={values.ownsVehicle ? "Yes" : "No"}
              />
            </div>
          )}

          {current.key === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <div>
                  <p className="text-sm font-medium">Temporary Driving Licence (Section 126(4))</p>
                  <p className="text-xs text-muted-foreground">
                    Turn this on if the driver only has the Department of Motor Traffic&apos;s temporary permit so
                    far, while their printed card is still being processed.
                  </p>
                </div>
                <Switch
                  checked={values.isTemporaryLicense}
                  onCheckedChange={(v) => set("isTemporaryLicense", v)}
                  aria-label="Temporary driving licence"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <UploadTile
                  label={values.isTemporaryLicense ? "Temporary Licence Document" : "License Front Image"}
                  description={
                    values.isTemporaryLicense ? "Photo of the temporary licence certificate" : "Front side of driving license"
                  }
                  file={files.licenseFront}
                  existingUrl={existingDocs.licenseFront}
                  onChange={(f) => setFile("licenseFront", f)}
                  onPreview={(l, u) => setPreview({ label: l, url: u })}
                  extractSlot="licenseFront"
                  isTemporaryLicense={values.isTemporaryLicense}
                  onConfirmFields={applyExtractedFields}
                />
                <UploadTile
                  label={values.isTemporaryLicense ? "Back / Other Side (Optional)" : "License Back Image"}
                  description={
                    values.isTemporaryLicense
                      ? "Only if the driver's copy is folded/laminated with content on both sides"
                      : "Back side of driving license"
                  }
                  file={files.licenseBack}
                  existingUrl={existingDocs.licenseBack}
                  onChange={(f) => setFile("licenseBack", f)}
                  onPreview={(l, u) => setPreview({ label: l, url: u })}
                  extractSlot="licenseBack"
                  isTemporaryLicense={values.isTemporaryLicense}
                  onConfirmFields={applyExtractedFields}
                />
                <UploadTile
                  label="Insurance Card (Front)"
                  description="Front side of insurance card"
                  file={files.insuranceCardFront}
                  existingUrl={existingDocs.insuranceCardFront}
                  onChange={(f) => setFile("insuranceCardFront", f)}
                  onPreview={(l, u) => setPreview({ label: l, url: u })}
                  extractSlot="insuranceCardFront"
                  onConfirmFields={applyExtractedFields}
                />
                <UploadTile
                  label="Vehicle Revenue License Image"
                  description="Photo of the revenue license"
                  file={files.revenueLicenseImage}
                  existingUrl={existingDocs.revenueLicenseImage}
                  onChange={(f) => setFile("revenueLicenseImage", f)}
                  onPreview={(l, u) => setPreview({ label: l, url: u })}
                  extractSlot="revenueLicenseImage"
                  onConfirmFields={applyExtractedFields}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional here — Profile Picture and Vehicle Front are captured on their own steps below. Uploading a
                clear photo auto-fills the matching fields further in this form; you can still fill everything in by
                hand instead.
              </p>
            </div>
          )}

          {current.key === "personal" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile Number *">
                <Input
                  placeholder="+94771234567"
                  value={values.phone}
                  disabled={mode === "edit"}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
              <Field label="First Name *">
                <Input value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </Field>
              <Field label="Last Name *">
                <Input value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </Field>
              <Field label="NIC Number *">
                <Input value={values.nicNumber} onChange={(e) => set("nicNumber", e.target.value)} />
              </Field>
              <Field label="Referral Code (Optional)">
                <Input value={values.referralCode} onChange={(e) => set("referralCode", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Preferred Display Name (Optional)</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Riders see this instead of the full legal name. Pick one or more words below.
                </p>
                <NameWordPicker
                  fullName={`${values.firstName} ${values.lastName}`}
                  value={values.preferredDisplayName}
                  onChange={(v) => set("preferredDisplayName", v)}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Profile Picture</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <UploadTile
                    label="Profile Picture"
                    description="Clear face photo"
                    file={files.profilePicture}
                    existingUrl={existingDocs.profilePicture}
                    onChange={(f) => setFile("profilePicture", f)}
                    onPreview={(l, u) => setPreview({ label: l, url: u })}
                    extractSlot="profilePicture"
                  />
                </div>
              </div>
            </div>
          )}

          {current.key === "address" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address Line 1 *">
                <Input value={values.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
              </Field>
              <Field label="Address Line 2 (Optional)">
                <Input value={values.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
              </Field>
              <Field label="Province *">
                <NativeSelect
                  value={values.province}
                  onChange={(e) => {
                    set("province", e.target.value);
                    set("district", "");
                  }}
                >
                  <option value="">Select province…</option>
                  {SRI_LANKA_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="District *">
                <NativeSelect
                  value={values.district}
                  onChange={(e) => set("district", e.target.value)}
                  disabled={!values.province}
                >
                  <option value="">Select district…</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="City *">
                <Input value={values.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Email Address (Optional)">
                <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Secondary Mobile Number (Optional)">
                <Input value={values.secondaryMobile} onChange={(e) => set("secondaryMobile", e.target.value)} />
              </Field>
            </div>
          )}

          {current.key === "vehicle" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vehicle Type *">
                <NativeSelect
                  value={values.vehicleTypeId}
                  onChange={(e) => {
                    set("vehicleTypeId", e.target.value);
                    set("vehicleMakeId", "");
                    set("vehicleModelId", "");
                  }}
                >
                  <option value="">Select vehicle type…</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Make (Brand) *">
                <NativeSelect
                  value={values.vehicleMakeId}
                  onChange={(e) => {
                    set("vehicleMakeId", e.target.value);
                    set("vehicleModelId", "");
                  }}
                  disabled={!values.vehicleTypeId}
                >
                  <option value="">Select make…</option>
                  {vehicleMakes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Model *">
                <NativeSelect
                  value={values.vehicleModelId}
                  onChange={(e) => set("vehicleModelId", e.target.value)}
                  disabled={!values.vehicleMakeId}
                >
                  <option value="">Select model…</option>
                  {vehicleModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Year of Manufacture *">
                <NativeSelect value={values.vehicleYom} onChange={(e) => set("vehicleYom", e.target.value)}>
                  <option value="">Select year…</option>
                  {VEHICLE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Color *">
                <Input value={values.vehicleColor} onChange={(e) => set("vehicleColor", e.target.value)} />
              </Field>
              <Field label="Registration Number *">
                <Input
                  placeholder="CAB-1234"
                  value={values.vehicleRegistrationNumber}
                  onChange={(e) => set("vehicleRegistrationNumber", e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Vehicle Photo</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <UploadTile
                    label="Vehicle Front"
                    description="Front of the vehicle, number plate visible"
                    file={files.vehicleFront}
                    existingUrl={existingDocs.vehicleFront}
                    onChange={(f) => setFile("vehicleFront", f)}
                    onPreview={(l, u) => setPreview({ label: l, url: u })}
                    extractSlot="vehicleFront"
                    onConfirmFields={applyExtractedFields}
                  />
                </div>
              </div>
            </div>
          )}

          {current.key === "license" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={values.isTemporaryLicense ? "Permit / Certificate No. *" : "License Number *"}>
                <Input
                  placeholder={values.isTemporaryLicense ? "C328761" : "B1234567"}
                  value={values.licenseNumber}
                  onChange={(e) =>
                    set("licenseNumber", normalizeLicenseNumber(e.target.value, values.isTemporaryLicense))
                  }
                  aria-invalid={!!licenseProblem || undefined}
                />
              </Field>
              <Field label={values.isTemporaryLicense ? "Valid Until *" : "Expiry Date *"}>
                <Input
                  type="date"
                  value={values.licenseExpiryDate}
                  onChange={(e) => set("licenseExpiryDate", e.target.value)}
                />
              </Field>
              {licenseProblem && <p className="text-sm text-destructive sm:col-span-2">{licenseProblem}</p>}
            </div>
          )}

          {current.key === "insurance" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Insurance Policy Number *">
                <Input
                  value={values.insurancePolicyNumber}
                  onChange={(e) => set("insurancePolicyNumber", e.target.value)}
                />
              </Field>
              <Field label="Insurance Expiry Date *">
                <Input
                  type="date"
                  value={values.insuranceExpiryDate}
                  onChange={(e) => set("insuranceExpiryDate", e.target.value)}
                />
              </Field>
            </div>
          )}

          {current.key === "revenue" && (
            <Field label="Revenue License Expiry Date *">
              <Input
                type="date"
                value={values.revenueLicenseExpiryDate}
                onChange={(e) => set("revenueLicenseExpiryDate", e.target.value)}
              />
            </Field>
          )}
        </CardContent>
      </Card>

      {current.key === "ownership" && (
        <Card>
          <CardContent className="space-y-4">
            <div>
              <p className={SECTION_LABEL}>Bank Details</p>
              <p className="text-sm text-muted-foreground">
                The driver&apos;s own bank account for payouts. Optional — but bank name, account holder and account
                number are needed together.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bankStarted ? "Bank Name *" : "Bank Name"}>
                <Input
                  placeholder="Commercial Bank"
                  maxLength={150}
                  value={values.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                />
              </Field>
              <Field label="Branch">
                <Input maxLength={150} value={values.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} />
              </Field>
              <Field label={bankStarted ? "Account Holder Name *" : "Account Holder Name"}>
                <Input
                  maxLength={150}
                  value={values.bankAccountName}
                  onChange={(e) => set("bankAccountName", e.target.value)}
                />
              </Field>
              <Field label={bankStarted ? "Account Number *" : "Account Number"}>
                <Input
                  maxLength={50}
                  value={values.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                />
              </Field>
            </div>
            {!bankValid && (
              <p className="text-sm text-destructive">
                Fill in the bank name, account holder name and account number to save these bank details.
              </p>
            )}
            {hadBankAccount && !bankStarted && (
              <p className="text-sm text-muted-foreground">
                Saving with these fields empty keeps the bank account already on file.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={isFirst ? onCancel : () => setStep((s) => s - 1)}>
          <ChevronLeft />
          {isFirst ? "Cancel" : "Back"}
        </Button>
        <Button type="button" className="flex-1" disabled={!stepValid || busy} onClick={() => void handleNext()}>
          {isLast ? submitLabel : "Next"}
          {!isLast && <ChevronRight />}
        </Button>
        {!isLast && (
          <Button type="button" variant="outline" disabled={!allValid || busy} onClick={() => void submit()}>
            {submitLabel}
          </Button>
        )}
      </div>

      <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
