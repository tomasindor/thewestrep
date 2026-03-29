import type { ProductAvailability } from "@/lib/catalog";

export interface CartCustomerProfile {
  name: string;
  contact: string;
  preferredChannel: "" | "whatsapp" | "instagram" | "email";
  customerStatus: "" | "new" | "returning";
  fulfillment: "" | "retiro" | "envio-caba-gba" | "envio-interior";
  location: string;
  notes: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  availability: ProductAvailability;
  availabilityLabel: string;
  priceDisplay: string;
  quantity: number;
  variantLabel?: string;
  sizeLabel?: string;
}

export interface AddCartItemInput {
  productId: string;
  productSlug: string;
  productName: string;
  availability: ProductAvailability;
  availabilityLabel: string;
  priceDisplay: string;
  variantLabel?: string;
  sizeLabel?: string;
}
