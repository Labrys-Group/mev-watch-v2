import Link from "next/link";

const DATA_LINKS = [
  { label: "Methodology", href: "/methodology", external: false },
  { label: "Relays", href: "/explorer", external: false },
] as const;

const RESOURCE_LINKS = [
  { label: "Embed widget", href: "/embed", external: false },
  {
    label: "GitHub",
    href: "https://github.com/Labrys-Group/mev-watch",
    external: true,
  },
] as const;

const CONNECT_LINKS = [
  { label: "Labrys", href: "https://labrys.io", external: true },
  {
    label: "X / Twitter",
    href: "https://twitter.com/labrys_io",
    external: true,
  },
] as const;

function FooterLinkList({
  heading,
  links,
}: {
  heading: string;
  links: ReadonlyArray<{ label: string; href: string; external: boolean }>;
}) {
  return (
    <div>
      <h5 className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-fg-muted m-0 mb-3">
        {heading}
      </h5>
      {links.map(({ label, href, external }) =>
        external ? (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-[12px] tracking-[0.06em] text-fg-muted mb-1.5 hover:text-accent-brand transition-colors"
          >
            {label}
          </a>
        ) : (
          <Link
            key={href}
            href={href}
            className="block font-mono text-[12px] tracking-[0.06em] text-fg-muted mb-1.5 hover:text-accent-brand transition-colors"
          >
            {label}
          </Link>
        )
      )}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-panel-alt pt-8 pb-8 border-t border-border-labrys mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-8 font-mono text-[11px] tracking-[0.06em] text-fg-muted">
        {/* Brand column */}
        <div>
          {/* Brand mark + name */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-9 h-9 grid place-items-center shrink-0">
              {/* Labrys blurple mark — footer */}
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
                  d="M0.366815 8.68875L14.4011 16.7877L14.4019 41.0845L35.4519 53.219L35.4572 69.4075L0.365234 49.1722L0.366815 8.68875Z"
                  fill="#4F0CE5"
                />
                <path
                  opacity="0.7"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M70.542 8.689L56.507 16.7855V41.0845L35.457 53.219L35.4517 69.4076L70.5436 49.1722L70.542 8.689Z"
                  fill="#4F0CE5"
                />
                <path
                  opacity="0.5"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.367188 8.6887L14.4023 0.592438L35.4549 12.8731L56.5083 0.592438L70.5426 8.68893L35.4576 28.9533L0.367188 8.6887Z"
                  fill="#4F0CE5"
                />
              </svg>
            </div>
            <div className="font-mono text-sm tracking-[0.04em]">
              <span className="text-foreground font-semibold">MEVWATCH</span>
              <span className="text-fg-muted">{" // v3"}</span>
            </div>
          </div>

          {/* Blurb */}
          <p className="font-mono text-[12px] text-fg-muted max-w-sm leading-[1.6] m-0 mb-5">
            An open transparency tool for Ethereum. Built by Labrys.
          </p>

          {/* Made with Labrys lockup */}
          <div className="flex flex-col gap-2.5 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted">
            <span>MADE WITH</span>
            {/* Labrys wordmark — fill="currentColor" so it inherits text-fg-muted and works in both themes */}
            <svg
              viewBox="0 0 438 116"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Labrys"
              className="h-[38px] w-auto text-fg-muted"
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
          </div>
        </div>

        {/* Link columns */}
        <FooterLinkList heading="DATA" links={DATA_LINKS} />
        <FooterLinkList heading="RESOURCES" links={RESOURCE_LINKS} />
        <FooterLinkList heading="CONNECT" links={CONNECT_LINKS} />
      </div>
    </footer>
  );
}
