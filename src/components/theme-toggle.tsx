"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="overflow-hidden focus-visible:ring-accent-brand hover:text-accent-brand"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Sun: visible in dark mode, rotates + scales out in light mode */}
      <Sun className="absolute h-4 w-4 rotate-90 scale-0 opacity-0 transition-all duration-300 ease-out dark:rotate-0 dark:scale-100 dark:opacity-100" />
      {/* Moon: visible in light mode, rotates + scales out in dark mode */}
      <Moon className="absolute h-4 w-4 rotate-0 scale-100 opacity-100 transition-all duration-300 ease-out dark:-rotate-90 dark:scale-0 dark:opacity-0" />
    </Button>
  );
}
