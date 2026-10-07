"use client";

import Link from "next/link";
import { ArrowRight, PhoneCall } from "lucide-react";
import { useTicketCount } from "@/lib/hooks/use-tickets";

export function DashboardOverview() {
  const needsContact = useTicketCount("needs-contact", { needsContact: true });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="rounded-2xl bg-linear-to-r from-sidebar to-sidebar-end p-6 text-sidebar-foreground shadow-sm">
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-sidebar-foreground/80">Here&apos;s what needs your attention today.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/inbox" className="group rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <PhoneCall className="size-5" />
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-4 text-3xl font-bold">{needsContact.data ?? "–"}</p>
          <p className="text-sm text-muted-foreground">Waiting for contact</p>
        </Link>
      </div>
    </div>
  );
}
