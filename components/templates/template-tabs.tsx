"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Mail, MessageCircle, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/templates", label: "Care", icon: ClipboardList },
  { href: "/templates/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/templates/email", label: "Email", icon: Mail },
  { href: "/templates/audio", label: "Audio", icon: Mic },
] as const;

/** Switch between the template kinds. Care owns /templates, /templates/new and /templates/:id. */
export function TemplateTabs() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/templates"
      ? !TABS.some((t) => t.href !== "/templates" && pathname.startsWith(t.href))
      : pathname.startsWith(href);

  return (
    <nav className="mb-4 flex w-fit rounded-xl border bg-card p-1 text-sm shadow-sm" aria-label="Template type">
      {TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
          className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors",
            isActive(href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          <Icon className="size-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}
