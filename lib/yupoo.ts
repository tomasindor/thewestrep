import "server-only";

import * as cheerio from "cheerio";

import { uniqueValues } from "@/lib/utils";

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

export async function extractYupooImages(sourceUrl: string) {
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

  const attributes = ["data-origin-src", "data-src", "src", "href"];

  $("img, a").each((_, element) => {
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

  const images = uniqueValues(Array.from(collected)).slice(0, 24);

  if (images.length === 0) {
    throw new Error(
      "No encontramos imágenes confiables en el HTML de Yupoo. Usá la URL fuente y cargá imágenes manuales como fallback.",
    );
  }

  return {
    sourceUrl,
    images,
    method: "html-scrape" as const,
  };
}
