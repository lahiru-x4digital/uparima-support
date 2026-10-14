"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/shared/kbd";
import { Modal } from "@/components/shared/modal";
import { getErrorMessage } from "@/lib/api";
import {
  DRIVER_SECTIONS,
  FIELD_LABELS,
  REQUIRED_BY_SECTION,
  bankProblems,
  editBlockingProblems,
  licenseNumberProblem,
  missingRequiredFields,
  normalizeLicenseNumber,
  sectionOfField,
  type DriverSectionKey,
  type FieldProblems,
} from "@/lib/driver-form-rules";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { cn } from "@/lib/utils";
import {
  EMPTY_DRIVER_FORM,
  type DriverDocumentKey,
  type DriverFormFiles,
  type DriverFormValues,
} from "@/types/driver";
import { DocumentPreviewModal } from "./document-preview-modal";
import {
  AddressSection,
  BankSection,
  DocumentsStep,
  InsuranceSection,
  LicenceSection,
  PersonalSection,
  RevenueSection,
  StateDot,
  VehicleSection,
  type SectionProps,
} from "./driver-form-sections";

type FormProps = {
  mode: "create" | "edit";
  initialValues?: DriverFormValues;
  existingDocs?: Partial<Record<DriverDocumentKey, string>>;
  onSubmit: (values: DriverFormValues, files: DriverFormFiles) => Promise<void>;
  onCancel: () => void;
  /** Edit only: the section to open on. Default: the first one with a required field still empty. */
  initialSection?: DriverSectionKey;
  /** Told whenever the form gains or loses unsaved changes, so the owner can guard closing. */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Create only: save what is filled in so far as an unfinished signup. Offered once the mobile
   * number and first name are in; throws to show its error like `onSubmit`.
   */
  onSaveDraft?: (values: DriverFormValues, files: DriverFormFiles) => Promise<void>;
};

/**
 * Add or edit a driver. Editing is one page of sections (same groups as the details view) with a
 * pinned Save; creating keeps the step-by-step wizard. `onSubmit` throws to show its error beside
 * Save; the form stays on screen so nothing typed is lost.
 */
export function DriverForm(props: FormProps) {
  const { mode, initialValues, existingDocs = {}, onDirtyChange } = props;
  const initial = initialValues ?? EMPTY_DRIVER_FORM;
  const [values, setValues] = useState<DriverFormValues>(initial);
  const [files, setFiles] = useState<DriverFormFiles>({});
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);

  const changedCount =
    (Object.keys(values) as (keyof DriverFormValues)[]).filter((k) => values[k] !== initial[k]).length +
    Object.keys(files).length;
  const dirty = changedCount > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const section: SectionProps = {
    mode,
    values,
    set: (key, value) => setValues((p) => ({ ...p, [key]: value })),
    patch: (fields) => setValues((p) => ({ ...p, ...fields })),
    files,
    setFile: (key, file) => setFiles((p) => ({ ...p, [key]: file })),
    existingDocs,
    onPreview: (label, url) => setPreview({ label, url }),
    // Confirming a document's extracted fields overwrites unconditionally; a licence number read
    // off a photo is tidied the same way as a typed one.
    applyExtracted: (fields) =>
      setValues((p) => ({
        ...p,
        ...fields,
        ...(fields.licenseNumber !== undefined
          ? { licenseNumber: normalizeLicenseNumber(fields.licenseNumber, p.isTemporaryLicense) }
          : {}),
      })),
    problems: {},
    withDocuments: mode === "edit",
  };

  return (
    <>
      {mode === "edit" ? (
        <EditLayout {...props} initial={initial} section={section} files={files} dirty={dirty} changedCount={changedCount} />
      ) : (
        <CreateWizard {...props} section={section} files={files} dirty={dirty} />
      )}
      <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </>
  );
}

