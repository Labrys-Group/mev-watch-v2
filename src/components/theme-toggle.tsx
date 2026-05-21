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
      className="focus-visible:ring-accent-brand"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Sun: visible in dark mode, fades out in light mode */}
      <Sun className="absolute h-4 w-4 transition-opacity duration-200 opacity-0 dark:opacity-100" />
      {/* Moon: visible in light mode, fades out in dark mode */}
      <Moon className="absolute h-4 w-4 transition-opacity duration-200 opacity-100 dark:opacity-0" />
    </Button>
  );
}
