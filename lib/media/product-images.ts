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

export function getProductImageUrlForContext(image: Pick<ProductImage, "src" | "provider" | "assetKey" | "cloudName">, context: ProductImageViewContext) {
  if (image.provider !== "cloudinary" || !image.assetKey || !image.cloudName) {
    return image.src;
  }

  const transform = PRODUCT_IMAGE_TRANSFORMS[context];

  return buildCloudinaryImageUrl(image.cloudName, image.assetKey, {
    ...transform,
    quality: "auto",
    format: "auto",
    dpr: "auto",
  });
}
