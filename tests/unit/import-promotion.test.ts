import assert from "node:assert/strict";
import test from "node:test";

import {
  createPromotionFoundation,
  createPromotionFoundationFromDb,
  promoteEligibleImportItems,
  promoteImportItem,
} from "../../lib/imports/promotion";

function createPromotionFixture() {
  const calls = {
    loadImportItemById: [] as string[],
    loadImportImagesByItemId: [] as string[],
    findProductBySlug: [] as string[],
    createProduct: [] as Array<Record<string, unknown>>,
    updateProduct: [] as Array<{ productId: string; values: Record<string, unknown> }>,
    insertProductImage: [] as unknown[],
    insertProductSize: [] as unknown[],
    upsertProductSizeGuide: [] as unknown[],
    markImportItemPromoted: [] as Array<{ importItemId: string; promotedAt: Date }>,
    markImportItemMediaFailed: [] as Array<{ importItemId: string; reason: string; failedAt: Date }>,
    downloadSourceImage: [] as string[],
    storeOriginalInR2: [] as Array<{ key: string; contentType: string }>,
    storeVariantInR2: [] as Array<{ key: string; contentType: string }>,
    generateCatalogVariants: [] as Array<{ originalKey: string }>,
  };

  const service = createPromotionFoundation({
    now: () => new Date("2026-04-09T13:00:00.000Z"),
    idFactory: (prefix) => `${prefix}-fixed`,
    buildOwnedAssetUrl: (assetKey) => `https://cdn.thewestrep.test/${assetKey}`,
    loadImportItemById: async (importItemId) => {
      calls.loadImportItemById.push(importItemId);
      return {
        id: importItemId,
        status: "approved",
        price: 89000,
        productData: {
          name: "Remera World Tour",
          slug: "remera-world-tour",
          brandId: "brand-1",
          categoryId: "category-1",
          type: "encargue",
          priceArs: 89000,
          description: "Desc",
          sourceUrl: "https://deateath.x.yupoo.com/albums/101?uid=1",
          sizeGuide: {
            title: "Tabla",
            unitLabel: "cm",
            notes: "Medidas aproximadas",
            columns: ["Largo", "Pecho"],
            rows: [{ label: "M", values: ["70", "54"] }],
          },
        },
      };
    },
    loadImportImagesByItemId: async (importItemId) => {
      calls.loadImportImagesByItemId.push(importItemId);
      return [
        {
          id: "import-image-1",
          importItemId,
          sourceUrl: "https://photo.yupoo.com/demo/1.jpg",
          order: 0,
          reviewState: "approved",
          isSizeGuide: false,
        },
        {
          id: "import-image-2",
          importItemId,
          sourceUrl: "https://photo.yupoo.com/demo/2.jpg",
          order: 1,
          reviewState: "approved",
          isSizeGuide: false,
        },
        {
          id: "import-image-3",
          importItemId,
          sourceUrl: "https://photo.yupoo.com/demo/size-guide.png",
          order: 2,
          reviewState: "approved",
          isSizeGuide: true,
        },
        {
          id: "import-image-4",
          importItemId,
          sourceUrl: "https://photo.yupoo.com/demo/rejected.jpg",
          order: 3,
          reviewState: "rejected",
          isSizeGuide: false,
        },
      ];
    },
    findProductBySlug: async (slug) => {
      calls.findProductBySlug.push(slug);
      return null;
    },
    createProduct: async (values) => {
      calls.createProduct.push(values);
      return { id: "product-new", slug: String(values.slug) };
    },
    updateProduct: async (productId, values) => {
      calls.updateProduct.push({ productId, values });
    },
    insertProductImage: async (values) => {
      calls.insertProductImage.push(values);
    },
    insertProductSize: async (values) => {
      calls.insertProductSize.push(values);
    },
    upsertProductSizeGuide: async (values) => {
      calls.upsertProductSizeGuide.push(values);
    },
    markImportItemPromoted: async (values) => {
      calls.markImportItemPromoted.push(values);
    },
    markImportItemMediaFailed: async (values) => {
      calls.markImportItemMediaFailed.push(values);
    },
    downloadSourceImage: async (url) => {
      calls.downloadSourceImage.push(url);
      return {
        body: Buffer.from(`original:${url}`),
        contentType: "image/jpeg",
      };
    },
    storeOriginalInR2: async (write) => {
      calls.storeOriginalInR2.push({ key: write.key, contentType: write.contentType });
    },
    generateCatalogVariants: async ({ originalKey }) => {
      calls.generateCatalogVariants.push({ originalKey });

      return {
        original: {
          key: originalKey,
          width: 1200,
          height: 1400,
        },
        variants: {
          thumb: {
            key: `${originalKey.replace(/\.jpe?g$|\.png$/i, "")}/thumb.webp`,
            buffer: Buffer.from("thumb"),
            contentType: "image/webp" as const,
            width: 256,
            height: 300,
          },
          "cart-thumb": {
            key: `${originalKey.replace(/\.jpe?g$|\.png$/i, "")}/cart-thumb.webp`,
            buffer: Buffer.from("cart"),
            contentType: "image/webp" as const,
            width: 240,
            height: 280,
          },
          card: {
            key: `${originalKey.replace(/\.jpe?g$|\.png$/i, "")}/card.webp`,
            buffer: Buffer.from("card"),
            contentType: "image/webp" as const,
            width: 960,
            height: 1120,
          },
          detail: {
            key: `${originalKey.replace(/\.jpe?g$|\.png$/i, "")}/detail.webp`,
            buffer: Buffer.from("detail"),
            contentType: "image/webp" as const,
            width: 1440,
            height: 1680,
          },
          lightbox: {
            key: `${originalKey.replace(/\.jpe?g$|\.png$/i, "")}/lightbox.webp`,
            buffer: Buffer.from("lightbox"),
            contentType: "image/webp" as const,
            width: 2200,
            height: 2560,
          },
        },
      };
    },
    storeVariantInR2: async (write) => {
      calls.storeVariantInR2.push({ key: write.key, contentType: write.contentType });
    },
  });

  return { service, calls };
}

