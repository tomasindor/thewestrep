import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

import { getCloudinaryConfig, type CloudinaryConfig } from "@/lib/env/shared";
import { createId, slugify } from "@/lib/utils";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const SUPPORTED_CONTENT_TYPE_TO_EXTENSION = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
} as const;
const SUPPORTED_IMAGE_EXTENSIONS = new Set<string>(Object.values(SUPPORTED_CONTENT_TYPE_TO_EXTENSION));

export type ManagedProductImageProvider = "cloudinary" | "local";

export interface ManagedProductImageRecord {
  url: string;
  sourceUrl: string | null;
  provider: ManagedProductImageProvider | null;
  assetKey: string | null;
  cloudName: string | null;
}

export type ManagedProductImageReference = Partial<ManagedProductImageRecord>;

interface FetchedRemoteImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
  sourceUrl: string;
}

interface FetchRemoteImageOptions {
  sourcePageUrl?: string;
}

function getPublicUploadsDirectory() {
  return path.join(process.cwd(), "public", "uploads");
}

function getImageExtension(contentType: string | null, imageUrl: URL) {
  const normalizedType = contentType?.split(";")[0].trim().toLowerCase();

  if (normalizedType && normalizedType in SUPPORTED_CONTENT_TYPE_TO_EXTENSION) {
    return SUPPORTED_CONTENT_TYPE_TO_EXTENSION[normalizedType as keyof typeof SUPPORTED_CONTENT_TYPE_TO_EXTENSION];
  }

  const pathnameExtension = path.extname(imageUrl.pathname).toLowerCase();

  return SUPPORTED_IMAGE_EXTENSIONS.has(pathnameExtension) ? pathnameExtension : ".jpg";
}

function normalizeRemoteSourceUrl(sourceUrl: string) {
  const trimmed = sourceUrl.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error("La URL de imagen del producto no es válida.");
  }
}

function resolveProductImagePersistenceTarget() {
  const cloudinary = getCloudinaryConfig();

  if (cloudinary) {
    return {
      kind: "cloudinary" as const,
      cloudinary,
    };
  }

  if (process.env.VERCEL === "1") {
    return {
      kind: "vercel-unmanaged" as const,
    };
  }

  return {
    kind: "local" as const,
  };
}

function isLocalAssetPath(assetKey: string) {
  return assetKey.startsWith("/uploads/products/");
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((segment) => Number(segment));

  if (octets.length !== 4 || octets.some((segment) => Number.isNaN(segment))) {
    return true;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalizedAddress = address.toLowerCase();

  if (normalizedAddress === "::1") {
    return true;
  }

  if (normalizedAddress.startsWith("::ffff:")) {
    return isPrivateIpAddress(normalizedAddress.slice(7));
  }

  return normalizedAddress.startsWith("fc") || normalizedAddress.startsWith("fd") || normalizedAddress.startsWith("fe80:");
}

function isPrivateIpAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

async function assertSafeRemoteUrl(url: URL) {
  if (url.protocol !== "https:") {
    throw new Error("Solo aceptamos URLs HTTPS para imágenes remotas del producto.");
  }

  if (url.username || url.password) {
    throw new Error("La URL remota del producto no puede incluir credenciales.");
  }

  if (url.port && url.port !== "443") {
    throw new Error("La URL remota del producto debe usar el puerto HTTPS por defecto.");
  }

  if (url.hostname.toLowerCase() === "localhost") {
    throw new Error("No aceptamos hosts locales para imágenes remotas del producto.");
  }

  const resolvedAddresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });

  if (resolvedAddresses.length === 0 || resolvedAddresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error("La URL remota del producto apunta a una red privada o no pública, y no es válida.");
  }
}

