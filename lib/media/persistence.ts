import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createId, slugify } from "@/lib/utils";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function getImageExtension(contentType: string | null, imageUrl: URL) {
  const normalizedType = contentType?.split(";")[0].trim().toLowerCase();

  switch (normalizedType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    case "image/avif":
      return ".avif";
    default: {
      const pathnameExtension = path.extname(imageUrl.pathname).toLowerCase();
      return pathnameExtension || ".jpg";
    }
  }
}

function getPublicUploadsDirectory() {
  return path.join(process.cwd(), "public", "uploads");
}

export interface PersistRemoteImageInput {
  entity: "brands" | "categories";
  sourceUrl?: string;
  name: string;
}

export interface PersistRemoteImageResult {
  imageUrl?: string;
  warning?: string;
}

export async function persistRemoteImageLocally({ entity, sourceUrl, name }: PersistRemoteImageInput): Promise<PersistRemoteImageResult> {
  if (!sourceUrl) {
    return {};
  }

  if (sourceUrl.startsWith("/")) {
    return { imageUrl: sourceUrl };
  }

  if (process.env.VERCEL === "1") {
    return {
      imageUrl: sourceUrl,
      warning:
        "En Vercel no podemos guardar imágenes de forma durable en /public sin un storage externo. Se conserva la URL remota como fallback.",
    };
  }

  const imageUrl = new URL(sourceUrl);
  const response = await fetch(imageUrl, {
    headers: {
      "user-agent": "thewestrep-image-fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("No pudimos descargar la imagen desde la URL indicada.");
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.startsWith("image/")) {
    throw new Error("La URL indicada no devolvió una imagen válida.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen es demasiado pesada. Probá con un archivo de hasta 8 MB.");
  }

  const extension = getImageExtension(contentType, imageUrl);
  const safeName = slugify(name) || createId(entity.slice(0, -1));
  const fileName = `${safeName}-${Date.now()}${extension}`;
  const relativeDirectory = path.posix.join("uploads", entity);
  const absoluteDirectory = path.join(getPublicUploadsDirectory(), entity);
  const absoluteFilePath = path.join(absoluteDirectory, fileName);
  const publicPath = `/${path.posix.join(relativeDirectory, fileName)}`;

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absoluteFilePath, buffer);

  return { imageUrl: publicPath };
}
