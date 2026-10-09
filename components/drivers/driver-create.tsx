"use client";

import { useRouter } from "next/navigation";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { useCan } from "@/lib/hooks/use-desk";
import { useCreateDriver } from "@/lib/hooks/use-drivers";
import type { DriverFormFiles, DriverFormValues } from "@/types/driver";
import { DriverForm } from "./driver-form";

/** Support-assisted registration: the driver is approved straight away, like an admin-created one. */
export function DriverCreate() {
  const router = useRouter();
  const canRegister = useCan("driver.manual-register");
  const create = useCreateDriver();

  if (!canRegister) return <NoAccess what="driver registration" />;

  async function handleSubmit(values: DriverFormValues, files: DriverFormFiles) {
    const driver = await create.mutateAsync({ values, files });
    router.push(`/drivers/${driver.id}`);
  }

  return (
    <PageShell title="Add Driver" backHref="/drivers" width="max-w-4xl">
      <DriverForm mode="create" onSubmit={handleSubmit} onCancel={() => router.push("/drivers")} />
    </PageShell>
  );
}
