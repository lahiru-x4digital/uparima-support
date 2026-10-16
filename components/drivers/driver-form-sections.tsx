"use client";

import type { ReactNode } from "react";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { FieldProblems } from "@/lib/driver-form-rules";
import { useVehicleMakes, useVehicleModels, useVehicleTypes } from "@/lib/hooks/use-drivers";
import { cn } from "@/lib/utils";
import {
  capitalizeModelName,
  NEW_VEHICLE_MODEL_PREFIX,
  newVehicleModelName,
  type DriverDocumentKey,
  type DriverFormFiles,
  type DriverFormValues,
} from "@/types/driver";
import { DriverLocationFields } from "./driver-location-fields";
import { NameWordPicker } from "./name-word-picker";
import { UploadTile } from "./driver-upload-tile";

const CURRENT_YEAR = new Date().getFullYear();
const VEHICLE_YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR - i));

/** Everything a section needs from the form that owns the state. */
export type SectionProps = {
  mode: "create" | "edit";
  values: DriverFormValues;
  set: <K extends keyof DriverFormValues>(key: K, value: DriverFormValues[K]) => void;
  patch: (fields: Partial<DriverFormValues>) => void;
  files: DriverFormFiles;
  setFile: (key: DriverDocumentKey, file: File) => void;
  existingDocs: Partial<Record<DriverDocumentKey, string>>;
  onPreview: (label: string, url: string) => void;
  applyExtracted: (fields: Partial<DriverFormValues>) => void;
  problems: FieldProblems;
  // The edit form shows each document beside the fields it proves; the create wizard collects
  // the paperwork up front in its Documents step instead.
  withDocuments: boolean;
};

/** A field's own error, right under it — never somewhere the agent has to scroll to. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="block text-xs text-destructive">
      {message}
    </span>
  );
}

function Req({ children }: { children: ReactNode }) {
  return (
    <>
      {children} <span className="text-destructive">*</span>
    </>
  );
}

function TextField({
  p,
  field,
  label,
  required,
  placeholder,
  type,
  maxLength,
  disabled,
  hint,
  transform,
}: {
  p: SectionProps;
  field: keyof DriverFormValues;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
  hint?: string;
  transform?: (value: string) => string;
}) {
  const problem = p.problems[field];
  return (
    <Field label={required ? <Req>{label}</Req> : label} hint={hint}>
      <Input
        name={field}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        value={String(p.values[field] ?? "")}
        aria-invalid={!!problem || undefined}
        onChange={(e) => p.set(field, (transform ? transform(e.target.value) : e.target.value) as never)}
      />
      <FieldError message={problem} />
    </Field>
  );
}

function SwitchRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 select-none">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

const grid = "grid gap-3 sm:grid-cols-2";

function tile(p: SectionProps, slot: DriverDocumentKey, label: string, description: string, extract = true) {
  return (
    <UploadTile
      key={slot}
      label={label}
      description={description}
      file={p.files[slot]}
      existingUrl={p.existingDocs[slot]}
      onChange={(f) => p.setFile(slot, f)}
      onPreview={p.onPreview}
      extractSlot={slot}
      isTemporaryLicense={p.values.isTemporaryLicense}
      onConfirmFields={extract ? p.applyExtracted : undefined}
      currentValues={p.values}
    />
  );
}

export function TemporaryLicenceSwitch(p: SectionProps) {
  return (
    <SwitchRow
      checked={p.values.isTemporaryLicense}
      onChange={(v) => p.set("isTemporaryLicense", v)}
      label="Temporary Driving Licence (Section 126(4))"
      description="Only the DMT's temporary permit so far — the printed card is still being processed."
    />
  );
}

/** The four paperwork tiles the create wizard asks for first; the edit form spreads them over their sections. */
export function DocumentsStep(p: SectionProps) {
  const temp = p.values.isTemporaryLicense;
  return (
    <div className="space-y-3">
      <TemporaryLicenceSwitch {...p} />
      <div className={grid}>
        {tile(p, "licenseFront", temp ? "Temporary Licence Document" : "Licence Front", temp ? "Photo of the certificate" : "Front of the driving licence")}
        {tile(p, "licenseBack", temp ? "Other Side (Optional)" : "Licence Back", temp ? "Only if folded with content on both sides" : "Back of the driving licence")}
        {tile(p, "insuranceCardFront", "Insurance Card (Front)", "Front of the insurance card")}
        {tile(p, "revenueLicenseImage", "Revenue Licence", "Photo of the revenue licence")}
      </div>
      <p className="text-xs text-muted-foreground">Optional. A clear photo fills in the matching fields for you.</p>
    </div>
  );
}

