import type { ProductImage } from "@/lib/catalog/types";
import { buildCloudinaryImageUrl } from "@/lib/media/cloudinary";

export type ProductImageViewContext = "admin-preview" | "card" | "detail" | "lightbox";

const PRODUCT_IMAGE_TRANSFORMS: Record<
  ProductImageViewContext,
  { width: number; height?: number; crop: "fill" | "limit"; gravity?: "auto" }
> = {
  "admin-preview": { width: 480, height: 600, crop: "fill", gravity: "auto" },
  card: { width: 720, height: 900, crop: "fill", gravity: "auto" },
  detail: { width: 1400, height: 1750, crop: "limit" },
  lightbox: { width: 2200, height: 2750, crop: "limit" },
};

function getR2PublicBaseUrl() {
  const value = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL;

  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed.replace(/\/+$/, "") : null;
}

function getR2AssetKey(image: Pick<ProductImage, "src" | "assetKey">) {
  if (image.assetKey) {
    return image.assetKey.replace(/^\/+/, "");
  }

  if (image.src.startsWith("r2://")) {
    return image.src.slice("r2://".length).replace(/^\/+/, "");
  }

  return null;
}

function buildR2PublicImageUrl(image: Pick<ProductImage, "src" | "assetKey">) {
  const publicBaseUrl = getR2PublicBaseUrl();

  if (!publicBaseUrl) {
    return null;
  }

  const assetKey = getR2AssetKey(image);

  if (!assetKey) {
    return null;
  }

  return `${publicBaseUrl}/${assetKey}`;
}

export function getProductImageUrlForContext(image: Pick<ProductImage, "src" | "provider" | "assetKey" | "cloudName">, context: ProductImageViewContext) {
  if (image.provider === "cloudinary" && image.assetKey && image.cloudName) {
    const transform = PRODUCT_IMAGE_TRANSFORMS[context];

    return buildCloudinaryImageUrl(image.cloudName, image.assetKey, {
      ...transform,
      quality: "auto",
      format: "auto",
      dpr: "auto",
    });
  }

  const r2PublicUrl = buildR2PublicImageUrl(image);

  return r2PublicUrl ?? image.src;
}
