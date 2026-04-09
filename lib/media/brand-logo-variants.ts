import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";

const preferredBrandLogoCache = new Map<string, Promise<string>>();

function splitAssetSuffix(assetPath: string) {
  const match = assetPath.match(/^([^?#]+)([?#].*)?$/);

  return {
    pathname: match?.[1] ?? assetPath,
    suffix: match?.[2] ?? "",
  };
}

function buildWhiteVariantAssetPath(assetPath: string) {
  if (!assetPath.startsWith("/")) {
    return null;
  }

  const { pathname, suffix } = splitAssetSuffix(assetPath);

  if (path.posix.extname(pathname).toLowerCase() !== ".svg" || pathname.endsWith("-white.svg")) {
    return null;
  }

  const parsedPath = path.posix.parse(pathname);

  return `${path.posix.join(parsedPath.dir, `${parsedPath.name}-white.svg`)}${suffix}`;
}

async function publicAssetExists(assetPath: string) {
  const { pathname } = splitAssetSuffix(assetPath);

  try {
    await access(path.join(process.cwd(), "public", pathname.slice(1)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer a colocated `-white.svg` asset when the brand image points at a local SVG.
 * Remote URLs and non-SVG assets keep their original source unchanged.
 */
export async function resolvePreferredBrandLogoSrc(assetPath?: string) {
  if (!assetPath) {
    return undefined;
  }

  const cachedResult = preferredBrandLogoCache.get(assetPath);

  if (cachedResult) {
    return cachedResult;
  }

  const resolution = (async () => {
    const preferredVariantPath = buildWhiteVariantAssetPath(assetPath);

    if (!preferredVariantPath) {
      return assetPath;
    }

    return (await publicAssetExists(preferredVariantPath)) ? preferredVariantPath : assetPath;
  })();

  preferredBrandLogoCache.set(assetPath, resolution);

  return resolution;
}
