"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { useCan, useCanViewDrivers } from "@/lib/hooks/use-desk";
import { DriversBrowse } from "./drivers-browse";
import { DriversSearch } from "./drivers-search";

/**
 * The Drivers page: the full browsable list for roles with `driver.browse`, a search-to-find-one view
 * for the rest of `driver.view`. A pending-only role (`driver.view-pending`) works from the review
 * queue instead — every driver it may open is there.
 */
export function DriversList() {
  const viewDrivers = useCanViewDrivers();
  const canBrowse = useCan("driver.browse");

  if (canBrowse) return <DriversBrowse />;
  if (viewDrivers.pendingOnly) {
    return (
      <PageShell title="Drivers">
        <div className="rounded-xl border bg-card p-6 text-center text-sm">
          <p className="text-muted-foreground">You work with drivers waiting for review — they&apos;re all on Pending Drivers.</p>
          <Link href="/drivers/pending" className={buttonVariants({ size: "sm", className: "mt-3" })}>
            Open Pending Drivers
          </Link>
        </div>
      </PageShell>
    );
  }
  if (!viewDrivers.any) return <NoAccess what="the drivers list" />;
  return <DriversSearch />;
}
