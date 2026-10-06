"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Toggles the `.dark` class on <html> and remembers the choice (see THEME_SCRIPT in app/layout.tsx). */
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("support_theme", dark ? "dark" : "light");
    } catch {
      /* storage unavailable — theme just won't persist */
    }
  }
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
