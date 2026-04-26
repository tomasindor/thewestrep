import type { ProductAvailability } from "@/lib/catalog/types";

export interface CartCustomerProfile {
  name: string;
  phone: string;
  email: string;
  cuil: string;
  checkoutMode: "" | "guest" | "account";
  authProvider: "" | "credentials" | "google";
  preferredChannel: "" | "whatsapp" | "instagram" | "email";
  customerStatus: "" | "new" | "returning";
  deliveryRecipient: string;
  fulfillment: "" | "envio-caba-gba" | "envio-interior";
  location: string;
  notes: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage?: {
    src: string;
    alt: string;
    provider?: "cloudinary" | "local";
    assetKey?: string;
    cloudName?: string;
  };
  availability: ProductAvailability;
  availabilityLabel: string;
  categorySlug?: string;
  priceDisplay: string;
  comboEligible?: boolean;
  comboGroup?: string;
  comboPriority?: number;
  comboSourceKey?: string;
  comboScore?: number;
  quantity: number;
  variantLabel?: string;
  sizeLabel?: string;
}

export interface AddCartItemInput {
  productId: string;
  productSlug: string;
  productName: string;
  productImage?: {
    src: string;
    alt: string;
    provider?: "cloudinary" | "local";
    assetKey?: string;
    cloudName?: string;
  };
  availability: ProductAvailability;
  availabilityLabel: string;
  categorySlug?: string;
  priceDisplay: string;
  comboEligible?: boolean;
  comboGroup?: string;
  comboPriority?: number;
  comboSourceKey?: string;
  comboScore?: number;
  variantLabel?: string;
  sizeLabel?: string;
}
