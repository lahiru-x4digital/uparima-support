"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, LifeBuoy, LogOut, MessageSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useTicketCount } from "@/lib/hooks/use-tickets";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "support_sidebar_collapsed";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Message", icon: MessageSquare },
  { href: "/templates", label: "Care Templates", icon: ClipboardList },
] as const;

/** Left navigation: violet gradient rail with the portal brand, nav items and account actions. */
export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const needsContact = useTicketCount("needs-contact", { needsContact: true });
  // Only rendered after AuthGuard has resolved on the client, so reading storage here can't cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable — state just won't persist */
      }
      return !c;
    });
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-linear-to-b from-sidebar to-sidebar-end text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex items-center gap-2.5 py-5", collapsed ? "justify-center px-2" : "px-4")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-foreground/15 ring-1 ring-sidebar-foreground/20">
          <LifeBuoy className="size-5" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-heading text-base font-bold tracking-wide">UPARIMA</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/70">Support portal</p>
          </div>
        )}
        {!collapsed && (
          <button type="button" onClick={toggle} aria-label="Close sidebar" title="Close sidebar" aria-expanded
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground">
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button type="button" onClick={toggle} aria-label="Open sidebar" title="Open sidebar" aria-expanded={false}
          className="mx-auto mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-sidebar-foreground/10 text-sidebar-foreground ring-1 ring-sidebar-foreground/20 transition-colors hover:bg-sidebar-foreground/20">
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <nav className={cn("flex-1 space-y-1 py-2", collapsed ? "px-2.5" : "px-3")} aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const badge = href === "/inbox" ? needsContact.data : undefined;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                active
                  ? "bg-sidebar-foreground/20 text-sidebar-foreground shadow-sm ring-1 ring-sidebar-foreground/20"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!!badge &&
                (collapsed ? (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-sidebar-primary" />
                ) : (
                  <span className="rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                    {badge}
                  </span>
                ))}
            </Link>
          );
        })}
      </nav>

      <div className={cn("flex items-center gap-1 border-t border-sidebar-foreground/15 px-3 py-3", collapsed ? "flex-col pb-14" : "justify-between")}>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => void logout()}
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
