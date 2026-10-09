"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { loginPath } from "@/lib/auth-flow";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Remember the page that was asked for, so signing in lands there.
    if (!loading && !user) router.replace(loginPath(undefined, pathname));
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div role="status" className="flex min-h-svh flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