test("promoteImportItem generates deferred catalog variants only for active curated gallery images", async () => {
  const { service, calls } = createPromotionFixture();

  const result = await promoteImportItem({ importItemId: "item-1" }, service);

  assert.equal(result.productId, "product-new");
  assert.equal(result.createdProduct, true);
  assert.equal(result.imagesInserted, 2);
  assert.equal(result.sizeGuidePreserved, true);
  assert.equal(calls.downloadSourceImage.length, 2);
  assert.equal(calls.storeOriginalInR2.length, 2);
  assert.equal(calls.generateCatalogVariants.length, 2);
  assert.equal(calls.storeVariantInR2.length, 10);

  assert.equal(calls.createProduct.length, 1);
  assert.equal(calls.insertProductImage.length, 2);
  assert.equal(calls.upsertProductSizeGuide.length, 1);

  const [firstImage] = calls.insertProductImage as Array<{ url: string; provider: string; assetKey: string | null; variantsManifest?: { stage?: string } }>;
  assert.match(firstImage.url, /\/detail\.webp$/);
  assert.equal(firstImage.provider, "r2");
  assert.match(firstImage.assetKey ?? "", /\/detail\.webp$/);
  assert.equal(firstImage.variantsManifest?.stage, "catalog-ready");

  const [sizeGuideUpsert] = calls.upsertProductSizeGuide as Array<{ sourceImageUrl?: string }>;
  assert.equal(sizeGuideUpsert.sourceImageUrl, "https://photo.yupoo.com/demo/size-guide.png");
});

