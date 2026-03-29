import { asc } from "drizzle-orm";

import { catalogInventorySource } from "@/lib/catalog/data/inventory";
import { buildProductWhatsappCta, buildProductWhatsappMessage } from "@/lib/catalog/whatsapp";
import { getBrandSchemaCompatibility } from "@/lib/db/brands-schema-compat";
import { getDb } from "@/lib/db/core";
import { brands, categories, productImages, products, productSizes, productVariants } from "@/lib/db/schema";
import { loadCliEnv } from "@/lib/env/load-cli";

async function main() {
  const { activeEnvFile } = loadCliEnv();
  const db = getDb();

  if (!db) {
    throw new Error(
      `[env] DATABASE_URL is required before running db:seed. Put it in ${activeEnvFile ?? ".env.local"} (recommended) or export DATABASE_URL in your shell.`,
    );
  }

  const compatibility = await getBrandSchemaCompatibility();

  await db.delete(productImages);
  await db.delete(productSizes);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(brands);
  await db.delete(categories);

  await db.insert(brands).values(
    catalogInventorySource.brands.map((brand) => {
      const values: typeof brands.$inferInsert = {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        imageUrl: brand.image ?? null,
        imageAlt: brand.alt ?? "",
      };

      if (compatibility.hasImageSourceUrl) {
        values.imageSourceUrl = brand.image ?? null;
      }

      if (compatibility.hasImageProvider) {
        values.imageProvider = null;
      }

      if (compatibility.hasImageAssetKey) {
        values.imageAssetKey = null;
      }

      return values;
    }),
  );

  await db.insert(categories).values(
    catalogInventorySource.categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.image,
      imageAlt: category.alt,
    })),
  );

  await db.insert(products).values(
    catalogInventorySource.products.map((product) => ({
      id: product.id,
      type: product.availability,
      name: product.name,
      slug: product.slug,
      brandId: product.brandId,
      categoryId: product.categoryId,
      priceArs: product.pricing.amount,
      description: product.detail,
      availabilityNote: product.note,
      whatsappCtaLabel: buildProductWhatsappCta(product.availability),
      whatsappMessage: buildProductWhatsappMessage({
        productName: product.name,
        availability: product.availability,
      }),
      state: "published" as const,
      sourceUrl: product.sourceUrl ?? null,
    })),
  );

  const imageRows = catalogInventorySource.products.flatMap((product) =>
    product.gallery.map((image, index) => ({
      id: `${product.id}_image_${index + 1}`,
      productId: product.id,
      url: image.src,
      alt: image.alt,
      position: index,
      source: product.sourceUrl?.includes("yupoo") ? ("yupoo" as const) : ("manual" as const),
    })),
  );

  if (imageRows.length > 0) {
    await db.insert(productImages).values(imageRows);
  }

  const sizeRows = catalogInventorySource.products.flatMap((product) =>
    (product.sizes ?? []).map((size, index) => ({
      id: `${product.id}_size_${index + 1}`,
      productId: product.id,
      label: size.label,
      position: index,
    })),
  );

  if (sizeRows.length > 0) {
    await db.insert(productSizes).values(sizeRows);
  }

  const variantRows = catalogInventorySource.products.flatMap((product) =>
    (product.variants ?? []).map((variant, index) => ({
      id: `${product.id}_variant_${index + 1}`,
      productId: product.id,
      label: variant.label,
      position: index,
    })),
  );

  if (variantRows.length > 0) {
    await db.insert(productVariants).values(variantRows);
  }

  const savedProducts = await db.select().from(products).orderBy(asc(products.createdAt));
  console.log(`Seed complete: ${savedProducts.length} products inserted.`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
