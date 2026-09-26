import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Up to 6 listing photos, each compressed in the browser to well under 1.5 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
