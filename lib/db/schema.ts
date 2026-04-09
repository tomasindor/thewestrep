import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import type { ProductSizeGuideRow } from "@/lib/catalog/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const productTypeEnum = pgEnum("product_type", ["stock", "encargue"]);
export const productStateEnum = pgEnum("product_state", ["draft", "published", "paused"]);
export const productImageSourceEnum = pgEnum("product_image_source", ["manual", "yupoo"]);
export const orderCheckoutModeEnum = pgEnum("order_checkout_mode", ["guest", "account"]);
export const orderAuthProviderEnum = pgEnum("order_auth_provider", ["guest", "credentials", "google"]);
export const orderStatusEnum = pgEnum("order_status", ["submitted", "cancelled"]);
export const orderFulfillmentEnum = pgEnum("order_fulfillment", ["envio-caba-gba", "envio-interior"]);

export const customerAccounts = pgTable("customer_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash"),
  googleSubject: text("google_subject").unique(),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  phone: text("phone").notNull().default(""),
  preferredChannel: text("preferred_channel").notNull().default(""),
  cuil: text("cuil").notNull().default(""),
  shippingRecipient: text("shipping_recipient").notNull().default(""),
  shippingAddressLine1: text("shipping_address_line_1").notNull().default(""),
  shippingAddressLine2: text("shipping_address_line_2").notNull().default(""),
  shippingCity: text("shipping_city").notNull().default(""),
  shippingProvince: text("shipping_province").notNull().default(""),
  shippingPostalCode: text("shipping_postal_code").notNull().default(""),
  shippingDeliveryNotes: text("shipping_delivery_notes").notNull().default(""),
  ...timestamps,
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  customerAccountId: text("customer_account_id").references(() => customerAccounts.id, { onDelete: "set null" }),
  checkoutMode: orderCheckoutModeEnum("checkout_mode").notNull(),
  authProvider: orderAuthProviderEnum("auth_provider").notNull().default("guest"),
  status: orderStatusEnum("status").notNull().default("submitted"),
  currencyCode: text("currency_code").notNull().default("ARS"),
  subtotalAmountArs: integer("subtotal_amount_ars").notNull(),
  shippingAmountArs: integer("shipping_amount_ars").notNull().default(0),
  assistedFeeAmountArs: integer("assisted_fee_amount_ars").notNull().default(0),
  totalAmountArs: integer("total_amount_ars").notNull(),
  lineItemCount: integer("line_item_count").notNull(),
  unitCount: integer("unit_count").notNull(),
  containsEncargueItems: boolean("contains_encargue_items").notNull().default(false),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactCuil: text("contact_cuil").notNull().default(""),
  preferredChannel: text("preferred_channel").notNull().default(""),
  customerStatus: text("customer_status").notNull().default(""),
  deliveryRecipient: text("delivery_recipient").notNull().default(""),
  fulfillment: orderFulfillmentEnum("fulfillment").notNull(),
  location: text("location").notNull(),
  notes: text("notes").notNull().default(""),
  customerSnapshot: jsonb("customer_snapshot")
    .$type<{
      account: {
        id: string;
        email: string;
        name: string;
        authProvider: "credentials" | "google";
      } | null;
      buyer: {
        name: string;
        email: string;
        phone: string;
        cuil: string;
        preferredChannel: string;
        customerStatus: string;
      };
      delivery: {
        recipient: string;
        fulfillment: "envio-caba-gba" | "envio-interior";
        location: string;
        notes: string;
      };
    }>()
    .notNull(),
  pricingSnapshot: jsonb("pricing_snapshot")
    .$type<{
      currencyCode: "ARS";
      subtotalAmountArs: number;
      shippingAmountArs: number;
      assistedFeeAmountArs: number;
      totalAmountArs: number;
    }>()
    .notNull(),
  ...timestamps,
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  productImageUrl: text("product_image_url"),
  productImageAlt: text("product_image_alt").notNull().default(""),
  availability: productTypeEnum("availability").notNull(),
  availabilityLabel: text("availability_label").notNull(),
  unitPriceAmountArs: integer("unit_price_amount_ars").notNull(),
  quantity: integer("quantity").notNull(),
  variantLabel: text("variant_label"),
  sizeLabel: text("size_label"),
  lineTotalAmountArs: integer("line_total_amount_ars").notNull(),
  itemSnapshot: jsonb("item_snapshot")
    .$type<{
      productId: string;
      productSlug: string;
      productName: string;
      availability: "stock" | "encargue";
      availabilityLabel: string;
      quantity: number;
      unitPriceAmountArs: number;
      lineTotalAmountArs: number;
      variantLabel?: string;
      sizeLabel?: string;
      productImage?: {
        src: string;
        alt: string;
        provider?: "cloudinary" | "local";
        assetKey?: string;
        cloudName?: string;
      };
    }>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const brands = pgTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url"),
  imageSourceUrl: text("image_source_url"),
  imageProvider: text("image_provider"),
  imageAssetKey: text("image_asset_key"),
  imageAlt: text("image_alt").notNull().default(""),
  ...timestamps,
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  imageAlt: text("image_alt").notNull().default(""),
  ...timestamps,
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  type: productTypeEnum("type").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "restrict" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  priceArs: integer("price_ars").notNull(),
  description: text("description").notNull().default(""),
  availabilityNote: text("availability_note").notNull().default(""),
  whatsappCtaLabel: text("whatsapp_cta_label").notNull().default(""),
  whatsappMessage: text("whatsapp_message").notNull().default(""),
  state: productStateEnum("state").notNull().default("draft"),
  sourceUrl: text("source_url"),
  ...timestamps,
});