function resolveYupooReferer(sourcePageUrl: string | undefined, remoteUrl: URL) {
  if (remoteUrl.hostname !== "photo.yupoo.com" || !sourcePageUrl) {
    return undefined;
  }

  try {
    const refererUrl = new URL(sourcePageUrl);

    return /(^|\.)yupoo\.com$/i.test(refererUrl.hostname) ? refererUrl.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function fetchRemoteImage(
  sourceUrl: string,
  options: FetchRemoteImageOptions = {},
  redirectCount = 0,
): Promise<FetchedRemoteImage> {
  const remoteUrl = new URL(sourceUrl);
  await assertSafeRemoteUrl(remoteUrl);
  const referer = resolveYupooReferer(options.sourcePageUrl, remoteUrl);

  const response = await fetch(remoteUrl, {
    headers: {
      "user-agent": "thewestrep-product-image-fetcher/1.0",
      ...(referer ? { referer } : {}),
    },
    redirect: "manual",
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error("La URL de imagen del producto redirecciona demasiadas veces.");
    }

    const location = response.headers.get("location");

    if (!location) {
      throw new Error("La URL de imagen del producto respondió con una redirección inválida.");
    }

    return fetchRemoteImage(new URL(location, remoteUrl).toString(), options, redirectCount + 1);
  }

  if (!response.ok) {
    throw new Error("No pudimos descargar la imagen del producto desde la URL indicada.");
  }

  const contentType = response.headers.get("content-type");
  const normalizedContentType = contentType?.split(";")[0].trim().toLowerCase();

  if (!normalizedContentType || !(normalizedContentType in SUPPORTED_CONTENT_TYPE_TO_EXTENSION)) {
    throw new Error("La URL indicada no devolvió una imagen válida para el producto.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen del producto es demasiado pesada. Probá con un archivo de hasta 8 MB.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen del producto es demasiado pesada. Probá con un archivo de hasta 8 MB.");
  }

  return {
    buffer,
    contentType: normalizedContentType,
    extension: getImageExtension(contentType, remoteUrl),
    sourceUrl: remoteUrl.toString(),
  };
}

function buildCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const serializedParams = Object.entries(params)
    .filter(([, value]) => value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${serializedParams}${apiSecret}`).digest("hex");
}

async function uploadProductImageToCloudinary(
  cloudinary: CloudinaryConfig,
  productName: string,
  position: number,
  fetchedImage: FetchedRemoteImage,
): Promise<ManagedProductImageRecord> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildCloudinarySignature(
    {
      folder: cloudinary.productFolder,
      timestamp,
    },
    cloudinary.apiSecret,
  );
  const formData = new FormData();
  const baseName = slugify(productName) || createId("product");

  formData.set(
    "file",
    new Blob([new Uint8Array(fetchedImage.buffer)], { type: fetchedImage.contentType }),
    `${baseName}-${position + 1}${fetchedImage.extension}`,
  );
  formData.set("api_key", cloudinary.apiKey);
  formData.set("folder", cloudinary.productFolder);
  formData.set("timestamp", timestamp);
  formData.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("No pudimos subir la imagen del producto a Cloudinary.");
  }

  const payload = (await response.json()) as { secure_url?: string; public_id?: string };

  if (!payload.secure_url || !payload.public_id) {
    throw new Error("Cloudinary respondió sin los datos necesarios para persistir la imagen del producto.");
  }

  return {
    url: payload.secure_url,
    sourceUrl: fetchedImage.sourceUrl,
    provider: "cloudinary",
    assetKey: payload.public_id,
    cloudName: cloudinary.cloudName,
  };
}

async function persistProductImageLocally(
  productName: string,
  position: number,
  fetchedImage: FetchedRemoteImage,
): Promise<ManagedProductImageRecord> {
  const safeName = slugify(productName) || createId("product");
  const fileName = `${safeName}-${position + 1}-${Date.now()}${fetchedImage.extension}`;
  const absoluteDirectory = path.join(getPublicUploadsDirectory(), "products");
  const absoluteFilePath = path.join(absoluteDirectory, fileName);
  const publicPath = `/uploads/products/${fileName}`;

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absoluteFilePath, fetchedImage.buffer);

  return {
    url: publicPath,
    sourceUrl: fetchedImage.sourceUrl,
    provider: "local",
    assetKey: publicPath,
    cloudName: null,
  };
}

async function destroyCloudinaryAsset(assetKey: string) {
  const cloudinary = getCloudinaryConfig();

  if (!cloudinary) {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const invalidate = "true";
  const signature = buildCloudinarySignature(
    {
      invalidate,
      public_id: assetKey,
      timestamp,
    },
    cloudinary.apiSecret,
  );
  const formData = new FormData();

  formData.set("api_key", cloudinary.apiKey);
  formData.set("public_id", assetKey);
  formData.set("timestamp", timestamp);
  formData.set("invalidate", invalidate);
  formData.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });

  return response.ok;
}

async function destroyLocalAsset(assetKey: string) {
  if (!isLocalAssetPath(assetKey)) {
    return false;
  }

  const absolutePath = path.join(process.cwd(), "public", assetKey.slice(1));

  try {
    await unlink(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export async function cleanupManagedProductImage(currentImage?: ManagedProductImageReference) {
  if (!currentImage?.provider || !currentImage.assetKey) {
    return { warning: undefined as string | undefined };
  }

  try {
    if (currentImage.provider === "cloudinary") {
      const removed = await destroyCloudinaryAsset(currentImage.assetKey);

      if (!removed) {
        return {
          warning:
            "No pudimos confirmar la limpieza del asset gestionado del producto en Cloudinary porque faltan credenciales o el provider no respondió como esperábamos.",
        };
      }

      return { warning: undefined };
    }

    if (currentImage.provider === "local") {
      await destroyLocalAsset(currentImage.assetKey);
    }

    return { warning: undefined };
  } catch {
    return {
      warning:
        currentImage.provider === "cloudinary"
          ? "Falló la limpieza del asset gestionado del producto en Cloudinary. El producto igual se guardó, pero conviene revisar ese recurso remoto."
          : "Falló la limpieza del archivo local gestionado del producto. El producto igual se guardó, pero conviene revisar /public/uploads/products.",
    };
  }
}

export async function persistManagedProductImage(input: {
  productName: string;
  position: number;
  sourceUrl: string;
  sourcePageUrl?: string;
  currentImage?: ManagedProductImageReference;
}) {
  const normalizedSourceUrl = input.sourceUrl.trim();
  const persistenceTarget = resolveProductImagePersistenceTarget();

  if (!normalizedSourceUrl) {
    throw new Error("La imagen del producto no puede estar vacía.");
  }

  if (normalizedSourceUrl.startsWith("/")) {
    return {
      image: {
        url: normalizedSourceUrl,
        sourceUrl: normalizedSourceUrl,
        provider: null,
        assetKey: null,
        cloudName: null,
      } satisfies ManagedProductImageRecord,
      warning: undefined as string | undefined,
    };
  }

  const normalizedRemoteSourceUrl = normalizeRemoteSourceUrl(normalizedSourceUrl);

  if (normalizedRemoteSourceUrl === input.currentImage?.sourceUrl) {
    return {
      image: {
        url: input.currentImage.url ?? normalizedRemoteSourceUrl,
        sourceUrl: input.currentImage.sourceUrl ?? normalizedRemoteSourceUrl,
        provider: input.currentImage.provider ?? null,
        assetKey: input.currentImage.assetKey ?? null,
        cloudName: input.currentImage.cloudName ?? null,
      } satisfies ManagedProductImageRecord,
      warning: undefined as string | undefined,
    };
  }

  const fetchedImage = await fetchRemoteImage(normalizedRemoteSourceUrl, {
    sourcePageUrl: input.sourcePageUrl,
  });
  const nextImage =
    persistenceTarget.kind === "cloudinary"
      ? await uploadProductImageToCloudinary(persistenceTarget.cloudinary, input.productName, input.position, fetchedImage)
      : persistenceTarget.kind === "vercel-unmanaged"
        ? {
            url: normalizedRemoteSourceUrl,
            sourceUrl: normalizedRemoteSourceUrl,
            provider: null,
            assetKey: null,
            cloudName: null,
          }
        : await persistProductImageLocally(input.productName, input.position, fetchedImage);

  if (persistenceTarget.kind === "cloudinary") {
    return {
      image: nextImage,
      warning: undefined as string | undefined,
    };
  }

  if (persistenceTarget.kind === "vercel-unmanaged") {
    return {
      image: nextImage,
      warning: "Cloudinary no está configurado en Vercel, así que dejamos la URL remota del producto sin gestión de lifecycle.",
    };
  }

  return {
    image: nextImage,
    warning: "Cloudinary no está configurado, así que guardamos la imagen del producto localmente para desarrollo.",
  };
}
