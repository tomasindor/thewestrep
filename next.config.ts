import type { NextConfig } from "next";

const disableDistDirLock = process.env.PLAYWRIGHT === "1" || process.cwd().startsWith("/mnt/");
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.101.16", "localhost"],
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    remotePatterns: cloudinaryCloudName
      ? [
          {
            protocol: "https",
            hostname: "res.cloudinary.com",
            pathname: `/${cloudinaryCloudName}/image/upload/**`,
            search: "",
          },
        ]
      : [],
  },
  experimental: {
    lockDistDir: disableDistDirLock ? false : undefined,
  },
};

export default nextConfig;
