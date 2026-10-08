"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon, BadgePercent, Car, ClipboardList, History, Inbox, LayoutDashboard, Mail, Receipt, Send, Settings2, LifeBuoy, LogOut, MessageSquare, PanelLeftClose, PanelLeftOpen, Route, Siren, UserCheck, UserPlus, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useMe } from "@/lib/hooks/use-desk";
import { useSos } from "@/components/sos/sos-provider";
import { useTicketCount } from "@/lib/hooks/use-tickets";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "support_sidebar_collapsed";

// `section` starts a labelled group (a small heading above its items; hidden when the rail is collapsed).
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  sectionIcon?: LucideIcon;
  /** Shown only to an agent holding at least one of these permissions (always shown when omitted). */
  anyPermission?: string[];
  /** Active only on exactly this path, not on the pages beneath it. */
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Message", icon: MessageSquare },
  { href: "/templates", label: "Templates", icon: ClipboardList },
  { href: "/sms", label: "Send SMS", icon: Send },
  { href: "/sms/history", label: "SMS History", icon: History },
  { href: "/email/inbox", label: "Inbox", icon: Inbox, section: "Email", sectionIcon: Mail },
  { href: "/email/config", label: "Email Config", icon: Settings2 },
  { href: "/drivers", label: "Drivers", icon: Car, section: "Drivers", sectionIcon: Car, anyPermission: ["driver.view"], exact: true },
  { href: "/drivers/pending", label: "Pending Drivers", icon: UserCheck, anyPermission: ["driver.view", "driver.approve"] },
  { href: "/drivers/add", label: "Add Driver", icon: UserPlus, anyPermission: ["driver.manual-register"] },
  { href: "/drivers/platform-fees", label: "Platform Fees", icon: Receipt, anyPermission: ["driver-payment.view"] },
  { href: "/drivers/promotion-balances", label: "Promotion Balances", icon: BadgePercent, anyPermission: ["driver-payment.view"] },
  { href: "/drivers/discount-payments", label: "Withdrawals", icon: Wallet, anyPermission: ["driver-payment.view"] },
  { href: "/rides", label: "Ride History", icon: Route, section: "Rides", sectionIcon: Car, anyPermission: ["ride.view"] },
  { href: "/sos", label: "SOS Alerts", icon: Siren, anyPermission: ["sos.view"] },
];

/** Left navigation: violet gradient rail with the portal brand, nav items and account actions. */
export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const needsContact = useTicketCount("needs-contact", { needsContact: true });
  // Open + acknowledged SOS alerts: the number the SOS item carries.
  const activeSos = useSos().activeAlerts.length;
  // Until the profile loads, gated items stay hidden rather than flash in.
  const permissions = useMe().data?.permissions ?? [];
  const visibleNav = NAV.filter((item) => !item.anyPermission || item.anyPermission.some((p) => permissions.includes(p)));
  // An item belongs to the group opened by the nearest `section` item at or above it. The heading is
  // shown above the first item of that group that is visible, so hiding the group's first item for
  // lack of permission doesn't lose the heading.
  const groupOf = (item: NavItem) => {
    for (let i = NAV.indexOf(item); i >= 0; i--) if (NAV[i].section) return NAV[i];
    return undefined;
  };
  const headingFor = (item: NavItem, index: number) => {
    const group = groupOf(item);
    if (!group) return undefined;
    return visibleNav.slice(0, index).some((earlier) => groupOf(earlier) === group) ? undefined : group;
  };
  // Only rendered after AuthGuard has resolved on the client, so reading storage here can't cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // The menu can be longer than the screen, so it scrolls inside the sidebar. Keep the current
  // page's item in view when the page (or the rail's width) changes.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, collapsed, visibleNav.length]);

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
        "flex h-full min-h-0 shrink-0 flex-col bg-linear-to-b from-sidebar to-sidebar-end text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex shrink-0 items-center gap-2.5 py-5", collapsed ? "justify-center px-2" : "px-4")}>
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
          className="mx-auto mb-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-foreground/10 text-sidebar-foreground ring-1 ring-sidebar-foreground/20 transition-colors hover:bg-sidebar-foreground/20">
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <nav
        ref={navRef}
        aria-label="Main"
        className={cn(
          // min-h-0 lets it shrink below its content so it scrolls instead of spilling out of the rail
          "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain py-2 [scrollbar-color:color-mix(in_oklch,var(--sidebar-foreground)_30%,transparent)_transparent] [scrollbar-width:thin]",
          collapsed ? "px-2.5" : "px-3",
        )}
      >
        {visibleNav.map((item, index) => {
          const { href, label, icon: Icon, exact } = item;
          const heading = headingFor(item, index);
          const section = heading?.section;
          const SectionIcon = heading?.sectionIcon;
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const badge = href === "/inbox" ? needsContact.data : href === "/sos" ? activeSos : undefined;
          return (
            <div key={href}>
              {section && (collapsed
                ? <div className="mx-auto my-2 h-px w-6 bg-sidebar-foreground/20" />
                : <p className="mb-1 mt-4 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">{SectionIcon && <SectionIcon className="size-3" />}{section}</p>)}
            <Link
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
            </div>
          );
        })}
      </nav>

      <div className={cn("flex shrink-0 items-center gap-1 border-t border-sidebar-foreground/15 px-3 py-3", collapsed ? "flex-col pb-14" : "justify-between")}>
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
