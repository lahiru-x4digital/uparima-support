"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Red "!" next to the option, e.g. work waiting for me. */
  alert?: boolean;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Red "!" marker, shared with the filter bar's trigger badge. */
export function AlertDot({ className }: { className?: string }) {
  return (
    <span className={`flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ${className ?? ""}`}>
      !
    </span>
  );
}

/** Small shadcn Select wrapper for fixed option lists. */
export function OptionSelect<T extends string>({ value, options, onChange, label, className }: Props<T>) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger size="sm" aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} hideIndicator
            className="pr-1.5 data-selected:bg-muted data-selected:text-muted-foreground"
            trailing={o.alert ? <AlertDot /> : undefined}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
