"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/api";
import { useDriverDetail, useUpdateDriver } from "@/lib/hooks/use-drivers";
import type { Driver } from "@/types/driver";
import { DriverLocationFields, type DriverLocation } from "./driver-location-fields";

/** Changes only a driver's province, district and city — whatever their status. */
export function DriverLocationDialog({
  driverId,
  open,
  onClose,
}: {
  driverId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useDriverDetail(driverId);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change location</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading driver…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {/* Keyed so the form starts from this driver's saved location each time it loads. */}
        {data && <LocationForm key={data.driver.id} driver={data.driver} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function LocationForm({ driver, onDone }: { driver: Driver; onDone: () => void }) {
  const update = useUpdateDriver();
  const saved: DriverLocation = {
    province: driver.province ?? "",
    district: driver.district ?? "",
    city: driver.city ?? "",
  };
  const [value, setValue] = useState<DriverLocation>(saved);
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "this driver";
  const complete = value.province !== "" && value.district !== "" && value.city.trim() !== "";
  const changed =
    value.province !== saved.province || value.district !== saved.district || value.city !== saved.city;

  function save() {
    update.mutate(
      { id: String(driver.id), values: { ...value, city: value.city.trim() }, files: {} },
      { onSuccess: onDone },
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        For {name}. Currently{" "}
        {[saved.city, saved.district, saved.province].filter(Boolean).join(", ") || "no location on record"}.
      </p>
      <div className="grid gap-4">
        <DriverLocationFields value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!complete || !changed || update.isPending}>
          {update.isPending && <Loader2 className="size-4 animate-spin" />} Save location
        </Button>
      </DialogFooter>
    </>
  );
}