test("promoteImportItem updates existing draft products and rejects non-draft products conservatively", async () => {
  const base = createPromotionFixture();
  base.service.findProductBySlug = async () => ({ id: "product-existing", slug: "remera-world-tour", state: "draft" });

  const updated = await promoteImportItem({ importItemId: "item-2" }, base.service);
  assert.equal(updated.productId, "product-existing");
  assert.equal(updated.createdProduct, false);
  assert.equal(base.calls.updateProduct.length, 1);
  assert.equal(base.calls.createProduct.length, 0);

  const blocked = createPromotionFixture();
  blocked.service.findProductBySlug = async () => ({ id: "product-published", slug: "remera-world-tour", state: "published" });

  await assert.rejects(
    () => promoteImportItem({ importItemId: "item-3" }, blocked.service),
    /estado draft/,
  );
});

test("promoteImportItem blocks products with fewer than two useful images", async () => {
  const fixture = createPromotionFixture();
  fixture.service.loadImportImagesByItemId = async (importItemId) => [
    {
      id: "import-image-gallery-only",
      importItemId,
      sourceUrl: "https://photo.yupoo.com/demo/solo-gallery.jpg",
      order: 0,
      reviewState: "approved",
      isSizeGuide: false,
    },
  ];

  await assert.rejects(
    () => promoteImportItem({ importItemId: "item-gallery-only" }, fixture.service),
    /insufficient useful images/i,
  );
});

test("promoteImportItem maps staging metadata fallbacks and resolves brand/category IDs from names", async () => {
  const fixture = createPromotionFixture();
  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 129900,
    productData: {
      finalName: "Campera Archive",
      rawName: "RAW CAMPA",
      brandName: "Nike",
      categoryName: "Camperas",
      finalPrice: 129900,
      sourceUrl: "https://deateath.x.yupoo.com/albums/202?uid=1",
    },
  });
  fixture.service.findBrandIdByName = async (name) => (name === "Nike" ? "brand-nike" : null);
  fixture.service.findCategoryIdByName = async (name) => (name === "Camperas" ? "category-camperas" : null);

  const result = await promoteImportItem({ importItemId: "item-name-fallback" }, fixture.service);

  assert.equal(result.productId, "product-new");
  assert.equal(fixture.calls.createProduct.length, 1);
  const created = fixture.calls.createProduct[0] as Record<string, unknown>;
  assert.equal(created.name, "Campera Archive");
  assert.equal(created.brandId, "brand-nike");
  assert.equal(created.categoryId, "category-camperas");
  assert.equal(created.priceArs, 129900);
});

test("promoteImportItem validates required metadata before any R2 upload or variant generation", async () => {
  const fixture = createPromotionFixture();
  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 99000,
    productData: {
      productName: "Producto sin marca",
      finalPrice: 99000,
      categoryName: "Remeras",
    },
  });
  fixture.service.findCategoryIdByName = async () => "category-remeras";

  await assert.rejects(
    () => promoteImportItem({ importItemId: "item-metadata-invalid" }, fixture.service),
    /brandId|brand/i,
  );

  assert.equal(fixture.calls.downloadSourceImage.length, 0);
  assert.equal(fixture.calls.storeOriginalInR2.length, 0);
  assert.equal(fixture.calls.generateCatalogVariants.length, 0);
  assert.equal(fixture.calls.storeVariantInR2.length, 0);
  assert.equal(fixture.calls.markImportItemMediaFailed.length, 0);
});

test("promoteImportItem creates normalized deduplicated product variants from staged productData variants", async () => {
  const fixture = createPromotionFixture();
  const insertedVariantLabels: string[] = [];

  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 89000,
    productData: {
      name: "Remera World Tour",
      slug: "remera-world-tour",
      brandId: "brand-1",
      categoryId: "category-1",
      type: "encargue",
      priceArs: 89000,
      variants: [" Negro ", "negro", " Azul  ", "", "azul", " Blanco"],
    },
  });

  fixture.service.insertProductVariant = async (values) => {
    insertedVariantLabels.push(values.label);
  };

  await promoteImportItem({ importItemId: "item-variants" }, fixture.service);

  assert.deepEqual(insertedVariantLabels, ["Negro", "Azul", "Blanco"]);
});

