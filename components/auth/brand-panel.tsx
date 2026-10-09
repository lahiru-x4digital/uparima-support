import { Car, LifeBuoy, MessagesSquare, ShieldCheck, Siren, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The portal's mark and name. `onBrand` is for sitting on the violet panel. */
export function BrandMark({ onBrand, className }: { onBrand?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          onBrand
            ? "bg-sidebar-foreground/15 ring-1 ring-sidebar-foreground/20"
            : "bg-linear-to-br from-sidebar to-sidebar-end text-sidebar-foreground",
        )}
      >
        <LifeBuoy className="size-5" aria-hidden />
      </span>
      <div className="leading-tight">
        <p className="font-heading text-base font-bold tracking-wide">UPARIMA</p>
        <p className={cn("text-[10px] font-medium uppercase tracking-widest", onBrand ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
          Support portal
        </p>
      </div>
    </div>
  );
}

const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: MessagesSquare, title: "One inbox", text: "Tickets, WhatsApp, email and SMS in a single queue." },
  { icon: Car, title: "Drivers and rides", text: "Review drivers and trace any trip without leaving the desk." },
  { icon: Siren, title: "Live SOS alerts", text: "Emergencies reach every agent on duty the moment they're raised." },
];

/** The violet half of the sign-in screen (wide screens only): what the portal is, in the sidebar's colours. */
export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-linear-to-br from-sidebar to-sidebar-end text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      {/* Soft shapes behind the text — decoration only. */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-sidebar-primary/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-112 rounded-full bg-sidebar-foreground/10 blur-3xl" />

      <BrandMark onBrand className="relative" />

      <div className="relative flex max-w-md flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-3xl font-bold leading-tight xl:text-4xl">Help riders and drivers, faster.</h2>
          <p className="text-sm text-sidebar-foreground/75 xl:text-base">
            Everything the Uparima support team needs to answer, resolve and follow up — in one place.
          </p>
        </div>
        <ul className="flex flex-col gap-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-foreground/10 ring-1 ring-sidebar-foreground/15">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-sidebar-foreground/70">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative flex items-center gap-2 text-xs text-sidebar-foreground/70">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Staff accounts only — protected by your password and an optional emailed code.
      </p>
    </aside>
  );
}
