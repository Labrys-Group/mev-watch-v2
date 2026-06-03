import type { MetadataRoute } from "next";

const SITE_URL = "https://www.mevwatch.info";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Methodology is editorial; pin it to a known revision date so search engines
  // don't see a constantly-bumping lastmod on a page whose copy hasn't changed.
  const methodologyLastModified = new Date("2026-06-03T00:00:00Z");

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/methodology`,
      lastModified: methodologyLastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/status`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.4,
    },
  ];
}
