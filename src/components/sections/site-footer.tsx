import { Heart } from "lucide-react";
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

/** Full Labrys wordmark (diamond + "LABRYS" text), themed via currentColor. */
function LabrysMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 438 116"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M112 90V20H128V76H157V90H112ZM182 35C189.062 35 194.37 37.5345 198.001 41.977L198 36H214V90H198L198.001 84.023C194.37 88.4655 189.062 91 182 91C167.088 91 160 79.7011 160 63C160 46.2989 167.088 35 182 35ZM187 49C179.544 49 176 54.6495 176 63C176 71.3505 179.544 77 187 77C194.456 77 198 71.3505 198 63C198 54.6495 194.456 49 187 49ZM238 20L238 41.976C241.631 37.5341 246.938 35 254 35C268.912 35 276 46.2989 276 63C276 79.7011 268.912 91 254 91C246.938 91 241.631 88.4659 238 84.024L238 90H222V20H238ZM249 49C241.544 49 238 54.6495 238 63C238 71.3505 241.544 77 249 77C256.456 77 260 71.3505 260 63C260 54.6495 256.456 49 249 49ZM314 35C314.683 35 315.35 35.0237 316.001 35.0706L316.002 49.9791C314.38 49.3409 312.125 49 308.996 49C301.543 49 298 54.6495 298 63V90H282V36H298L298 41.976C301.631 37.5341 306.938 35 314 35ZM320 36L339 90C339 94.4183 335.418 98 331 98H323V112H331.469C340.78 112 349.082 106.139 352.199 97.3648L374 36H357L347 70L337 36H320ZM400 35C411.419 35 419.068 40.4472 422.992 46.0488L411.173 52.7641C408.88 50.0839 404.265 49.0558 399.405 49.0022L399 49C395.024 49 392 49.8593 392 52C392 54.1241 394.851 55.1422 398.429 55.8849L398.999 56.001L399.486 56.0769L400.457 56.2382C414.557 58.6763 421.992 64.3297 421.992 74C421.992 84 414.37 91 397.992 91C386.573 91 378.924 85.5528 375 79.9512L386.819 73.2359C389.176 75.9905 393.985 77 398.992 77L399.553 76.9941C403.249 76.9153 405.992 76.0388 405.992 74C405.992 71.8759 403.141 70.8578 399.563 70.1151L398.991 69.999L398.506 69.9231L397.535 69.7618C383.435 67.3237 376 61.6703 376 52C376 42 383.622 35 400 35Z"
        fill="currentColor"
      />
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
            <div className="flex items-center gap-2 leading-none">
              <Image
                src="/mev-watch-logo-light.png"
                alt="MEV Watch"
                width={1702}
                height={413}
                sizes="288px"
                className="block h-16 w-auto dark:hidden"
              />
              <Image
                src="/mev-watch-logo-dark.png"
                alt="MEV Watch"
                width={1694}
                height={408}
                sizes="288px"
                className="hidden h-16 w-auto dark:block"
              />
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
          <div className="flex flex-col">
            <FooterLinkList heading="CONNECT" links={CONNECT_LINKS} />
            <a
              href="https://labrys.io"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto self-end inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.06em] text-fg-muted hover:text-accent-brand transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm"
            >
              <span>Made with</span>
              <Heart
                className="h-3.5 w-3.5 fill-red-500 text-red-500"
                aria-hidden="true"
              />
              <span>by</span>
              <LabrysMark className="h-5 w-auto" />
              <span className="sr-only">Labrys</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
