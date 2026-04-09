import "server-only";

import sharp from "sharp";

export type ImageVariantName = "thumb" | "cart-thumb" | "card" | "detail" | "lightbox" | "admin-preview";

interface ImageVariantSpec {
  width: number;
}

export const DEFAULT_IMAGE_VARIANT_SPECS: Record<ImageVariantName, ImageVariantSpec> = {
  thumb: { width: 256 },
  "cart-thumb": { width: 240 },
  card: { width: 960 },
  detail: { width: 1440 },
  lightbox: { width: 2200 },
  "admin-preview": { width: 480 },
};

const MANIFEST_FIELD_MAP: Record<ImageVariantName, "thumb" | "cartThumb" | "card" | "detail" | "lightbox" | "adminPreview"> = {
  thumb: "thumb",
  "cart-thumb": "cartThumb",
  card: "card",
  detail: "detail",
  lightbox: "lightbox",
  "admin-preview": "adminPreview",
};

export interface GeneratedImageVariant {
  key: string;
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
}

export interface GenerateImageVariantsInput {
  source: Buffer;
  originalKey: string;
}

export interface GenerateImageVariantsResult {
  original: {
    key: string;
    width: number;
    height: number;
  };
  variants: Record<ImageVariantName, GeneratedImageVariant>;
}

function removeExtension(key: string) {
  const lastSlash = key.lastIndexOf("/");
  const lastDot = key.lastIndexOf(".");

  if (lastDot === -1 || lastDot < lastSlash) {
    return key;
  }

  return key.slice(0, lastDot);
}

function buildVariantKey(originalKey: string, name: ImageVariantName) {
  return `${removeExtension(originalKey)}/${name}.webp`;
}

export function mapVariantNameToManifestField(name: ImageVariantName) {
  return MANIFEST_FIELD_MAP[name];
}

export async function generateImageVariants(input: GenerateImageVariantsInput): Promise<GenerateImageVariantsResult> {
  const sourceMetadata = await sharp(input.source).metadata();

  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error("Could not determine source image dimensions.");
  }

  const variants: Partial<Record<ImageVariantName, GeneratedImageVariant>> = {};

  for (const [name, spec] of Object.entries(DEFAULT_IMAGE_VARIANT_SPECS) as Array<[ImageVariantName, ImageVariantSpec]>) {
    const transformed = await sharp(input.source)
      .rotate()
      .resize({
        width: spec.width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    variants[name] = {
      key: buildVariantKey(input.originalKey, name),
      buffer: transformed.data,
      contentType: "image/webp",
      width: transformed.info.width,
      height: transformed.info.height,
    };
  }

  return {
    original: {
      key: input.originalKey,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
    },
    variants: variants as Record<ImageVariantName, GeneratedImageVariant>,
  };
}
