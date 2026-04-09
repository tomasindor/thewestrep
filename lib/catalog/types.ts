export type ProductAvailability = "stock" | "encargue";

export type ProductCurrency = "ARS" | "USD";

export type ProductState = "draft" | "published" | "paused";

export type ProductSizeAvailability = "in-stock" | "low-stock" | "made-to-order" | "sold-out";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  image?: string;
  imageSourceUrl?: string;
  imageProvider?: string;
  alt?: string;
  featuredOnHomepage?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  alt: string;
  featuredOnHomepage?: boolean;
  featuredOnHero?: boolean;
}

export interface ProductBadge {
  label: string;
}

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
  role?: "cover" | "gallery";
  sourceUrl?: string;
  provider?: "cloudinary" | "local";
  assetKey?: string;
  cloudName?: string;
}

export interface ProductPricing {
  amount: number;
  currency: ProductCurrency;
  display: string;
}

export interface ProductSize {
  id: string;
  label: string;
  availability: ProductSizeAvailability;
  quantity?: number;
}

export interface ProductVariant {
  id: string;
  label: string;
}

export interface ProductSizeGuideRow {
  label: string;
  values: string[];
}

export interface ProductSizeGuide {
  title?: string;
  unitLabel?: string;
  notes?: string;
  sourceImageUrl?: string;
  columns: string[];
  rows: ProductSizeGuideRow[];
}

export interface EditableInventorySize {
  label: string;
  availability?: ProductSizeAvailability;
  quantity?: number;
}

export interface ProductAvailabilityInfo {
  summary: string;
  leadTime?: string;
  stockNote?: string;
}

export interface EditableInventoryGalleryImage {
  src: string;
  alt: string;
}

export interface Product {
  id: string;
  slug: string;
  sku?: string;
  name: string;
  brandId: Brand["id"];
  categoryId: Category["id"];
  availability: ProductAvailability;
  state?: ProductState;
  pricing: ProductPricing;
  detail: string;
  note: string;
  whatsappCtaLabel?: string;
  whatsappMessage?: string;
  availabilityInfo: ProductAvailabilityInfo;
  gallery: ProductImage[];
  sizes?: ProductSize[];
  sizeGuide?: ProductSizeGuide;
  variants?: ProductVariant[];
  badge?: ProductBadge;
  featuredOnHomepage?: boolean;
  sourceUrl?: string;
}

export interface EditableInventoryProduct {
  slug: string;
  sku: string;
  name: string;
  brand: Brand["id"];
  category: Category["id"];
  availability: ProductAvailability;
  priceUsd: number;
  detail: string;
  note: string;
  availabilitySummary: string;
  leadTime?: string;
  stockNote?: string;
  coverImage: string;
  coverAlt: string;
  gallery?: readonly EditableInventoryGalleryImage[];
  sizes?: readonly (string | EditableInventorySize)[];
  badgeLabel?: string;
  featuredOnHomepage?: boolean;
}

export interface CatalogInventorySource {
  updatedAt: string;
  currency: ProductCurrency;
  brands: readonly Brand[];
  categories: readonly Category[];
  products: readonly Product[];
}

export interface EditableCatalogInventorySource {
  updatedAt: string;
  currency: ProductCurrency;
  products: readonly EditableInventoryProduct[];
}

export interface CatalogInventoryValidationIssue {
  code:
    | "duplicate-slug"
    | "duplicate-sku"
    | "missing-cover-image"
    | "invalid-availability-partition"
    | "invalid-brand-reference"
    | "invalid-category-reference";
  productSlug: string;
  message: string;
}
