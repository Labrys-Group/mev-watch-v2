import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollProgress } from "@/components/scroll-progress";
import { FAQ_ITEMS } from "@/config/faq";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-sans-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://www.mevwatch.info";
const SITE_NAME = "MEV Watch";
const SITE_TITLE = `${SITE_NAME} — censoring relay share on Ethereum MEV-boost`;
const SITE_DESCRIPTION =
  "A public transparency tool tracking censoring and non-censoring Ethereum MEV-boost relay flow. Daily metrics and relay leaderboards.";
const OG_IMAGE_ALT =
  "MEV Watch — censoring relay share on Ethereum MEV-boost";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// `metadataBase` resolves every relative metadata URL (og:image, twitter:image,
// favicons). On Vercel preview deployments we point it at the deployment
// itself so sharing the preview URL pulls THAT build's preview.png rather
// than production's stale one. Production and local dev keep the canonical
// host. `alternates.canonical` is set to an absolute SITE_URL below so
// previews never claim canonical authority over the real site.
const METADATA_BASE_URL =
  process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "MEV",
    "MEV-boost",
    "censoring",
    "non-censoring",
    "Ethereum",
    "censorship",
    "relays",
    "Tornado Cash",
    "transparency",
    "block builders",
    "Flashbots",
    "Labrys",
  ],
  authors: [{ name: "Labrys", url: "https://labrys.io" }],
  creator: "Labrys",
  publisher: "Labrys",
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    // Absolute, always production — even on Vercel preview deployments the
    // canonical points at the real site so previews don't compete with
    // production in search results.
    canonical: `${SITE_URL}/`,
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@labrys_io",
    creator: "@labrys_io",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/preview.png",
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: { url: "/favicon.ico", sizes: "256x256" },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Labrys",
      url: "https://labrys.io",
      logo: `${SITE_URL}/mev-watch-logo-light.png`,
      sameAs: ["https://twitter.com/labrys_io", "https://labrys.io"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en-US",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "AnalyticsApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "Dataset",
      "@id": `${SITE_URL}/#dataset`,
      name: "Ethereum MEV-boost relay censorship — daily delivery share",
      description:
        "Daily share of Ethereum MEV-boost relay payload deliveries attributable to OFAC-censoring relays, derived from relayscan.io. Maintained by Labrys.",
      url: SITE_URL,
      keywords: [
        "Ethereum",
        "MEV-boost",
        "OFAC",
        "censorship",
        "relays",
        "transparency",
      ],
      creator: { "@id": `${SITE_URL}/#org` },
      publisher: { "@id": `${SITE_URL}/#org` },
      isAccessibleForFree: true,
      license: "https://opensource.org/licenses/MIT",
      temporalCoverage: "2022-09-15/..",
      spatialCoverage: "Ethereum mainnet",
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${SITE_URL}/api/v1/summary`,
        },
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${SITE_URL}/api/v1/trend`,
        },
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${SITE_URL}/api/v1/relays`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {GTM_ID ? (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          </>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {GTM_ID ? (
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        ) : null}
      </head>
      <body className={`${manrope.variable} ${splineSansMono.variable}`}>
        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {/* Without JS the scroll observer never fires — keep content visible. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <ThemeProvider>
          {/* Fixed page-wide blueprint grid, behind all content */}
          <div className="bg-grid" aria-hidden="true" />
          <ScrollProgress />
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