export const productImages = pgTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sourceUrl: text("source_url"),
  provider: text("provider"),
  assetKey: text("asset_key"),
  cloudName: text("cloud_name"),
  alt: text("alt").notNull().default(""),
  position: integer("position").notNull().default(0),
  source: productImageSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productSizes = pgTable("product_sizes", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productSizeGuides = pgTable("product_size_guides", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  unitLabel: text("unit_label").notNull().default(""),
  notes: text("notes").notNull().default(""),
  sourceImageUrl: text("source_image_url"),
  columns: jsonb("columns").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  rows: jsonb("rows").$type<ProductSizeGuideRow[]>().notNull().default(sql`'[]'::jsonb`),
  ...timestamps,
});

export const brandRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const customerAccountRelations = relations(customerAccounts, ({ many }) => ({
  orders: many(orders),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  sizes: many(productSizes),
  sizeGuides: many(productSizeGuides),
  variants: many(productVariants),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  customerAccount: one(customerAccounts, {
    fields: [orders.customerAccountId],
    references: [customerAccounts.id],
  }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const productImageRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productSizeRelations = relations(productSizes, ({ one }) => ({
  product: one(products, {
    fields: [productSizes.productId],
    references: [products.id],
  }),
}));

export const productVariantRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productSizeGuideRelations = relations(productSizeGuides, ({ one }) => ({
  product: one(products, {
    fields: [productSizeGuides.productId],
    references: [products.id],
  }),
}));

export type BrandRecord = typeof brands.$inferSelect;
export type CategoryRecord = typeof categories.$inferSelect;
export type CustomerAccountRecord = typeof customerAccounts.$inferSelect;
export type OrderItemRecord = typeof orderItems.$inferSelect;
export type OrderRecord = typeof orders.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type ProductImageRecord = typeof productImages.$inferSelect;
export type ProductSizeRecord = typeof productSizes.$inferSelect;
export type ProductSizeGuideRecord = typeof productSizeGuides.$inferSelect;
export type ProductVariantRecord = typeof productVariants.$inferSelect;
export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  stock: integer("stock").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations for paymentEvents
const paymentEventRelations = relations(paymentEvents, ({ one }) => ({
  order: one(orders, {
    fields: [paymentEvents.orderId],
    references: [orders.id],
  }),
}));

// Relations for inventory
const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

export type PaymentEventRecord = typeof paymentEvents.$inferSelect;
export type InventoryRecord = typeof inventory.$inferSelect;

