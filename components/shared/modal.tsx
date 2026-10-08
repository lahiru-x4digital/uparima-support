"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A dialog with a title and a body that scrolls inside the screen — never taller than the window,
 * so a long form or table stays reachable on a small laptop. Controlled: `onClose` is called for
 * Escape, the backdrop and the close button.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn("flex max-h-[90vh] flex-col gap-3 sm:max-w-lg", className)}>
        {title && (
          <DialogHeader className="pr-8">
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
