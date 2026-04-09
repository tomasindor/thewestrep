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

type SupportedEntity = "brands";
export type ManagedImageProvider = "cloudinary" | "local";

export interface ManagedImageRecord {
  imageUrl: string | null;
  imageSourceUrl: string | null;
  imageProvider: ManagedImageProvider | null;
  imageAssetKey: string | null;
}

export interface ManagedBrandImageState extends ManagedImageRecord {
  warning?: string;
}

export type ManagedBrandImageReference = Partial<ManagedImageRecord>;

interface FetchedRemoteImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
  sourceUrl: string;
}

interface PersistBrandImageInput {
  entity: SupportedEntity;
  name: string;
  sourceUrl?: string;
  currentImage?: ManagedBrandImageReference;
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
    throw new Error("La URL de imagen no es válida.");
  }
}

function resolveBrandImagePersistenceTarget() {
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

function createEmptyManagedImageState(warning?: string): ManagedBrandImageState {
  return {
    imageUrl: null,
    imageSourceUrl: null,
    imageProvider: null,
    imageAssetKey: null,
    warning,
  };
}

function withWarning(record: ManagedImageRecord, warning?: string): ManagedBrandImageState {
  return {
    ...record,
    warning,
  };
}

function isLocalAssetPath(assetKey: string) {
  return assetKey.startsWith("/uploads/brands/");
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
    throw new Error("Solo aceptamos URLs HTTPS para imágenes remotas.");
  }

  if (url.username || url.password) {
    throw new Error("La URL remota no puede incluir credenciales.");
  }

  if (url.port && url.port !== "443") {
    throw new Error("La URL remota debe usar el puerto HTTPS por defecto.");
  }

  if (url.hostname.toLowerCase() === "localhost") {
    throw new Error("No aceptamos hosts locales para imágenes remotas.");
  }

  const resolvedAddresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });

  if (resolvedAddresses.length === 0 || resolvedAddresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error("La URL remota apunta a una red privada o no pública, y no es válida.");
  }
}

