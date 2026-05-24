import type { MetadataRoute } from "next";

const SITE_URL = "https://www.mevwatch.info";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/status`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.5,
    },
  ];
}
