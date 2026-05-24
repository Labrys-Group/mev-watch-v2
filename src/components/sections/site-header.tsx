"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: "OVERVIEW", href: "/" },
  { label: "METHODOLOGY", href: "/methodology" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-labrys bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-6">
        {/* Brand lockup — home link */}
        <Link
          href="/"
          aria-label="MEV Watch home"
          className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm"
        >
          <span className="inline-flex h-[30px] items-center overflow-hidden">
            <Image
              src="/mev-watch-logo-light.png"
              alt="MEV Watch"
              width={1702}
              height={413}
              priority
              sizes="150px"
              className="block h-9 w-auto max-w-none dark:hidden"
            />
            <Image
              src="/mev-watch-logo-dark.png"
              alt="MEV Watch"
              width={1694}
              height={408}
              priority
              sizes="150px"
              className="hidden h-9 w-auto max-w-none dark:block"
            />
          </span>
          <span className="hidden font-mono text-[16px] tracking-[0.04em] text-fg-muted sm:inline">
            {" // MONITOR"}
          </span>
        </Link>

        {/* Desktop nav + theme toggle */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex gap-6" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  data-active={isActive}
                  className={`nav-underline relative font-mono text-[12px] tracking-[0.12em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm ${
                    isActive
                      ? "text-foreground"
                      : "text-fg-muted hover:text-accent-brand"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-0.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-sm text-fg-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand"
          >
            {menuOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav
          className="border-t border-border-labrys bg-background md:hidden"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`block border-b border-border-labrys px-4 py-3 font-mono text-[12px] tracking-[0.12em] uppercase transition-colors last:border-b-0 ${
                  isActive
                    ? "bg-panel-alt text-foreground"
                    : "text-fg-muted hover:text-accent-brand"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
