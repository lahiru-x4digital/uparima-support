"use client";

import { NoAccess } from "@/components/shared/page-shell";
import { useCan } from "@/lib/hooks/use-desk";
import { DriversBrowse } from "./drivers-browse";
import { DriversSearch } from "./drivers-search";

/** The Drivers page: the full browsable list for roles with `driver.browse`, a search-to-find-one view for the rest. */
export function DriversList() {
  const canView = useCan("driver.view");
  const canBrowse = useCan("driver.browse");

  if (canBrowse) return <DriversBrowse />;
  if (!canView) return <NoAccess what="the drivers list" />;
  return <DriversSearch />;
}
