import { brands } from "@/lib/catalog/data/brands";
import { categories } from "@/lib/catalog/data/categories";
import { editableEncargueProducts } from "@/lib/catalog/data/inventory-editable-encargue";
import { editableCatalogInventorySource } from "@/lib/catalog/data/inventory-editable";
import { editableStockProducts } from "@/lib/catalog/data/inventory-editable-stock";
import type {
  CatalogInventorySource,
  CatalogInventoryValidationIssue,
  EditableInventoryProduct,
  EditableInventorySize,
  Product,
  ProductAvailability,
  ProductSizeAvailability,
} from "@/lib/catalog/types";

const brandIds = new Set(brands.map((brand) => brand.id));
const categoryIds = new Set(categories.map((category) => category.id));

function slugifyInventoryLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDefaultSizeAvailability(availability: ProductAvailability): ProductSizeAvailability {
  return availability === "stock" ? "in-stock" : "made-to-order";
}

function mapEditableInventorySize(
  size: string | EditableInventorySize,
  availability: ProductAvailability,
  index: number,
) {
  const normalizedSize = typeof size === "string" ? { label: size } : size;

  return {
    id: slugifyInventoryLabel(normalizedSize.label) || `size-${index + 1}`,
    label: normalizedSize.label,
    availability: normalizedSize.availability ?? getDefaultSizeAvailability(availability),
    quantity: normalizedSize.quantity,
  };
}

function mapEditableInventoryProduct(product: EditableInventoryProduct): Product {
  return {
    id: product.slug,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brandId: product.brand,
    categoryId: product.category,
    availability: product.availability,
    pricing: {
      amount: product.priceUsd,
      currency: "USD",
      display: `USD ${product.priceUsd}`,
    },
    detail: product.detail,
    note: product.note,
    availabilityInfo: {
      summary: product.availabilitySummary,
      leadTime: product.leadTime,
      stockNote: product.stockNote,
    },
    gallery: [
      {
        id: "cover",
        src: product.coverImage,
        alt: product.coverAlt,
        role: "cover",
      },
      ...(product.gallery?.map((image, index) => ({
        id: `gallery-${index + 1}`,
        src: image.src,
        alt: image.alt,
        role: "gallery" as const,
      })) ?? []),
    ],
    sizes: product.sizes?.map((size, index) => mapEditableInventorySize(size, product.availability, index)),
    badge: product.badgeLabel ? { label: product.badgeLabel } : undefined,
    featuredOnHomepage: product.featuredOnHomepage,
  };
}

function validateEditableInventoryProducts(products: readonly EditableInventoryProduct[]): CatalogInventoryValidationIssue[] {
  const issues: CatalogInventoryValidationIssue[] = [];
  const seenSlugs = new Set<string>();
  const seenSkus = new Set<string>();

  for (const product of products) {
    if (seenSlugs.has(product.slug)) {
      issues.push({
        code: "duplicate-slug",
        productSlug: product.slug,
        message: `Duplicate inventory slug detected: ${product.slug}`,
      });
    }

    if (seenSkus.has(product.sku)) {
      issues.push({
        code: "duplicate-sku",
        productSlug: product.slug,
        message: `Duplicate inventory SKU detected: ${product.sku}`,
      });
    }

    if (!product.coverImage.trim()) {
      issues.push({
        code: "missing-cover-image",
        productSlug: product.slug,
        message: `Missing cover image for inventory product: ${product.slug}`,
      });
    }

    if (!brandIds.has(product.brand)) {
      issues.push({
        code: "invalid-brand-reference",
        productSlug: product.slug,
        message: `Invalid brand reference '${product.brand}' on product: ${product.slug}`,
      });
    }

    if (!categoryIds.has(product.category)) {
      issues.push({
        code: "invalid-category-reference",
        productSlug: product.slug,
        message: `Invalid category reference '${product.category}' on product: ${product.slug}`,
      });
    }

    seenSlugs.add(product.slug);
    seenSkus.add(product.sku);
  }

  return issues;
}

function validateEditableInventoryAvailability(
  products: readonly EditableInventoryProduct[],
  expectedAvailability: ProductAvailability,
): CatalogInventoryValidationIssue[] {
  return products.flatMap((product) => {
    if (product.availability === expectedAvailability) {
      return [];
    }

    return [
      {
        code: "invalid-availability-partition",
        productSlug: product.slug,
        message: `Product '${product.slug}' is in the ${expectedAvailability} editable source but is marked as '${product.availability}'.`,
      } satisfies CatalogInventoryValidationIssue,
    ];
  });
}

export const inventoryValidationIssues = [
  ...validateEditableInventoryAvailability(editableStockProducts, "stock"),
  ...validateEditableInventoryAvailability(editableEncargueProducts, "encargue"),
  ...validateEditableInventoryProducts(editableCatalogInventorySource.products),
];

if (inventoryValidationIssues.length > 0) {
  throw new Error(inventoryValidationIssues.map((issue) => issue.message).join("\n"));
}

export const inventoryProducts = editableCatalogInventorySource.products.map(mapEditableInventoryProduct) satisfies readonly Product[];

export const catalogInventorySource = {
  updatedAt: editableCatalogInventorySource.updatedAt,
  currency: editableCatalogInventorySource.currency,
  brands,
  categories,
  products: inventoryProducts,
} satisfies CatalogInventorySource;
