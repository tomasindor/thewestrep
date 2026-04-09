import type { ProductImage } from "@/lib/catalog/types";

function compactSegment(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function buildProductSubject({
  productName,
  brandName,
  categoryName,
}: {
  productName: string;
  brandName?: string;
  categoryName?: string;
}) {
  const segments = [compactSegment(productName) ?? "Producto", compactSegment(brandName), compactSegment(categoryName)].filter(Boolean);
  return segments.join(", ");
}

export function buildBrandImageAlt(brandName: string) {
  return compactSegment(brandName) ?? "thewestrep";
}

export function buildCategoryImageAlt(categoryName: string) {
  return `Imagen de categoría ${compactSegment(categoryName) ?? "thewestrep"}`;
}

export function buildProductImageAlt({
  productName,
  brandName,
  categoryName,
  imageIndex,
  totalImages,
  role,
}: {
  productName: string;
  brandName?: string;
  categoryName?: string;
  imageIndex?: number;
  totalImages?: number;
  role?: ProductImage["role"];
}) {
  const subject = buildProductSubject({ productName, brandName, categoryName });
  const normalizedIndex = typeof imageIndex === "number" && imageIndex > 0 ? imageIndex : undefined;
  const normalizedTotal = typeof totalImages === "number" && totalImages > 0 ? totalImages : undefined;

  if (role === "cover" || normalizedIndex === 1 || normalizedIndex === undefined) {
    return `${subject}, imagen principal`;
  }

  if (normalizedIndex && normalizedTotal && normalizedTotal > 1) {
    return `${subject}, imagen ${normalizedIndex} de ${normalizedTotal}`;
  }

  if (normalizedIndex) {
    return `${subject}, imagen ${normalizedIndex}`;
  }

  return `${subject}, imagen de producto`;
}

export function buildProductFallbackImageAlt(productName: string, brandName?: string, categoryName?: string) {
  return `${buildProductSubject({ productName, brandName, categoryName })}, imagen de referencia`;
}
