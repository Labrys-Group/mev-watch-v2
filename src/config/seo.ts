import { FAQ_ITEMS } from "@/config/faq";

export const SITE_URL = "https://www.mevwatch.info";
export const SITE_NAME = "MEV Watch";
export const SITE_TITLE = `${SITE_NAME} — censoring relay share on Ethereum MEV-boost`;
export const SITE_DESCRIPTION =
  "A public transparency tool tracking censoring and non-censoring Ethereum MEV-boost relay flow. Daily metrics and relay leaderboards.";
export const OG_IMAGE_ALT =
  "MEV Watch — censoring relay share on Ethereum MEV-boost";
export const TWITTER_HANDLE = "@labrys_io";

export const OPEN_GRAPH_IMAGE = {
  url: "/preview.png",
  width: 1200,
  height: 630,
  alt: OG_IMAGE_ALT,
  type: "image/png",
} as const;

export const TWITTER_IMAGE = {
  url: "/preview.png",
  alt: OG_IMAGE_ALT,
} as const;

export const baseJsonLd = {
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
  ],
} as const;

export function getFaqJsonLd() {
  return {
    "@context": "https://schema.org",
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
  };
}
