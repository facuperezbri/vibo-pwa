import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA Configuration will be added here
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Suppress font warnings (these are informational only)
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Silence font override warnings
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;

