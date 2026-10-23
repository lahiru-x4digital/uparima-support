"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { useCan } from "@/lib/hooks/use-desk";
import { useCreateDriver, useCreateDriverDraft } from "@/lib/hooks/use-drivers";
import type { CreatedDriver, DriverFormFiles, DriverFormValues } from "@/types/driver";
import { DriverForm } from "./driver-form";

/** What the AI review made of a newly added driver, said once the driver is saved. */
function announceReview(driver: CreatedDriver) {
  const review = driver.aiValidation;
  if (review?.approved) {
    toast.success("Driver added and approved", { description: "The AI review passed every document." });
  } else if (review) {
    toast.warning("Driver added — waiting for review", {
      description: "The AI review found problems. They're listed on the driver's page: fix them and run AI Validate again.",
    });
  } else {
    toast.warning("Driver added — waiting for review", {
      description: "The AI review couldn't start. Run AI Validate from the driver's page.",
    });
  }
}

/**
 * Support-assisted registration. The driver is submitted for review, not approved: the backend
 * saves them as pending and runs the AI review straight away, which approves them only if the
 * documents pass.
 */
export function DriverCreate() {
  const router = useRouter();
  const canRegister = useCan("driver.manual-register");
  const create = useCreateDriver();
  const createDraft = useCreateDriverDraft();

  if (!canRegister) return <NoAccess what="driver registration" />;

  async function handleSubmit(values: DriverFormValues, files: DriverFormFiles) {
    const driver = await create.mutateAsync({ values, files });
    announceReview(driver);
    router.push(`/drivers/${driver.id}`);
  }

  // An unfinished signup opens on its page, which lists what it still needs.
  async function handleSaveDraft(values: DriverFormValues, files: DriverFormFiles) {
    const driver = await createDraft.mutateAsync({ values, files });
    router.push(`/drivers/${driver.id}`);
  }

  return (
    <PageShell
      title="Add Driver"
      description="The driver is submitted for review: the AI checks the documents when you save, and approves the driver only if they pass."
      backHref="/drivers/pending"
      width="max-w-4xl"
    >
      <DriverForm
        mode="create"
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onCancel={() => router.push("/drivers/pending")}
      />
    </PageShell>
  );
}
