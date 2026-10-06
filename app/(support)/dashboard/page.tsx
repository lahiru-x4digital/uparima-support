"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-semibold">Support Portal</h1>
      <p className="text-sm text-muted-foreground">Signed in as user #{user?.id} ({user?.type}).</p>
      <div className="flex gap-2">
        <Link href="/inbox" className={buttonVariants()}>Open inbox</Link>
        <Button variant="outline" onClick={logout}>Sign out</Button>
      </div>
    </main>
  );
}