export function PersonalSection(p: SectionProps) {
  const edit = p.mode === "edit";
  return (
    <div className={grid}>
      <TextField p={p} field="firstName" label="First name" required />
      <TextField p={p} field="lastName" label="Last name" required />
      <TextField p={p} field="nicNumber" label="NIC number" required />
      <TextField
        p={p}
        field="phone"
        label="Mobile number"
        required={!edit}
        placeholder="+94771234567"
        disabled={edit}
        hint={edit ? "Linked to the driver's account — can't be changed here." : undefined}
      />
      <TextField p={p} field="secondaryMobile" label="Secondary mobile" />
      <TextField p={p} field="email" label="Email" type="email" />
      <TextField p={p} field="referralCode" label="Referral code" />
      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium">Display name</p>
        <p className="mb-2 text-xs text-muted-foreground">What riders see instead of the full name. Pick one or more words.</p>
        <NameWordPicker
          fullName={`${p.values.firstName} ${p.values.lastName}`}
          value={p.values.preferredDisplayName}
          onChange={(v) => p.set("preferredDisplayName", v)}
        />
      </div>
      <div>{tile(p, "profilePicture", "Profile Picture", "Clear face photo", false)}</div>
    </div>
  );
}

export function AddressSection(p: SectionProps) {
  return (
    <div className={grid}>
      <TextField p={p} field="addressLine1" label="Address line 1" required />
      <TextField p={p} field="addressLine2" label="Address line 2" />
      <DriverLocationFields
        value={{ province: p.values.province, district: p.values.district, city: p.values.city }}
        onChange={(patch) => p.patch(patch)}
      />
    </div>
  );
}

