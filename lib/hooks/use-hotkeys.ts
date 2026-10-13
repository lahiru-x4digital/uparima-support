"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard shortcuts for a screen. Keys are written like "e", "1", "mod+enter" ("mod" is Ctrl, or
 * ⌘ on a Mac). Plain keys are ignored while the agent is typing in a field, so "e" in a name
 * doesn't open the editor; "mod+…" combos always work. Handlers are read from a ref, so passing a
 * fresh object each render doesn't re-subscribe.
 */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, { enabled = true } = {}) {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const combo = mod ? `mod+${key}` : e.altKey || e.shiftKey ? null : key;
      if (!combo) return;
      const handler = mapRef.current[combo];
      if (!handler) return;
      if (!mod && isTyping(e.target)) return;
      e.preventDefault();
      handler(e);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