test("promoteImportItem skips product variant creation when staged productData has no variants", async () => {
  const fixture = createPromotionFixture();
  const insertedVariantLabels: string[] = [];

  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 89000,
    productData: {
      name: "Remera World Tour",
      slug: "remera-world-tour",
      brandId: "brand-1",
      categoryId: "category-1",
      type: "encargue",
      priceArs: 89000,
      variants: [],
    },
  });

  fixture.service.insertProductVariant = async (values) => {
    insertedVariantLabels.push(values.label);
  };

  await promoteImportItem({ importItemId: "item-no-variants" }, fixture.service);

  assert.deepEqual(insertedVariantLabels, []);
});

test("promoteImportItem creates normalized deduplicated product sizes from staged productData sizes", async () => {
  const fixture = createPromotionFixture();
  const insertedSizeLabels: string[] = [];

  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 89000,
    productData: {
      name: "Remera World Tour",
      slug: "remera-world-tour",
      brandId: "brand-1",
      categoryId: "category-1",
      type: "encargue",
      priceArs: 89000,
      sizes: [" m ", "M", " xxl ", "2XL", "", " 42 ", "xxxl", "3xl", "42"],
    },
  });

  fixture.service.insertProductSize = async (values) => {
    insertedSizeLabels.push(values.label);
  };

  await promoteImportItem({ importItemId: "item-sizes" }, fixture.service);

  assert.deepEqual(insertedSizeLabels, ["M", "2XL", "42", "3XL"]);
});

test("promoteImportItem skips product size creation when staged productData has no sizes", async () => {
  const fixture = createPromotionFixture();
  const insertedSizeLabels: string[] = [];

  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 89000,
    productData: {
      name: "Remera World Tour",
      slug: "remera-world-tour",
      brandId: "brand-1",
      categoryId: "category-1",
      type: "encargue",
      priceArs: 89000,
      sizes: [],
    },
  });

  fixture.service.insertProductSize = async (values) => {
    insertedSizeLabels.push(values.label);
  };

  await promoteImportItem({ importItemId: "item-no-sizes" }, fixture.service);

  assert.deepEqual(insertedSizeLabels, []);
});

test("promoteEligibleImportItems promotes in bulk and reports blocked products", async () => {
  const fixture = createPromotionFixture();
  const productData = {
    name: "Remera World Tour",
    slug: "remera-world-tour",
    brandId: "brand-1",
    categoryId: "category-1",
    type: "encargue",
    priceArs: 89000,
    description: "Desc",
    sourceUrl: "https://deateath.x.yupoo.com/albums/101?uid=1",
  } as const;
  fixture.service.listEligibleImportItems = async () => [
    { id: "item-1", status: "approved", productData, price: 89000 },
    { id: "item-size-only", status: "approved", productData, price: 89000 },
  ];

  const originalLoadImages = fixture.service.loadImportImagesByItemId;
  fixture.service.loadImportImagesByItemId = async (importItemId) => {
    if (importItemId === "item-size-only") {
      return [{
        id: "import-image-size-only",
        importItemId,
        sourceUrl: "https://photo.yupoo.com/demo/size-guide.png",
        order: 0,
        reviewState: "approved",
        isSizeGuide: true,
      }];
    }

    return originalLoadImages(importItemId);
  };

  const result = await promoteEligibleImportItems({ itemIds: ["item-1", "item-size-only"] }, fixture.service);
  assert.equal(result.promotedCount, 1);
  assert.deepEqual(result.promotedItemIds, ["item-1"]);
  assert.equal(result.blocked[0]?.itemId, "item-size-only");
});

