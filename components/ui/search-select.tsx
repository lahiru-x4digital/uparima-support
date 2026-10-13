"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchOption = { value: string; label: string; hint?: string };

/**
 * A pick-only dropdown with a search box: nothing typed is ever kept, the value is always one of
 * `options`. By default the box filters `options` by their label; pass `onQueryChange` and
 * `filterLocally={false}` when the caller fetches the matches itself.
 */
export function SearchSelect({
  options,
  selectedLabel,
  selectedValue,
  onSelect,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  disabled,
  loading,
  onQueryChange,
  filterLocally = true,
}: {
  options: SearchOption[];
  /** What the closed control shows; empty shows the placeholder. */
  selectedLabel: string;
  /** Marks the option that is currently chosen. */
  selectedValue?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  filterLocally?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filterLocally && q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query, filterLocally]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    onQueryChange?.("");
  }, [onQueryChange]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open, close]);

  function pick(value: string) {
    onSelect(value);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // keep a surrounding dialog open
      close();
    }
  }

  return (
    <div ref={root} className="relative w-full min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent py-1 pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>{selectedLabel || placeholder}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-56 rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                onQueryChange?.(e.target.value);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-60 overflow-auto pb-1">
            {loading && <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>}
            {!loading && shown.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>}
            {shown.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === selectedValue}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
                    i === active && "bg-accent text-accent-foreground",
                    o.value === selectedValue && "font-medium",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                  {o.value === selectedValue && <CheckIcon className="size-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
