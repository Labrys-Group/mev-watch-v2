import Link from "next/link";
import type * as React from "react";
import { MevMark } from "@/components/mev-mark";

/** GitHub brand mark. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** X (formerly Twitter) brand mark. */
function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Compact Labrys diamond mark, extracted from the wordmark SVG. */
function LabrysMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="16 16 80 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.0018 27.2297L32.0009 36.4625L32.0018 64.1609L55.9988 77.9942L56.0048 96.4492L16 73.3809L16.0018 27.2297Z"
        fill="currentColor"
      />
      <path
        opacity="0.7"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M96.0018 27.23L80.0018 36.46V64.1609L56.0049 77.9942L55.9988 96.4492L96.0036 73.3809L96.0018 27.23Z"
        fill="currentColor"
      />
      <path
        opacity="0.5"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.0017 27.2297L32.0017 18L56.0017 32L80.0026 18L96.0017 27.23L56.0048 50.3314L16.0017 27.2297Z"
        fill="currentColor"
      />
    </svg>
  );
}

type FooterIcon = (props: { className?: string }) => React.ReactElement;

interface FooterLink {
  label: string;
  href: string;
  external: boolean;
  Icon?: FooterIcon;
}

const SITE_LINKS: ReadonlyArray<FooterLink> = [
  { label: "Methodology", href: "/methodology", external: false },
  { label: "Status", href: "/status", external: false },
];

const CONNECT_LINKS: ReadonlyArray<FooterLink> = [
  {
    label: "GitHub",
    href: "https://github.com/joshroyLabrys/mev-watch-v2",
    external: true,
    Icon: GithubMark,
  },
  {
    label: "X",
    href: "https://twitter.com/labrys_io",
    external: true,
    Icon: XMark,
  },
  {
    label: "Labrys",
    href: "https://labrys.io",
    external: true,
    Icon: LabrysMark,
  },
];

const LINK_CLASS =
  "inline-flex items-center gap-2 w-fit font-mono text-[12px] tracking-[0.06em] text-fg-muted mb-2 hover:text-accent-brand hover:translate-x-[3px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm";

function FooterLinkList({
  heading,
  links,
}: {
  heading: string;
  links: ReadonlyArray<FooterLink>;
}) {
  return (
    <div>
      <h5 className="font-mono text-[10px] tracking-[0.18em] uppercase text-fg-muted/50 m-0 mb-4">
        {heading}
      </h5>
      <ul className="list-none m-0 p-0 space-y-0">
        {links.map(({ label, href, external, Icon }) => {
          const content = (
            <>
              {Icon ? (
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : null}
              <span>{label}</span>
            </>
          );
          return external ? (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
              >
                {content}
              </a>
            </li>
          ) : (
            <li key={href}>
              <Link href={href} className={LINK_CLASS}>
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-panel-alt border-t border-border-labrys mt-6">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-9">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          {/* Brand column */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-9 h-9 grid place-items-center">
                <MevMark className="w-5 h-5" />
              </div>
              <div className="leading-none">
                <span className="font-mono text-[13px] tracking-[0.06em] font-semibold text-foreground">
                  MEVWATCH
                </span>
                <span className="font-mono text-[13px] tracking-[0.06em] text-fg-muted">
                  {" // MONITOR"}
                </span>
              </div>
            </div>

            <p className="font-mono text-[12px] leading-[1.7] text-fg-muted max-w-[440px] m-0">
              An open-source transparency tool for Ethereum block production.
              Track relay dominance, builder diversity, and censorship exposure
              in real time.
            </p>
          </div>

          <FooterLinkList heading="SITE" links={SITE_LINKS} />
          <FooterLinkList heading="CONNECT" links={CONNECT_LINKS} />
        </div>
      </div>
    </footer>
  );
}