/** "Discard unsaved changes?" — shared by the form's Cancel and the owners' close guards. */
export function DiscardChangesModal({
  open,
  onKeep,
  onDiscard,
}: {
  open: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onKeep}
      title="Discard unsaved changes?"
      className="sm:max-w-sm"
      // Always opens over the edit dialog: dim and blur it so it is clearly out of reach.
      overlayClassName="bg-black/60 supports-backdrop-filter:backdrop-blur-sm"
    >
      <p className="text-sm text-muted-foreground">The changes you made to this driver haven&apos;t been saved.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onKeep} autoFocus>
          Keep editing
        </Button>
        <Button variant="destructive" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </Modal>
  );
}

function useSubmit(onSubmit: FormProps["onSubmit"]) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(values: DriverFormValues, files: DriverFormFiles) {
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
  return { busy, error, setError, run };
}

/** The bar pinned to the bottom of the scroll area: errors and Save are always in view together. */
function Footer({ children, message }: { children: ReactNode; message?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-4 border-t bg-background/95 px-1 pt-3 pb-1 backdrop-blur supports-backdrop-filter:bg-background/80">
      {/* Always takes its line, so a message appearing doesn't shift the buttons. */}
      <div className="mb-2 min-h-5 text-sm">{message}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const SECTION_BODY: Record<DriverSectionKey, (p: SectionProps, extra: { hadBankAccount: boolean }) => ReactNode> = {
  personal: (p) => <PersonalSection {...p} />,
  address: (p) => <AddressSection {...p} />,
  vehicle: (p) => <VehicleSection {...p} withOwnership />,
  license: (p) => <LicenceSection {...p} />,
  insurance: (p) => <InsuranceSection {...p} />,
  revenue: (p) => <RevenueSection {...p} />,
  bank: (p, extra) => <BankSection {...p} hadBankAccount={extra.hadBankAccount} />,
};

function EditLayout({
  initial,
  section,
  files,
  dirty,
  changedCount,
  initialSection,
  onSubmit,
  onCancel,
}: FormProps & {
  initial: DriverFormValues;
  section: SectionProps;
  files: DriverFormFiles;
  dirty: boolean;
  changedCount: number;
}) {
  const { values } = section;
  const { busy, error, run } = useSubmit(onSubmit);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const sectionRefs = useRef<Partial<Record<DriverSectionKey, HTMLElement | null>>>({});

  const problems = useMemo(() => editBlockingProblems(initial, values), [initial, values]);
  const missing = useMemo(() => missingRequiredFields(values, "edit"), [values]);
  const blocked = Object.keys(problems).length > 0;
  const canSave = dirty && !blocked && !busy;
  const hadBankAccount = initial.bankAccountNumber !== "";

  const sectionState = (key: DriverSectionKey) => {
    const fields = (Object.keys(values) as (keyof DriverFormValues)[]).filter((f) => sectionOfField(f) === key);
    if (fields.some((f) => problems[f])) return "error" as const;
    if (missing.some((f) => sectionOfField(f) === key)) return "missing" as const;
    if (fields.some((f) => values[f] !== initial[f])) return "changed" as const;
    return null;
  };

  function goTo(key: DriverSectionKey, { focus = true } = {}) {
    const el = sectionRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    if (focus) {
      el.querySelector<HTMLElement>("input:not([disabled]):not([type=file]), select:not([disabled])")?.focus({
        preventScroll: true,
      });
    }
  }

  // Open where the work is: the requested section, else the first one with a gap. Run once.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const target = initialSection ?? (missing[0] ? sectionOfField(missing[0]) : "personal");
    // After the dialog's own open/focus handling has settled.
    const id = requestAnimationFrame(() => goTo(target));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    if (!canSave) {
      const first = Object.keys(problems)[0] as keyof DriverFormValues | undefined;
      if (first) goTo(sectionOfField(first));
      return;
    }
    void run(values, files);
  }

  function cancel() {
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }

  useHotkeys({ "mod+enter": save, "mod+s": save });

  const firstProblem = Object.entries(problems)[0] as [keyof DriverFormValues, string] | undefined;
  const sectionProps = { ...section, problems };

  return (
    <div>
      <nav
        aria-label="Driver sections"
        className="sticky top-0 z-10 -mx-1 mb-3 flex gap-1 overflow-x-auto border-b bg-background/95 px-1 py-2 backdrop-blur supports-backdrop-filter:bg-background/80"
      >
        {DRIVER_SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goTo(s.key)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <StateDot state={sectionState(s.key)} />
            {s.title}
          </button>
        ))}
      </nav>

      <div className="space-y-3">
        {DRIVER_SECTIONS.map((s) => {
          const state = sectionState(s.key);
          return (
            <section
              key={s.key}
              ref={(el) => {
                sectionRefs.current[s.key] = el;
              }}
              aria-labelledby={`driver-section-${s.key}`}
              className={cn(
                "scroll-mt-14 rounded-xl border p-4",
                state === "error" && "border-destructive/50",
                state === "missing" && "border-amber-400/60",
              )}
            >
              <h3
                id={`driver-section-${s.key}`}
                className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
              >
                {s.title}
                <StateDot state={state} />
              </h3>
              {SECTION_BODY[s.key](sectionProps, { hadBankAccount })}
            </section>
          );
        })}
      </div>

      <Footer
        message={
          error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : firstProblem ? (
            <p className="text-destructive">
              <button type="button" className="underline underline-offset-2" onClick={() => goTo(sectionOfField(firstProblem[0]))}>
                {FIELD_LABELS[firstProblem[0]]}
              </button>
              : {firstProblem[1]}
            </p>
          ) : missing.length > 0 ? (
            <p className="text-amber-700 dark:text-amber-400">
              Still needed for review: {missing.map((f) => FIELD_LABELS[f]).join(", ")}. You can save what you have.
            </p>
          ) : null
        }
      >
        <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <span className="mr-auto text-xs text-muted-foreground">
          {dirty ? `${changedCount} unsaved change${changedCount === 1 ? "" : "s"}` : "No changes yet"}
        </span>
        <Button type="button" onClick={save} disabled={!canSave}>
          {busy && <Loader2 className="animate-spin" />}
          {busy ? "Saving…" : "Save changes"}
          <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground/80">Ctrl ↵</Kbd>
        </Button>
      </Footer>

      <DiscardChangesModal
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => {
          setConfirmDiscard(false);
          onCancel();
        }}
      />
    </div>
  );
}