export function VehicleSection(p: SectionProps & { withOwnership: boolean }) {
  const { values } = p;
  // Makes are scoped to the chosen vehicle type (many-to-many); models to the (type, make) pair —
  // a make like Honda offers different models under Car vs. Bike.
  const vehicleTypes = useVehicleTypes().data ?? [];
  const vehicleMakes = useVehicleMakes(values.vehicleTypeId).data ?? [];
  const vehicleModels = useVehicleModels(values.vehicleTypeId, values.vehicleMakeId).data ?? [];
  const modelOptions = vehicleModels.map((m) => ({ value: String(m.id), label: m.name }));
  const modelLabel =
    newVehicleModelName(values.vehicleModelId) ??
    modelOptions.find((o) => o.value === values.vehicleModelId)?.label ??
    "";

  const select = (
    field: "vehicleTypeId" | "vehicleMakeId" | "vehicleYom",
    label: string,
    placeholder: string,
    options: { value: string; label: string }[],
    onChange: (value: string) => void,
    disabled?: boolean,
  ) => (
    <Field label={<Req>{label}</Req>}>
      <NativeSelect
        name={field}
        value={values[field]}
        disabled={disabled}
        aria-invalid={!!p.problems[field] || undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
      <FieldError message={p.problems[field]} />
    </Field>
  );

  return (
    <div className={grid}>
      {select(
        "vehicleTypeId",
        "Vehicle type",
        "Select vehicle type…",
        vehicleTypes.map((t) => ({ value: String(t.id), label: t.name })),
        (v) => p.patch({ vehicleTypeId: v, vehicleMakeId: "", vehicleModelId: "" }),
      )}
      {select(
        "vehicleMakeId",
        "Make",
        values.vehicleTypeId ? "Select make…" : "Pick a vehicle type first",
        vehicleMakes.map((m) => ({ value: String(m.id), label: m.name })),
        (v) => p.patch({ vehicleMakeId: v, vehicleModelId: "" }),
        !values.vehicleTypeId,
      )}
      {/* Pick a listed model or type a new one — saved under this type + make (see NEW_VEHICLE_MODEL_PREFIX). */}
      <Field label={<Req>Model</Req>}>
        <CreatableCombobox
          name="vehicleModelId"
          value={values.vehicleModelId}
          selectedLabel={modelLabel}
          options={modelOptions}
          onChange={(v) => p.set("vehicleModelId", v)}
          onCreate={(name) => NEW_VEHICLE_MODEL_PREFIX + name}
          formatNew={capitalizeModelName}
          placeholder={values.vehicleMakeId ? "Type or pick a model…" : "Pick a make first"}
          disabled={!values.vehicleMakeId}
          invalid={!!p.problems.vehicleModelId}
        />
        <FieldError message={p.problems.vehicleModelId} />
      </Field>
      {select(
        "vehicleYom",
        "Year",
        "Select year…",
        VEHICLE_YEARS.map((y) => ({ value: y, label: y })),
        (v) => p.set("vehicleYom", v),
      )}
      <TextField p={p} field="vehicleColor" label="Colour" required />
      <TextField p={p} field="vehicleRegistrationNumber" label="Registration number" required placeholder="CAB-1234" />
      {p.withOwnership && (
        <div className="sm:col-span-2">
          <SwitchRow
            checked={values.ownsVehicle}
            onChange={(v) => p.set("ownsVehicle", v)}
            label="Driver owns the vehicle"
          />
        </div>
      )}
      <div>{tile(p, "vehicleFront", "Vehicle Front", "Number plate visible")}</div>
    </div>
  );
}

export function LicenceSection(p: SectionProps) {
  const temp = p.values.isTemporaryLicense;
  return (
    <div className="space-y-3">
      {p.withDocuments && <TemporaryLicenceSwitch {...p} />}
      <div className={grid}>
        <TextField
          p={p}
          field="licenseNumber"
          label={temp ? "Permit / certificate no." : "Licence number"}
          required
          placeholder={temp ? "C328761" : "B1234567"}
        />
        <TextField p={p} field="licenseExpiryDate" label={temp ? "Valid until" : "Expiry date"} required type="date" />
        {p.withDocuments && (
          <>
            {tile(p, "licenseFront", temp ? "Temporary Licence Document" : "Licence Front", temp ? "Photo of the certificate" : "Front of the driving licence")}
            {tile(p, "licenseBack", temp ? "Other Side (Optional)" : "Licence Back", temp ? "Only if folded with content on both sides" : "Back of the driving licence")}
          </>
        )}
      </div>
    </div>
  );
}

export function InsuranceSection(p: SectionProps) {
  return (
    <div className={grid}>
      <TextField p={p} field="insurancePolicyNumber" label="Policy number" required />
      <TextField p={p} field="insuranceExpiryDate" label="Expiry date" required type="date" />
      {p.withDocuments && tile(p, "insuranceCardFront", "Insurance Card (Front)", "Front of the insurance card")}
    </div>
  );
}

export function RevenueSection(p: SectionProps) {
  return (
    <div className={grid}>
      <TextField p={p} field="revenueLicenseExpiryDate" label="Expiry date" required type="date" />
      {p.withDocuments ? tile(p, "revenueLicenseImage", "Revenue Licence", "Photo of the revenue licence") : <div />}
    </div>
  );
}

export function BankSection(p: SectionProps & { hadBankAccount: boolean }) {
  const started = [p.values.bankName, p.values.bankAccountName, p.values.bankAccountNumber, p.values.bankBranch].some(
    (v) => v.trim() !== "",
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Optional payout account — bank, holder and number go together.
        {p.hadBankAccount && !started && " Leaving these empty keeps the account on file."}
      </p>
      <div className={grid}>
        <TextField p={p} field="bankName" label="Bank name" required={started} placeholder="Commercial Bank" maxLength={150} />
        <TextField p={p} field="bankBranch" label="Branch" maxLength={150} />
        <TextField p={p} field="bankAccountName" label="Account holder" required={started} maxLength={150} />
        <TextField p={p} field="bankAccountNumber" label="Account number" required={started} maxLength={50} />
      </div>
    </div>
  );
}

/** Small coloured dot for a section's state in the nav / step pills. */
export function StateDot({ state }: { state: "error" | "missing" | "changed" | "done" | null }) {
  if (!state) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        state === "error" && "bg-destructive",
        state === "missing" && "bg-amber-500",
        state === "changed" && "bg-primary",
        state === "done" && "bg-emerald-500",
      )}
    />
  );
}
