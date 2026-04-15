import * as cheerio from "cheerio";

import { uniqueValues } from "@/lib/utils";

const YUPOO_VARIANT_PRIORITY = ["square", "small", "medium", "big", "original", "raw"] as const;

const YUPOO_VARIANT_RANK: Record<(typeof YUPOO_VARIANT_PRIORITY)[number], number> =
  YUPOO_VARIANT_PRIORITY.reduce((accumulator, token, index) => {
    accumulator[token] = index + 1;
    return accumulator;
  }, {} as Record<(typeof YUPOO_VARIANT_PRIORITY)[number], number>);

const YUPOO_VARIANT_TOKENS = ["square", "small", "medium", "big", "original"] as const;

type YupooVariantToken = (typeof YUPOO_VARIANT_TOKENS)[number] | "raw";

export interface YupooImageCandidate {
  url: string;
  previewUrl: string;
}

function normalizeImageUrl(value: string | undefined | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("data:")) {
    return null;
  }

  if (normalized.startsWith("//")) {
    return `https:${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return null;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return null;
  }

  return normalized.replace(/^http:/i, "https:");
}

function isLikelyProductImage(url: string) {
  const lower = url.toLowerCase();

  try {
    const parsed = new URL(url);
    const isPhotoHost = parsed.hostname === "photo.yupoo.com";
    const hasImageExtension = /\.(jpg|jpeg|png|webp)$/i.test(parsed.pathname);

    if (!isPhotoHost || !hasImageExtension) {
      return false;
    }
  } catch {
    return false;
  }

  return ![
    "avatar",
    "logo",
    "icon",
    "sprite",
    "/thumb/",
    "blank.gif",
  ].some((fragment) => lower.includes(fragment));
}

function stripImageExtension(value: string) {
  return value.replace(/\.(jpg|jpeg|png|webp)$/i, "");
}

function stripYupooVariantToken(value: string) {
  return value
    .replace(/(^|[-_])(square|small|medium|big|original)(?=$|[-_])/gi, "$1")
    .replace(/[-_]{2,}/g, "-")
    .replace(/(^[-_]+|[-_]+$)/g, "");
}

function getYupooVariantTokenRegex(token: string) {
  return new RegExp(`(^|[/_-])${token}(?=($|[/_.-]))`, "i");
}

function looksLikeRawYupooAsset(baseName: string) {
  return Boolean(baseName) && !YUPOO_VARIANT_TOKENS.includes(baseName as (typeof YUPOO_VARIANT_TOKENS)[number]);
}

function getYupooVariantToken(url: URL): YupooVariantToken | null {
  const fileName = url.pathname.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  const baseName = stripImageExtension(fileName);

  if (baseName in YUPOO_VARIANT_RANK) {
    return baseName as YupooVariantToken;
  }

  if (looksLikeRawYupooAsset(baseName)) {
    return "raw";
  }

  const lowerPath = url.pathname.toLowerCase();

  for (const token of ["original", "big", "medium", "small", "square"] as const) {
    if (getYupooVariantTokenRegex(token).test(lowerPath)) {
      return token;
    }
  }

  return null;
}

export function getYupooVariantRank(imageUrl: string | URL) {
  const url = imageUrl instanceof URL ? imageUrl : new URL(imageUrl);
  const token = getYupooVariantToken(url);

  return token ? YUPOO_VARIANT_RANK[token] : 0;
}

function getFallbackYupooCanonicalKey(imageUrl: string) {
  const url = new URL(imageUrl);
  const normalizedSegments = url.pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !YUPOO_VARIANT_TOKENS.includes(segment.toLowerCase() as (typeof YUPOO_VARIANT_TOKENS)[number]))
    .map((segment, index, segments) => {
      const isFileName = index === segments.length - 1;

      if (!isFileName) {
        return segment.toLowerCase();
      }

      const extensionMatch = segment.match(/\.(jpg|jpeg|png|webp)$/i)?.[0].toLowerCase() ?? "";
      const baseName = stripYupooVariantToken(stripImageExtension(segment).toLowerCase());
      return `${baseName}${extensionMatch}`;
    });

  return `${url.hostname.toLowerCase()}/${normalizedSegments.join("/")}`;
}

export function getYupooCanonicalKey(imageUrl: string) {
  const url = new URL(imageUrl);
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const logicalGroupSegments = pathSegments.slice(0, -1).map((segment) => segment.toLowerCase());

  if (logicalGroupSegments.length > 0) {
    return `${url.hostname.toLowerCase()}/${logicalGroupSegments.join("/")}`;
  }

  return getFallbackYupooCanonicalKey(imageUrl);
}

export function canonicalizeYupooImageCandidates(imageUrls: string[]) {
  const bestImageByCanonicalKey = new Map<string, { url: string; rank: number; order: number }>();

  imageUrls.forEach((imageUrl, order) => {
    try {
      const parsed = new URL(imageUrl);

      if (parsed.hostname !== "photo.yupoo.com") {
        const key = imageUrl.trim();

        if (key && !bestImageByCanonicalKey.has(key)) {
          bestImageByCanonicalKey.set(key, { url: key, rank: 0, order });
        }

        return;
      }

      const canonicalKey = getYupooCanonicalKey(imageUrl);
      const rank = getYupooVariantRank(parsed);
      const current = bestImageByCanonicalKey.get(canonicalKey);

      if (!current || rank > current.rank || (rank === current.rank && order < current.order)) {
        bestImageByCanonicalKey.set(canonicalKey, { url: imageUrl, rank, order: current?.order ?? order });
      }
    } catch {
      const normalized = imageUrl.trim();

      if (normalized && !bestImageByCanonicalKey.has(normalized)) {
        bestImageByCanonicalKey.set(normalized, { url: normalized, rank: 0, order });
      }
    }
  });

  return Array.from(bestImageByCanonicalKey.values())
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.url);
}

export async function extractYupooImages(sourceUrl: string, options?: { maxImages?: number }) {
  if (!/yupoo\.com/i.test(sourceUrl)) {
    throw new Error("La URL debe pertenecer a Yupoo para intentar la extracción automática.");
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer la página de Yupoo (${response.status}).`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const collected = new Set<string>();
  const previewByCanonicalKey = new Map<string, string>();

  const registerPreviewCandidate = (sourceCandidate: string, previewCandidate?: string | null) => {
    const normalizedSource = normalizeImageUrl(sourceCandidate);

    if (!normalizedSource || !isLikelyProductImage(normalizedSource)) {
      return;
    }

    collected.add(normalizedSource);

    if (!previewCandidate) {
      return;
    }

    const normalizedPreview = normalizeImageUrl(previewCandidate);

    if (!normalizedPreview || !isLikelyProductImage(normalizedPreview)) {
      return;
    }

    try {
      const canonicalKey = getYupooCanonicalKey(normalizedSource);

      if (!previewByCanonicalKey.has(canonicalKey)) {
        previewByCanonicalKey.set(canonicalKey, normalizedPreview);
      }
    } catch {
      // Ignore malformed URLs; source candidate already validated.
    }
  };

  const attributes = ["data-origin-src", "data-src", "src", "href"];

  $("img, a").each((_, element) => {
    const previewFromElement = normalizeImageUrl($(element).attr("src") ?? $(element).attr("data-src"));
    const preferredSource = normalizeImageUrl($(element).attr("data-origin-src"))
      ?? normalizeImageUrl($(element).attr("href"))
      ?? previewFromElement;

    if (preferredSource) {
      registerPreviewCandidate(preferredSource, previewFromElement);
    }

    for (const attribute of attributes) {
      const value = $(element).attr(attribute);
      const normalized = normalizeImageUrl(value);

      if (normalized && isLikelyProductImage(normalized)) {
        collected.add(normalized);
      }
    }
  });

  const rawMatches = html.match(/https?:\/\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi) ?? [];

  for (const match of rawMatches) {
    const normalized = normalizeImageUrl(match);

    if (normalized && isLikelyProductImage(normalized)) {
      collected.add(normalized);
    }
  }

  const images = canonicalizeYupooImageCandidates(uniqueValues(Array.from(collected)));
  const maxImages = options?.maxImages ?? 24;
  const limitedImages = maxImages > 0 ? images.slice(0, maxImages) : images;

  const imageCandidates: YupooImageCandidate[] = limitedImages.map((imageUrl) => {
    try {
      const canonicalKey = getYupooCanonicalKey(imageUrl);
      return {
        url: imageUrl,
        previewUrl: previewByCanonicalKey.get(canonicalKey) ?? imageUrl,
      };
    } catch {
      return {
        url: imageUrl,
        previewUrl: imageUrl,
      };
    }
  });

  if (limitedImages.length === 0) {
    throw new Error(
      "No encontramos imágenes confiables en el HTML de Yupoo. Usá la URL fuente y cargá imágenes manuales como fallback.",
    );
  }

  return {
    sourceUrl,
    images: limitedImages,
    imageCandidates,
    method: "html-scrape" as const,
  };
}
