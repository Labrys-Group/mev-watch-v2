import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MEV Watch — Ethereum MEV-boost censorship",
    short_name: "MEV Watch",
    description:
      "A public transparency tool tracking censoring and non-censoring Ethereum MEV-boost relay flow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    categories: ["finance", "utilities", "news"],
    lang: "en-US",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "256x256",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
  };
}
