import Image from "next/image";
import Link from "next/link";
import type * as React from "react";

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

/** LinkedIn brand mark. */
function LinkedinMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

/** Facebook brand mark. */
function FacebookMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/** Instagram brand mark. */
function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
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
    label: "X (Twitter)",
    href: "https://x.com/labrys_io",
    external: true,
    Icon: XMark,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/labrys-io",
    external: true,
    Icon: LinkedinMark,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/labrys.io",
    external: true,
    Icon: FacebookMark,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/labrys.io/?hl=en",
    external: true,
    Icon: InstagramMark,
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
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          {/* Brand column — full width on mobile, single col on desktop */}
          <div className="col-span-2 flex flex-col gap-5 sm:col-span-1">
            <div className="flex items-center gap-2 leading-none">
              <span className="inline-flex h-[30px] items-center overflow-hidden">
                <Image
                  src="/mev-watch-logo-light.png"
                  alt="MEV Watch"
                  width={2280}
                  height={584}
                  sizes="150px"
                  className="block h-9 w-auto max-w-none dark:hidden"
                />
                <Image
                  src="/mev-watch-logo-dark.png"
                  alt="MEV Watch"
                  width={2280}
                  height={584}
                  sizes="150px"
                  className="hidden h-9 w-auto max-w-none dark:block"
                />
              </span>
              <span className="font-mono text-[16px] tracking-[0.06em] text-fg-muted">
                {" // MONITOR"}
              </span>
            </div>

            <p className="font-mono text-[12px] leading-[1.7] text-fg-muted max-w-[440px] m-0">
              An open-source transparency tool for Ethereum block production.
              Track relay dominance, builder diversity, and censorship exposure
              in real time.
            </p>
          </div>

          <FooterLinkList heading="SITE" links={SITE_LINKS} />
          <div>
            <h5 className="font-mono text-[10px] tracking-[0.18em] uppercase text-fg-muted/50 m-0 mb-4">
              CONNECT
            </h5>
            <ul className="list-none m-0 p-0 flex items-center gap-4 mb-2">
              {CONNECT_LINKS.map(({ label, href, Icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex items-center justify-center text-fg-muted hover:text-accent-brand transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm"
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0" />
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="https://labrys.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm"
            >
              <Image
                src="/made-with-dark.png"
                alt="Made with love by Labrys"
                width={6156}
                height={1003}
                sizes="150px"
                className="block h-6 w-auto dark:hidden"
              />
              <Image
                src="/made-with-light.png"
                alt="Made with love by Labrys"
                width={6156}
                height={1003}
                sizes="150px"
                className="hidden h-6 w-auto dark:block"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
