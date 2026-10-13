"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import { extractDriverDocument, extractDriverProfilePicture } from "@/lib/services/drivers.service";
import { DOC_FIELD_SPECS } from "@/lib/vehicle-doc-field-specs";
import { cn } from "@/lib/utils";
import type { DriverDocumentKey, DriverFormValues } from "@/types/driver";

export function UploadTile({
  label,
  description,
  file,
  existingUrl,
  onChange,
  onPreview,
  extractSlot,
  isTemporaryLicense,
  onConfirmFields,
  currentValues,
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
  // The form's values now, so the confirm step can show what a suggestion would replace.
  currentValues?: DriverFormValues;
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
            current={currentValues}
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
// entries the AI actually returned a value for are shown, each with the value it would replace.
function DocConfirmFields({
  slot,
  fields,
  current,
  onConfirm,
  onSkip,
}: {
  slot: DriverDocumentKey;
  fields: Record<string, string>;
  current?: DriverFormValues;
  onConfirm: (fields: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const spec = (DOC_FIELD_SPECS[slot] ?? []).filter((f) => fields[f.key] !== undefined);
  const [edited, setEdited] = useState(fields);

  return (
    <div className="space-y-3">
      {spec.map((f) => {
        const was = current ? String(current[f.key as keyof DriverFormValues] ?? "") : "";
        const replaces = was !== "" && was !== edited[f.key];
        return (
          <Field
            key={f.key}
            label={f.label}
            hint={replaces ? `Currently: ${was}` : undefined}
          >
            <Input
              type={f.isDate ? "date" : "text"}
              value={edited[f.key] ?? ""}
              onChange={(e) => setEdited((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          </Field>
        );
      })}
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
