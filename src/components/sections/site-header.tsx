"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: "OVERVIEW", href: "/" },
  { label: "RELAYS", href: "/explorer" },
  { label: "METHODOLOGY", href: "/methodology" },
  { label: "API", href: "/api-docs" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background flex justify-between items-center py-4 border-b border-border-labrys">
      {/* Brand lockup — home link */}
      <Link
        href="/"
        aria-label="MEV Watch home"
        className="flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm"
      >
        {/* Labrys gradient mark */}
        <div className="w-9 h-9 grid place-items-center shrink-0">
          <svg
            viewBox="0 0 71 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="w-8 h-8 block"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.821894 8.68808L14.8565 16.7872L14.8573 41.0846L35.9078 53.2193L35.9131 69.4083L0.820312 49.1725L0.821894 8.68808Z"
              fill="url(#sh_b0)"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M70.9985 8.68832L56.963 16.785V41.0846L35.9126 53.2194L35.9072 69.4083L71 49.1725L70.9985 8.68832Z"
              fill="url(#sh_b1)"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.821777 8.6881L14.8572 0.591644L35.9103 12.8726L56.9642 0.591644L70.9989 8.68833L35.913 28.9532L0.821777 8.6881Z"
              fill="url(#sh_b2)"
            />
            <defs>
              <linearGradient
                id="sh_b0"
                x1="26.6981"
                y1="29.5397"
                x2="0.820315"
                y2="50.5928"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#204B8B" />
                <stop offset="1" stopColor="#360D9E" />
              </linearGradient>
              <linearGradient
                id="sh_b1"
                x1="53.4536"
                y1="8.68832"
                x2="53.4536"
                y2="69.4083"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#02D390" />
                <stop offset="1" stopColor="#3838BF" />
              </linearGradient>
              <linearGradient
                id="sh_b2"
                x1="0.820064"
                y1="7.60935"
                x2="70.9972"
                y2="7.60936"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#3163CA" />
                <stop offset="1" stopColor="#00EF9F" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand name */}
        <div className="font-mono text-sm tracking-[0.04em]">
          <span className="text-foreground font-semibold">MEVWATCH</span>
          <span className="text-fg-muted">{" // MONITOR"}</span>
        </div>
      </Link>

      {/* Nav + theme toggle */}
      <div className="flex items-center gap-6">
        <nav className="flex gap-6" aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`font-mono text-[11px] tracking-[0.12em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm ${
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
    </header>
  );
}