type Step = { key: string; title: string; fields: (keyof DriverFormValues)[] };

// Documents come first, mirroring the driver app's registration flow: the paperwork is
// photographed before typing any of the fields those photos can autofill. No required fields
// there — a driver can still be created with zero photos and everything typed by hand.
const STEPS: Step[] = [
  { key: "documents", title: "Documents", fields: [] },
  ...DRIVER_SECTIONS.filter((s) => s.key !== "bank").map((s) => ({
    key: s.key,
    title: s.title,
    fields: REQUIRED_BY_SECTION[s.key],
  })),
  { key: "bank", title: "Bank Account", fields: [] },
];

function CreateWizard({
  section,
  files,
  dirty,
  onSubmit,
  onSaveDraft,
  onCancel,
}: FormProps & { section: SectionProps; files: DriverFormFiles; dirty: boolean }) {
  const { values } = section;
  const [step, setStep] = useState(0);
  const { busy: submitting, error: submitError, setError, run } = useSubmit(onSubmit);
  const draft = useSubmit(onSaveDraft ?? (async () => {}));
  const busy = submitting || draft.busy;
  const error = submitError ?? draft.error;
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const licenseProblem = licenseNumberProblem(values.licenseNumber, values.isTemporaryLicense);
  const problems: FieldProblems = {
    ...(current.key === "bank" ? bankProblems(values) : {}),
    ...(current.key === "license" && licenseProblem ? { licenseNumber: licenseProblem } : {}),
  };
  const missingIn = (s: Step) => s.fields.filter((f) => String(values[f] ?? "").trim() === "");
  const stepMissing = missingIn(current);
  const stepValid = stepMissing.length === 0 && Object.keys(problems).length === 0;
  const allValid =
    missingRequiredFields(values, "create").length === 0 && Object.keys(bankProblems(values)).length === 0;

  // A draft needs enough to find it again (mobile + first name) and nothing the backend would
  // refuse: a half-filled bank account or a malformed licence number.
  const draftBlocker =
    values.phone.trim() === "" || values.firstName.trim() === ""
      ? "Add the mobile number and first name to save a draft"
      : Object.keys(bankProblems(values)).length > 0
        ? "Finish or clear the bank details to save a draft"
        : licenseProblem
          ? "Fix the licence number to save a draft"
          : null;

  function saveDraft() {
    if (!onSaveDraft || draftBlocker || busy) return;
    setError(null);
    void draft.run(values, files);
  }

  async function submit() {
    // Steps can be opened in any order, so the last one can be reached without passing this check.
    if (licenseProblem) {
      setError(licenseProblem);
      setStep(STEPS.findIndex((s) => s.key === "license"));
      return;
    }
    await run(values, files);
  }

  async function next() {
    if (!stepValid || busy) return;
    if (isLast) await submit();
    else setStep((s) => s + 1);
  }

  function cancel() {
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }

  useHotkeys({ "mod+enter": () => void next(), "mod+s": saveDraft });

  const stepProps = { ...section, problems };
  const body: Record<string, ReactNode> = {
    documents: <DocumentsStep {...stepProps} />,
    personal: <PersonalSection {...stepProps} />,
    address: <AddressSection {...stepProps} />,
    vehicle: <VehicleSection {...stepProps} withOwnership />,
    license: <LicenceSection {...stepProps} />,
    insurance: <InsuranceSection {...stepProps} />,
    revenue: <RevenueSection {...stepProps} />,
    bank: <BankSection {...stepProps} hadBankAccount={false} />,
  };
  const submitLabel = submitting ? "Saving…" : "Create Driver";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => {
          const gaps = missingIn(s).length;
          const touched = s.fields.some((f) => String(values[f] ?? "").trim() !== "");
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {s.fields.length > 0 && <StateDot state={gaps === 0 ? "done" : touched || i < step ? "missing" : null} />}
              {i + 1}. {s.title}
            </button>
          );
        })}
      </div>

      {/* Fixed height for every step, so the dialog doesn't jump as steps with more or fewer
          fields come and go; a taller step scrolls inside. */}
      <section className="h-[min(58vh,32rem)] overflow-y-auto rounded-xl border p-4">
        <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{current.title}</h3>
        {body[current.key]}
      </section>

      <Footer
        message={
          error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : stepMissing.length > 0 ? (
            <p className="text-muted-foreground">Missing: {stepMissing.map((f) => FIELD_LABELS[f]).join(", ")}</p>
          ) : null
        }
      >
        <Button type="button" variant="outline" onClick={isFirst ? cancel : () => setStep((s) => s - 1)}>
          <ChevronLeft />
          {isFirst ? "Cancel" : "Back"}
        </Button>
        <Button type="button" className="flex-1" disabled={!stepValid || busy} onClick={() => void next()}>
          {isLast ? submitLabel : "Next"}
          {!isLast && <ChevronRight />}
          <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground/80">Ctrl ↵</Kbd>
        </Button>
        {onSaveDraft && !allValid && (
          <Button
            type="button"
            variant="outline"
            disabled={!!draftBlocker || busy}
            title={draftBlocker ?? "Save what's filled in as an unfinished signup and finish it later"}
            onClick={saveDraft}
          >
            {draft.busy ? "Saving…" : "Save as draft"}
            <Kbd>Ctrl S</Kbd>
          </Button>
        )}
        {!isLast && (
          <Button type="button" variant="outline" disabled={!allValid || busy} onClick={() => void submit()}>
            {submitLabel}
          </Button>
        )}
      </Footer>

      <DiscardChangesModal
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => {
          setConfirmDiscard(false);
          onCancel();
        }}
      />
    </div>
  );
}
