export interface ImageVariantsManifest {
  original: string;
  stage?: "staged-preview" | "catalog-ready" | "catalog-failed";
  catalogStatus?: "pending" | "ready" | "failed";
  missingCatalogVariants?: Array<"thumb" | "cartThumb" | "card" | "detail" | "lightbox">;
  lastCatalogError?: string;
  variants: {
    thumb?: string;
    cartThumb?: string;
    card?: string;
    detail?: string;
    lightbox?: string;
    adminPreview?: string;
  };
  width: number;
  height: number;
}