test("promoteImportItem marks explicit media-failed state when deferred variant generation fails", async () => {
  const fixture = createPromotionFixture();
  fixture.service.generateCatalogVariants = async () => {
    throw new Error("sharp exploded");
  };

  await assert.rejects(
    () => promoteImportItem({ importItemId: "item-fail" }, fixture.service),
    /variantes diferidas/i,
  );

  assert.equal(fixture.calls.markImportItemMediaFailed.length, 1);
  assert.equal(fixture.calls.markImportItemMediaFailed[0]?.importItemId, "item-fail");
});

test("promoteImportItem marks items as consumed and blocks repeated promotion", async () => {
  const fixture = createPromotionFixture();
  const itemById = new Map<string, { id: string; status: string; productData: Record<string, unknown> | null; price: number | null }>();

  fixture.service.loadImportItemById = async (importItemId) => {
    const current = itemById.get(importItemId);
    if (current) {
      return current;
    }

    const initial = {
      id: importItemId,
      status: "approved",
      price: 89000,
      productData: {
        name: "Remera World Tour",
        slug: "remera-world-tour",
        brandId: "brand-1",
        categoryId: "category-1",
        type: "encargue",
        priceArs: 89000,
      },
    };
    itemById.set(importItemId, initial);
    return initial;
  };

  fixture.service.markImportItemPromoted = async ({ importItemId }) => {
    const current = itemById.get(importItemId);
    assert.ok(current);
    itemById.set(importItemId, {
      ...current,
      status: "approved",
      productData: {
        ...(current.productData ?? {}),
        _promotionConsumedAt: "2026-04-11T00:00:00.000Z",
      },
    });
  };

  const first = await promoteImportItem({ importItemId: "item-repeat" }, fixture.service);
  assert.equal(first.importItemId, "item-repeat");

  await assert.rejects(
    () => promoteImportItem({ importItemId: "item-repeat" }, fixture.service),
    /ya fue promovido/i,
  );
});

test("createPromotionFoundationFromDb excludes consumed and non-approved items from bulk candidates", async () => {
  const db = {
    query: {
      importItems: {
        findMany: async () => [
          { id: "item-approved", status: "approved", productData: { name: "A" }, price: 100 },
          { id: "item-consumed", status: "approved", productData: { _promotionConsumedAt: "2026-04-11T00:00:00.000Z" }, price: 100 },
          { id: "item-pending", status: "pending", productData: { name: "P" }, price: 100 },
          { id: "item-rejected", status: "rejected", productData: { name: "R" }, price: 100 },
          { id: "item-promoted", status: "promoted", productData: { name: "Z" }, price: 100 },
        ],
      },
    },
    insert: () => ({ values: async () => ({}) }),
    update: () => ({ set: () => ({ where: async () => ({}) }) }),
  };

  const foundation = createPromotionFoundationFromDb({ db: db as never });

  const candidates = await foundation.listEligibleImportItems?.({});
  assert.deepEqual(candidates?.map((item) => item.id), ["item-approved"]);
});

test("promoteEligibleImportItems supports name-based metadata flow in bulk promotion", async () => {
  const fixture = createPromotionFixture();
  fixture.service.listEligibleImportItems = async () => [
    {
      id: "item-bulk-name-based",
      status: "approved",
      price: 99990,
      productData: {
        productName: "Buzo clásico",
        brandName: "Adidas",
        categoryName: "Buzos",
        priceArs: 99990,
      },
    },
  ];
  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 99990,
    productData: {
      productName: "Buzo clásico",
      brandName: "Adidas",
      categoryName: "Buzos",
      priceArs: 99990,
    },
  });
  fixture.service.findBrandIdByName = async (name) => (name === "Adidas" ? "brand-adidas" : null);
  fixture.service.findCategoryIdByName = async (name) => (name === "Buzos" ? "category-buzos" : null);

  const result = await promoteEligibleImportItems({ itemIds: ["item-bulk-name-based"] }, fixture.service);

  assert.equal(result.promotedCount, 1);
  assert.deepEqual(result.promotedItemIds, ["item-bulk-name-based"]);
  assert.equal(result.blocked.length, 0);
});

