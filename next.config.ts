import type { NextConfig } from "next";

const disableDistDirLock = process.env.PLAYWRIGHT === "1" || process.cwd().startsWith("/mnt/");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    lockDistDir: disableDistDirLock ? false : undefined,
  },
};

export default nextConfig;
