import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    // Thumbnails come from arbitrary URLs the admin pastes (GitHub-hosted images,
    // external CDNs, etc.). Allow any https host. We use `unoptimized` on the
    // <Image> tags for external thumbnails so they bypass the optimizer anyway,
    // but declaring remotePatterns keeps Next.js from emitting warnings.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
