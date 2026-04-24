import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admin image uploads use a server action that receives a File payload.
    // Raise the default 1 MB action body limit so Vercel production accepts normal image uploads.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