async function fetchRemoteImage(sourceUrl: string, redirectCount = 0): Promise<FetchedRemoteImage> {
  const remoteUrl = new URL(sourceUrl);
  await assertSafeRemoteUrl(remoteUrl);

  const response = await fetch(remoteUrl, {
    headers: {
      "user-agent": "thewestrep-brand-image-fetcher/1.0",
    },
    redirect: "manual",
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error("La URL de imagen redirecciona demasiadas veces.");
    }

    const location = response.headers.get("location");

    if (!location) {
      throw new Error("La URL de imagen respondió con una redirección inválida.");
    }

    return fetchRemoteImage(new URL(location, remoteUrl).toString(), redirectCount + 1);
  }

  if (!response.ok) {
    throw new Error("No pudimos descargar la imagen desde la URL indicada.");
  }

  const contentType = response.headers.get("content-type");
  const normalizedContentType = contentType?.split(";")[0].trim().toLowerCase();

  if (!normalizedContentType || !(normalizedContentType in SUPPORTED_CONTENT_TYPE_TO_EXTENSION)) {
    throw new Error("La URL indicada no devolvió una imagen válida.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen es demasiado pesada. Probá con un archivo de hasta 8 MB.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen es demasiado pesada. Probá con un archivo de hasta 8 MB.");
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

async function uploadBrandImageToCloudinary(
  cloudinary: CloudinaryConfig,
  name: string,
  fetchedImage: FetchedRemoteImage,
): Promise<ManagedImageRecord> {

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildCloudinarySignature(
    {
      folder: cloudinary.brandFolder,
      timestamp,
    },
    cloudinary.apiSecret,
  );
  const formData = new FormData();
  const baseName = slugify(name) || createId("brand");

  formData.set(
    "file",
    new Blob([new Uint8Array(fetchedImage.buffer)], { type: fetchedImage.contentType }),
    `${baseName}${fetchedImage.extension}`,
  );
  formData.set("api_key", cloudinary.apiKey);
  formData.set("folder", cloudinary.brandFolder);
  formData.set("timestamp", timestamp);
  formData.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("No pudimos subir la imagen de la marca a Cloudinary.");
  }

  const payload = (await response.json()) as { secure_url?: string; public_id?: string };

  if (!payload.secure_url || !payload.public_id) {
    throw new Error("Cloudinary respondió sin los datos necesarios para persistir la imagen.");
  }

  return {
    imageUrl: payload.secure_url,
    imageSourceUrl: fetchedImage.sourceUrl,
    imageProvider: "cloudinary",
    imageAssetKey: payload.public_id,
  };
}

async function persistBrandImageLocally(name: string, fetchedImage: FetchedRemoteImage): Promise<ManagedImageRecord> {
  const safeName = slugify(name) || createId("brand");
  const fileName = `${safeName}-${Date.now()}${fetchedImage.extension}`;
  const absoluteDirectory = path.join(getPublicUploadsDirectory(), "brands");
  const absoluteFilePath = path.join(absoluteDirectory, fileName);
  const publicPath = `/uploads/brands/${fileName}`;

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absoluteFilePath, fetchedImage.buffer);

  return {
    imageUrl: publicPath,
    imageSourceUrl: fetchedImage.sourceUrl,
    imageProvider: "local",
    imageAssetKey: publicPath,
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

export async function cleanupManagedBrandImage(currentImage?: ManagedBrandImageReference) {
  if (!currentImage?.imageProvider || !currentImage.imageAssetKey) {
    return { warning: undefined as string | undefined };
  }

  try {
    if (currentImage.imageProvider === "cloudinary") {
      const removed = await destroyCloudinaryAsset(currentImage.imageAssetKey);

      if (!removed) {
        return {
          warning: "No pudimos confirmar la limpieza del asset gestionado en Cloudinary porque faltan credenciales o el provider no respondió como esperábamos.",
        };
      }

      return { warning: undefined };
    }

    if (currentImage.imageProvider === "local") {
      await destroyLocalAsset(currentImage.imageAssetKey);
    }

    return { warning: undefined };
  } catch {
    return {
      warning:
        currentImage.imageProvider === "cloudinary"
          ? "Falló la limpieza del asset gestionado en Cloudinary. La marca igual se guardó, pero conviene revisar ese recurso remoto."
          : "Falló la limpieza del archivo local gestionado. La marca igual se guardó, pero conviene revisar /public/uploads/brands.",
    };
  }
}

export async function persistManagedBrandImage({ entity, name, sourceUrl, currentImage }: PersistBrandImageInput): Promise<ManagedBrandImageState> {
  void entity;
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  const persistenceTarget = resolveBrandImagePersistenceTarget();

  if (!normalizedSourceUrl) {
    return createEmptyManagedImageState();
  }

  if (normalizedSourceUrl.startsWith("/")) {
    return withWarning({
      imageUrl: normalizedSourceUrl,
      imageSourceUrl: normalizedSourceUrl,
      imageProvider: null,
      imageAssetKey: null,
    });
  }

  const normalizedRemoteSourceUrl = normalizeRemoteSourceUrl(normalizedSourceUrl);

  if (normalizedRemoteSourceUrl === currentImage?.imageSourceUrl) {
    return withWarning({
      imageUrl: currentImage.imageUrl ?? null,
      imageSourceUrl: currentImage.imageSourceUrl ?? normalizedRemoteSourceUrl,
      imageProvider: (currentImage.imageProvider as ManagedImageProvider | null | undefined) ?? null,
      imageAssetKey: currentImage.imageAssetKey ?? null,
    });
  }

  const fetchedImage = await fetchRemoteImage(normalizedRemoteSourceUrl);
  const nextImage =
    persistenceTarget.kind === "cloudinary"
      ? await uploadBrandImageToCloudinary(persistenceTarget.cloudinary, name, fetchedImage)
      : persistenceTarget.kind === "vercel-unmanaged"
        ? {
            imageUrl: normalizedRemoteSourceUrl,
            imageSourceUrl: normalizedRemoteSourceUrl,
            imageProvider: null,
            imageAssetKey: null,
          }
        : await persistBrandImageLocally(name, fetchedImage);
  if (persistenceTarget.kind === "cloudinary") {
    return withWarning(nextImage);
  }

  if (persistenceTarget.kind === "vercel-unmanaged") {
    return withWarning(
      nextImage,
      "Cloudinary no está configurado en Vercel, así que dejamos la URL remota sin gestión de lifecycle.",
    );
  }

  return withWarning(
    nextImage,
    "Cloudinary no está configurado, así que guardamos la imagen localmente para desarrollo.",
  );
}
