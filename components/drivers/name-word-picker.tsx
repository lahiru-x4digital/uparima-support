"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

function splitWords(fullName: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const word of fullName.trim().split(/\s+/)) {
    if (!word) continue;
    const key = word.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      words.push(word);
    }
  }
  return words;
}

/**
 * Builds a driver's preferred display name by toggling individual words out of the first and last
 * name (e.g. "NISHAN MADHUSHANKA RAJAPAKSHA" -> "NISHAN RAJAPAKSHA") — never free text, so the
 * result stays a verifiable subset of the name on file (the backend re-checks this regardless, see
 * DriversService.isNameWordSubset).
 */
export function NameWordPicker({
  fullName,
  value,
  onChange,
}: {
  fullName: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const words = useMemo(() => splitWords(fullName), [fullName]);
  const selectedWords = useMemo(
    () => new Set(value.trim().toUpperCase().split(/\s+/).filter(Boolean)),
    [value],
  );

  // Keep the previously selected words that still exist in the (possibly just-edited) name and
  // drop the rest, instead of leaving a stale word in the value that no chip represents.
  useEffect(() => {
    if (!value.trim()) return;
    const validWords = new Set(words.map((w) => w.toUpperCase()));
    const next = value
      .trim()
      .split(/\s+/)
      .filter((w) => validWords.has(w.toUpperCase()))
      .join(" ");
    if (next !== value) onChange(next);
    // Only when the source name changes, not on every value edit this component causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName]);

  if (words.length === 0) return null;

  function toggle(word: string) {
    const key = word.toUpperCase();
    const next = new Set(selectedWords);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // Always rejoin in the name's own word order, not selection order.
    onChange(words.filter((w) => next.has(w.toUpperCase())).join(" "));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word) => {
        const selected = selectedWords.has(word.toUpperCase());
        return (
          <button
            key={word}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(word)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selected
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card hover:border-ring",
            )}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}
