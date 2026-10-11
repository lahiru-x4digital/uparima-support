"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NoAccess } from "@/components/shared/page-shell";
import { useCan } from "@/lib/hooks/use-desk";
import { useCreateDriver } from "@/lib/hooks/use-drivers";
import type { DriverFormFiles, DriverFormValues } from "@/types/driver";
import { DriverForm } from "./driver-form";

/**
 * Register a brand-new driver from the inbox, without leaving the ticket —
 * same create flow as /drivers/add (DriverCreate), just as a dialog. On
 * success, hands the new driver's id back so the caller can switch straight
 * into DriverDetailsDialog for it.
 */
export function DriverCreateDialog({
  open,
  initialValues,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialValues?: DriverFormValues;
  onClose: () => void;
  onCreated: (driverId: number) => void;
}) {
  const canRegister = useCan("driver.manual-register");
  const create = useCreateDriver();

  async function handleSubmit(values: DriverFormValues, files: DriverFormFiles) {
    const driver = await create.mutateAsync({ values, files });
    onCreated(driver.id);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-4xl flex-col gap-3 overflow-hidden sm:max-w-4xl">
        {!canRegister ? (
          <NoAccess what="driver registration" />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Register driver</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DriverForm mode="create" initialValues={initialValues} onSubmit={handleSubmit} onCancel={onClose} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
