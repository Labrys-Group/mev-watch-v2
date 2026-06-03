import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollProgress } from "@/components/scroll-progress";
import {
  OPEN_GRAPH_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_HANDLE,
  TWITTER_IMAGE,
  baseJsonLd,
} from "@/config/seo";
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

export function getValidatedGtmId(value: string | undefined): string | null {
  return value && /^GTM-[A-Z0-9]+$/.test(value) ? value : null;
}

export function getGtmInitScript(gtmId: string): string {
  const serializedGtmId = JSON.stringify(gtmId);
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${serializedGtmId});`;
}

const GTM_ID = getValidatedGtmId(process.env.NEXT_PUBLIC_GTM_ID);

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
    images: [OPEN_GRAPH_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: { url: "/apple-icon", sizes: "180x180", type: "image/png" },
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(baseJsonLd) }}
        />
        {GTM_ID ? (
          <Script id="gtm-init" strategy="afterInteractive">
            {getGtmInitScript(GTM_ID)}
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
