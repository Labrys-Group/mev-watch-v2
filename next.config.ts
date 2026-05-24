import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve the bundled understand-anything dashboard at /understanding-anything.
  // The static assets live under public/understanding-anything/ and are served
  // directly by Next.js; this rewrite only handles the bare entry path so a user
  // hitting /understanding-anything (no trailing slash) lands on index.html
  // instead of a 404.
  async rewrites() {
    return [
      {
        source: "/understanding-anything",
        destination: "/understanding-anything/index.html",
      },
    ];
  },
};

export default nextConfig;
