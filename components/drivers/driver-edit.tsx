"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useDriverDetail, useUpdateDriver } from "@/lib/hooks/use-drivers";
import { driverToFormValues, type DriverFormFiles, type DriverFormValues } from "@/types/driver";
import { DriverForm } from "./driver-form";

/** Edit a driver's details and replace their documents. */
export function DriverEdit({ id }: { id: string }) {
  const router = useRouter();
  const canUpdate = useCan("driver.update");
  const { data, isLoading, error } = useDriverDetail(id);
  const update = useUpdateDriver();
  const back = `/drivers/${id}`;

  if (!canUpdate) return <NoAccess what="editing drivers" />;

  async function handleSubmit(values: DriverFormValues, files: DriverFormFiles) {
    await update.mutateAsync({ id, values, files });
    router.push(back);
  }

  return (
    <PageShell title="Edit Driver" backHref={back} width="max-w-4xl">
      {isLoading ? (
        <div className="flex justify-center p-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : error || !data ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
          {error ? getErrorMessage(error) : "Driver not found."}
        </p>
      ) : (
        <DriverForm
          mode="edit"
          initialValues={driverToFormValues(data.driver, data.bankAccount)}
          existingDocs={data.document_urls}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      )}
    </PageShell>
  );
}
