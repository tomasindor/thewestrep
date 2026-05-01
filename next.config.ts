import type { NextConfig } from "next";

const disableDistDirLock = process.env.PLAYWRIGHT === "1" || process.cwd().startsWith("/mnt/");
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;

const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
const r2Hostname = (() => {
  if (!r2PublicBaseUrl) return null;
  try {
    return new URL(r2PublicBaseUrl).hostname;
  } catch {
    return null;
  }
})();

const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [];

if (r2Hostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: r2Hostname,
  });
}

if (cloudinaryCloudName) {
  remotePatterns.push({
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: `/${cloudinaryCloudName}/image/upload/**`,
    search: "",
  });
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.101.16", "localhost"],
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    remotePatterns,
  },
  experimental: {
    lockDistDir: disableDistDirLock ? false : undefined,
  },
};

export default nextConfig;
