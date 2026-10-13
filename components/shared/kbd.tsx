import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A keyboard-shortcut hint, e.g. <Kbd>E</Kbd>. Hidden on small screens, where there's no keyboard. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "hidden rounded border bg-muted px-1 font-sans text-[10px] leading-4 font-medium text-muted-foreground sm:inline-block",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
