"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A search field that applies on Enter / the magnifier, not on every key, with a clear button.
 * `onSearch` gets the applied term ("" when cleared).
 */
export function SearchBox({
  placeholder,
  onSearch,
  className,
}: {
  placeholder: string;
  onSearch: (term: string) => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className={cn("relative w-full sm:w-80", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value);
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={value ? "pr-16" : "pr-9"}
      />
      <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              onSearch("");
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Search className="size-4" />
        </button>
      </div>
    </form>
  );
}