test("promoteImportItem normalizes aliased category names before resolving DB category", async () => {
  const fixture = createPromotionFixture();
  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 99990,
    productData: {
      productName: "Buzo clásico",
      brandName: "Adidas",
      categoryName: "Buzos",
      priceArs: 99990,
    },
  });

  fixture.service.findBrandIdByName = async (name) => (name === "Adidas" ? "brand-adidas" : null);
  const categoryLookups: string[] = [];
  fixture.service.findCategoryIdByName = async (name) => {
    categoryLookups.push(name);
    return name === "Hoodies" ? "category-hoodies" : null;
  };

  const result = await promoteImportItem({ importItemId: "item-alias-category" }, fixture.service);

  assert.equal(result.importItemId, "item-alias-category");
  assert.deepEqual(categoryLookups, ["Buzos", "Hoodies"]);
  const created = fixture.calls.createProduct[0] as Record<string, unknown>;
  assert.equal(created.categoryId, "category-hoodies");
});

test("promoteImportItem resolves representative aliases across imported category map", async () => {
  const cases = [
    { input: "hoodie", canonical: "Hoodies" },
    { input: "camiseta", canonical: "Remeras" },
    { input: "jacket", canonical: "Camperas" },
    { input: "Pantalón", canonical: "Pantalones" },
    { input: "short", canonical: "Shorts" },
    { input: "beanie", canonical: "Gorros" },
    { input: "shirts", canonical: "Camisas" },
    { input: "polo", canonical: "Polos" },
  ] as const;

  for (const entry of cases) {
    const fixture = createPromotionFixture();
    fixture.service.loadImportItemById = async (importItemId) => ({
      id: importItemId,
      status: "approved",
      price: 99990,
      productData: {
        productName: `Producto ${entry.input}`,
        brandName: "Adidas",
        categoryName: entry.input,
        priceArs: 99990,
      },
    });

    fixture.service.findBrandIdByName = async (name) => (name === "Adidas" ? "brand-adidas" : null);
    const categoryLookups: string[] = [];
    fixture.service.findCategoryIdByName = async (name) => {
      categoryLookups.push(name);
      return name === entry.canonical ? `category-${entry.canonical.toLowerCase()}` : null;
    };

    const result = await promoteImportItem({ importItemId: `item-alias-${entry.input}` }, fixture.service);

    assert.equal(result.importItemId, `item-alias-${entry.input}`);
    assert.deepEqual(categoryLookups, [entry.input, entry.canonical]);
    const created = fixture.calls.createProduct[0] as Record<string, unknown>;
    assert.equal(created.categoryId, `category-${entry.canonical.toLowerCase()}`);
  }
});

test("promoteImportItem falls back to Importados Yupoo category when no exact or aliased match exists", async () => {
  const fixture = createPromotionFixture();
  fixture.service.loadImportItemById = async (importItemId) => ({
    id: importItemId,
    status: "approved",
    price: 124000,
    productData: {
      productName: "Producto importado",
      brandName: "Nike",
      categoryName: "Categoría desconocida",
      priceArs: 124000,
    },
  });

  fixture.service.findBrandIdByName = async (name) => (name === "Nike" ? "brand-nike" : null);
  const categoryLookups: string[] = [];
  fixture.service.findCategoryIdByName = async (name) => {
    categoryLookups.push(name);
    return name === "Importados Yupoo" ? "category-importados-yupoo" : null;
  };

  const result = await promoteImportItem({ importItemId: "item-fallback-category" }, fixture.service);

  assert.equal(result.importItemId, "item-fallback-category");
  assert.deepEqual(categoryLookups, ["Categoría desconocida", "Importados Yupoo"]);
  const created = fixture.calls.createProduct[0] as Record<string, unknown>;
  assert.equal(created.categoryId, "category-importados-yupoo");
});
