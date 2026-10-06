"use client";

import Link from "next/link";
import { AlertTriangle, Clock, PhoneCall } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useMe } from "@/lib/hooks/use-desk";
import { useOverdueHandoffs, useTicketCount } from "@/lib/hooks/use-tickets";
import { cn } from "@/lib/utils";

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number | undefined; icon: typeof Clock; tone?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex size-10 items-center justify-center rounded-lg bg-muted", tone)}><Icon className="size-5" /></span>
        <div>
          <p className="text-2xl font-semibold">{value ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { data: me } = useMe();
  const needsContact = useTicketCount("needs-contact", { needsContact: true });
  const pending = useTicketCount("pending", { status: "pending" });
  const overdue = useOverdueHandoffs();

  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-semibold">Support Portal</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {me?.name ?? me?.email ?? `user #${user?.id}`} ({user?.type}).
      </p>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        <Stat label="Drivers waiting for contact" value={needsContact.data} icon={PhoneCall} tone="text-emerald-600" />
        <Stat label="Past their response time" value={overdue.data} icon={AlertTriangle} tone="text-red-600" />
        <Stat label="Pending tickets" value={pending.data} icon={Clock} tone="text-amber-600" />
      </div>
      <div className="flex gap-2">
        <Link href="/inbox" className={buttonVariants()}>Open inbox</Link>
        <Button variant="outline" onClick={logout}>Sign out</Button>
      </div>
    </main>
  );
}
