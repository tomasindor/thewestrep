import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@neondatabase/serverless"],
  experimental: {
    lockDistDir: process.env.PLAYWRIGHT === "1" ? false : undefined,
  },
};

export default nextConfig;
