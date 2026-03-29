import { relations } from "drizzle-orm";
import { integer, pgEnum, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const productTypeEnum = pgEnum("product_type", ["stock", "encargue"]);
export const productStateEnum = pgEnum("product_state", ["draft", "published", "paused"]);
export const productImageSourceEnum = pgEnum("product_image_source", ["manual", "yupoo"]);

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

export const brandRelations = relations(brands, ({ many }) => ({
  products: many(products),
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
  variants: many(productVariants),
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

export type BrandRecord = typeof brands.$inferSelect;
export type CategoryRecord = typeof categories.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type ProductImageRecord = typeof productImages.$inferSelect;
export type ProductSizeRecord = typeof productSizes.$inferSelect;
export type ProductVariantRecord = typeof productVariants.$inferSelect;
