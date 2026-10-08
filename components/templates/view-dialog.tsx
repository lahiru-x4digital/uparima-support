"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** The small "View" (eye) button on a template card, opening a read-only preview. */
export function ViewDialog({ name, title, description, className, children }: {
  /** Template name, for the button's accessible label. */
  name: string;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={`View ${name}`} title="View" />}>
        <Eye />
      </DialogTrigger>
      <DialogContent className={cn("flex max-h-[90vh] flex-col gap-3 sm:max-w-lg", className)}>
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

/** Label / value row used in the template details views. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
