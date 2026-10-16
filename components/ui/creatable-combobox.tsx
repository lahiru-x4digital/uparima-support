"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string };

/**
 * A text box with suggestions. Typing filters `options`; picking one (click, Enter) selects it. Text
 * that matches no option is kept as a new entry: `onCreate(text)` turns it into a value (shown as
 * "Add …" while typing). Leaving the box commits what's typed — an exact match (any letter case)
 * selects that option instead of creating a duplicate.
 */
export function CreatableCombobox({
  options,
  value,
  selectedLabel,
  onChange,
  onCreate,
  formatNew = (t) => t.trim(),
  placeholder,
  disabled,
  invalid,
  name,
}: {
  options: ComboOption[];
  value: string;
  /** What the box shows for `value` (an option's label, or a new entry's text). */
  selectedLabel: string;
  onChange: (value: string) => void;
  /** The value for a typed entry that isn't in `options`. */
  onCreate: (text: string) => string;
  /** How a typed entry is tidied before it's kept (e.g. capitalised). */
  formatNew?: (text: string) => string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
}) {
  // What's typed while editing; null shows `selectedLabel` (so outside changes show up on their own).
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? selectedLabel;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  const typed = formatNew(text);
  const exact = typed ? options.find((o) => o.label.toLowerCase() === typed.toLowerCase()) : undefined;
  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, text]);
  // The "Add …" row comes last, after the matches.
  const canAdd = !!typed && !exact;
  const rowCount = shown.length + (canAdd ? 1 : 0);

  function commit(next: string) {
    if (next !== value) onChange(next);
    setDraft(null);
    setOpen(false);
  }

  // What the box holds when it's left: the matching option, a new entry, or nothing.
  function commitTyped() {
    if (draft === null) return setOpen(false); // opened, nothing typed
    if (!typed) return commit("");
    if (exact) return commit(exact.value);
    commit(onCreate(typed));
  }

  function pickRow(i: number) {
    if (i < shown.length) commit(shown[i].value);
    else commitTyped();
  }

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) commitTyped();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  });

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (rowCount) pickRow(active);
      else commitTyped();
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation(); // keep a surrounding dialog open
      setDraft(null);
      setOpen(false);
    } else if (e.key === "Tab" && open) {
      commitTyped();
    }
  }

  return (
    <div ref={root} className="relative w-full min-w-0">
      <input
        name={name}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
      />
      <ChevronDownIcon className="pointer-events-none absolute top-2 right-2 size-4 text-muted-foreground" />

      {open && !disabled && rowCount > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full min-w-56 overflow-auto rounded-lg border bg-popover py-1 text-popover-foreground shadow-md"
        >
          {shown.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the box
                onMouseEnter={() => setActive(i)}
                onClick={() => pickRow(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
                  i === active && "bg-accent text-accent-foreground",
                  o.value === value && "font-medium",
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <CheckIcon className="size-4 shrink-0" />}
              </button>
            </li>
          ))}
          {canAdd && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(shown.length)}
                onClick={() => pickRow(shown.length)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                  active === shown.length && "bg-accent text-accent-foreground",
                )}
              >
                <PlusIcon className="size-4 shrink-0" />
                <span className="truncate">
                  Add “<span className="font-medium">{typed}</span>”
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
