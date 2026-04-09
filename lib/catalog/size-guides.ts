import type { ProductImage, ProductSizeGuide, ProductSizeGuideRow } from "@/lib/catalog/types";

interface SizeGuideImageDetectionOptions {
  index?: number;
  sourcePageUrl?: string;
}

const SIZE_GUIDE_KEYWORD_PATTERN = /(size[-_\s]*guide|size[-_\s]*chart|measure(?:ment)?s?|talles?|尺码|尺寸|gu[ií]a[-_\s]*de[-_\s]*talles?|tabla[-_\s]*de[-_\s]*medidas?)/i;

export const DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS = ["Largo", "Pecho", "Hombros"] as const;

function compactValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeUrlPathname(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isPngImage(url: string) {
  return /\.png(?:$|[?#])/i.test(url);
}

export function isLikelySizeGuideImageUrl(url: string, options: SizeGuideImageDetectionOptions = {}) {
  const normalizedPathname = normalizeUrlPathname(url);

  if (SIZE_GUIDE_KEYWORD_PATTERN.test(normalizedPathname)) {
    return true;
  }

  return Boolean(options.sourcePageUrl?.includes("yupoo") && options.index === 0 && isPngImage(normalizedPathname));
}

export function reorderLikelySizeGuideImageUrls(
  imageUrls: string[],
  options: Pick<SizeGuideImageDetectionOptions, "sourcePageUrl"> = {},
) {
  const regularImages: string[] = [];
  const likelyGuideImages: string[] = [];

  imageUrls.forEach((url, index) => {
    if (isLikelySizeGuideImageUrl(url, { ...options, index })) {
      likelyGuideImages.push(url);
      return;
    }

    regularImages.push(url);
  });

  return [...regularImages, ...likelyGuideImages];
}

export function getSuggestedSizeGuideImageUrl(
  imageUrls: readonly string[],
  options: Pick<SizeGuideImageDetectionOptions, "sourcePageUrl"> = {},
) {
  return imageUrls.find((url, index) => isLikelySizeGuideImageUrl(url, { ...options, index }));
}

export function getDisplayGalleryImages(images: ProductImage[], sizeGuide: ProductSizeGuide | undefined, sourcePageUrl?: string) {
  return images
    .filter((image, index) => {
      const candidateUrl = image.sourceUrl ?? image.src;

      if (sizeGuide?.sourceImageUrl && candidateUrl === sizeGuide.sourceImageUrl) {
        return false;
      }

      return !isLikelySizeGuideImageUrl(candidateUrl, { index, sourcePageUrl });
    })
    .map((image, index) => ({
    ...image,
    role: index === 0 ? ("cover" as const) : ("gallery" as const),
    }));
}

function normalizeGuideColumns(columns: readonly string[]) {
  return Array.from(new Set(columns.map(compactValue).filter(Boolean)));
}

function normalizeGuideRows(rows: readonly ProductSizeGuideRow[], columnCount: number) {
  return rows
    .map((row) => ({
      label: compactValue(row.label),
      values: Array.from({ length: columnCount }, (_, index) => compactValue(row.values[index])),
    }))
    .filter((row) => row.label || row.values.some(Boolean));
}

export function normalizeProductSizeGuide(input: ProductSizeGuide | null | undefined) {
  if (!input) {
    return null;
  }

  const columns = normalizeGuideColumns(input.columns);

  if (columns.length === 0) {
    return null;
  }

  const rows = normalizeGuideRows(input.rows, columns.length);

  if (rows.length === 0) {
    return null;
  }

  return {
    title: compactValue(input.title) || undefined,
    unitLabel: compactValue(input.unitLabel) || undefined,
    notes: compactValue(input.notes) || undefined,
    sourceImageUrl: compactValue(input.sourceImageUrl) || undefined,
    columns,
    rows,
  } satisfies ProductSizeGuide;
}

export function parseProductSizeGuideColumns(value: string) {
  return value
    .split(/\r?\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseProductSizeGuideRows(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...values] = line.split("|").map((item) => item.trim());

      return {
        label: label ?? "",
        values,
      } satisfies ProductSizeGuideRow;
    });
}

export function formatProductSizeGuideColumns(sizeGuide: ProductSizeGuide | null | undefined) {
  return sizeGuide?.columns.join("\n") ?? "";
}

export function formatProductSizeGuideRows(sizeGuide: ProductSizeGuide | null | undefined) {
  return sizeGuide?.rows.map((row) => [row.label, ...row.values].join(" | ")).join("\n") ?? "";
}

export function createDraftProductSizeGuideRows(labels: readonly string[], columnCount: number) {
  const normalizedLabels = Array.from(new Set(labels.map(compactValue).filter(Boolean)));

  return normalizedLabels.map(
    (label) =>
      ({
        label,
        values: Array.from({ length: columnCount }, () => ""),
      }) satisfies ProductSizeGuideRow,
  );
}
