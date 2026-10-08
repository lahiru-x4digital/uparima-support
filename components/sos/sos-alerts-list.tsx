"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { getErrorMessage } from "@/lib/api";
import { useCan } from "@/lib/hooks/use-desk";
import { useSosList } from "@/lib/hooks/use-sos";
import { durationBetween, sosCallerName, sosRoleLabel } from "@/lib/sos";
import { cn } from "@/lib/utils";
import { SOS_TABS, type SosAlert, type SosTab } from "@/types/sos";
import { SosStatusBadge } from "./sos-status-badge";
import { useSos } from "./sos-provider";

const matches = (a: SosAlert, term: string) =>
  [a.rider_name, a.rider_phone, a.driver_name, a.driver_phone, a.vehicle_number]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);

/** SOS alerts: the ones needing someone (live), and the history of resolved / cancelled ones. */
export function SosAlertsList() {
  const canView = useCan("sos.view");
  const { activeAlerts } = useSos();
  const [tab, setTab] = useState<SosTab>("active");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");

  const { data, isLoading, error, refetch } = useSosList(tab, page);

  if (!canView) return <NoAccess what="SOS alerts" />;

  // The Active tab is the live list (the socket keeps it fresher than a fetch); the rest are paged by the server.
  const live = tab === "active";
  const needle = term.trim().toLowerCase();
  const all = live ? activeAlerts : (data?.data ?? []);
  const rows = needle ? all.filter((a) => matches(a, needle)) : all;
  const meta = live ? null : data?.meta;

  return (
    <PageShell
      title="SOS Alerts"
      description="Emergencies raised from a ride by a rider or a driver. Open alerts ring until someone acknowledges them."
      actions={<SearchBox placeholder="Search name, phone, vehicle" onSearch={setTerm} />}
    >
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {SOS_TABS.map((t) => (
          <button
            key={t.key || "all"}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "active" && activeAlerts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{activeAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {!live && error ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm">
          <p className="text-destructive">{getErrorMessage(error)}</p>
          <button className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")} onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raised</TableHead>
                <TableHead>Raised by</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Driver / vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responded by</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!live && isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {needle ? "No alerts match your search." : live ? "No active SOS alerts — all clear." : "No SOS alerts found."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <div className="font-medium">{sosCallerName(a)}</div>
                        <div className="text-xs text-muted-foreground">{sosRoleLabel(a)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <div>{a.rider_name ?? "—"}</div>
                        {a.rider_phone && <div className="text-xs text-muted-foreground">{a.rider_phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <div>{a.driver_name ?? "—"}</div>
                        {a.vehicle_number && <div className="font-mono text-xs text-muted-foreground">{a.vehicle_number}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SosStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      {a.acknowledged_at ? (
                        <div className="leading-tight">
                          <div>{a.acknowledged_by_name ?? "Staff"}</div>
                          <div className="text-xs text-muted-foreground">in {durationBetween(a.created_at, a.acknowledged_at)}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/sos/${a.id}`}
                        title="Open SOS alert"
                        aria-label="Open SOS alert"
                        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                      >
                        <Eye />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
        </div>
      )}
    </PageShell>
  );
}
