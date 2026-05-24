import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollProgress } from "@/components/scroll-progress";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-sans-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.mevwatch.info";
const SITE_NAME = "MEV Watch";
const SITE_DESCRIPTION =
  "A public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks. Daily metrics, relay leaderboards, and a live per-slot ledger.";
const GA_MEASUREMENT_ID = "G-542FSGYLE8";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — OFAC censorship on Ethereum MEV-boost`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "MEV",
    "MEV-boost",
    "OFAC",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — OFAC censorship on Ethereum MEV-boost`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "MEV Watch — OFAC censorship on Ethereum MEV-boost",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@labrys_io",
    creator: "@labrys_io",
    title: `${SITE_NAME} — OFAC censorship on Ethereum MEV-boost`,
    description: SITE_DESCRIPTION,
    images: ["/preview.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/mev-watch-logo-light.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
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
      sameAs: ["https://twitter.com/labrys_io"],
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
      description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#org` },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${manrope.variable} ${splineSansMono.variable}`}>
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });`}
        </Script>
      </body>
    </html>
  );
}
