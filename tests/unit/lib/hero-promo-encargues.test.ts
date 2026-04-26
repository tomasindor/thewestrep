import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPromoPresetFilters,
  getHeroPromoPreviewProducts,
  getPromoBannerForCatalogListing,
  matchesCatalogFilters,
  pickCuratedHeroProducts,
  resolvePromoIdFromSearchParams,
  resolvePromoPreset,
  selectHeroPromoProductsFromCuration,
} from "../../../lib/catalog/selectors";
import { heroPromoProducts, isHeroPromoCurationEnabled } from "../../../lib/curations/hero-promo-products";

test("resolvePromoPreset returns semantic combo preset for encargues", async () => {
  const preset = await resolvePromoPreset("combo-2da-30");

  assert.ok(preset);
  assert.equal(preset?.id, "combo-2da-30");
  assert.deepEqual(preset?.categorySlugs, ["pantalones", "buzos", "camperas"]);
  assert.equal(preset?.banner.title, "30% OFF en la segunda unidad");
});

test("resolvePromoPreset returns null for unknown ids", async () => {
  const preset = await resolvePromoPreset("black-friday");
  assert.equal(preset, null);
});

test("applyPromoPresetFilters injects multi-category ids while preserving explicit filters", () => {
  const filters = applyPromoPresetFilters(
    {
      brandId: "nike",
      query: "oversize",
      promoId: "combo-2da-30",
    },
    {
      id: "combo-2da-30",
      categorySlugs: ["pantalones", "buzos", "camperas"],
      categoryIds: ["cat-pantalones", "cat-buzos", "cat-camperas"],
      banner: {
        title: "30% OFF en la segunda unidad",
        rules: "Combiná 1 pantalón + 1 buzo/campera",
        disclosure: "Descuento sobre la prenda más barata",
      },
    },
  );

  assert.equal(filters.brandId, "nike");
  assert.equal(filters.query, "oversize");
  assert.equal(filters.promoId, "combo-2da-30");
  assert.deepEqual(filters.categoryIds, ["cat-pantalones", "cat-buzos", "cat-camperas"]);
});

test("manual hero curation provides exactly six top and six bottom products", () => {
  assert.equal(heroPromoProducts.topRow.length, 6);
  assert.equal(heroPromoProducts.bottomRow.length, 6);
  assert.equal(isHeroPromoCurationEnabled(heroPromoProducts), true);
});

test("hero promo curation is disabled when one row is missing", () => {
  assert.equal(
    isHeroPromoCurationEnabled({ topRow: ["only-top"], bottomRow: [] }),
    false,
  );
});

test("production empty curation falls back to default hero instead of mock promo rows", () => {
  const selected = selectHeroPromoProductsFromCuration(
    { topRow: ["top-missing"], bottomRow: ["bottom-missing"] },
    new Map(),
  );

  assert.equal(selected.isEnabled, false);
  assert.equal(selected.topRow.length, 0);
  assert.equal(selected.bottomRow.length, 0);
});

test("preview mode can still use explicit mock promo rows", () => {
  const preview = getHeroPromoPreviewProducts();

  assert.equal(preview.isEnabled, true);
  assert.equal(preview.topRow.length, 6);
  assert.equal(preview.bottomRow.length, 6);
  assert.equal(preview.topRow[0]?.slug.startsWith("mock-"), true);
  assert.equal(preview.bottomRow[0]?.slug.startsWith("mock-"), true);
});

test("pickCuratedHeroProducts degrades gracefully when slugs are missing", () => {
  const picked = pickCuratedHeroProducts(
    {
      topRow: ["top-1", "top-missing", "top-2"],
      bottomRow: ["bottom-missing", "bottom-1"],
    },
    new Map([
      ["top-1", { id: "top-1" }],
      ["top-2", { id: "top-2" }],
      ["bottom-1", { id: "bottom-1" }],
    ]),
  );

  assert.deepEqual(
    picked.topRow.map((item) => item.id),
    ["top-1", "top-2"],
  );
  assert.deepEqual(
    picked.bottomRow.map((item) => item.id),
    ["bottom-1"],
  );
});

test("matchesCatalogFilters supports OR filtering with categoryIds", () => {
  const product = {
    brand: { id: "brand-a" },
    category: { id: "cat-buzos" },
    availability: "encargue",
    state: "published",
    name: "Buzo Oversize",
    detail: "Detalle",
  };

  assert.equal(
    matchesCatalogFilters(product as never, {
      categoryIds: ["cat-buzos", "cat-camperas"],
      states: ["published"],
    }),
    true,
  );

  assert.equal(
    matchesCatalogFilters(product as never, {
      categoryIds: ["cat-pantalones"],
      states: ["published"],
    }),
    false,
  );
});

test("resolvePromoIdFromSearchParams prefers first promo value and keeps semantic id", () => {
  assert.equal(
    resolvePromoIdFromSearchParams({ promo: "combo-2da-30" }),
    "combo-2da-30",
  );

  assert.equal(
    resolvePromoIdFromSearchParams({ promo: ["combo-2da-30", "ignored"], query: "nike" }),
    "combo-2da-30",
  );

  assert.equal(
    resolvePromoIdFromSearchParams({ promo: ["", "combo-2da-30"] }),
    undefined,
  );
});

test("getPromoBannerForCatalogListing exposes destination banner only for encargue promo preset", async () => {
  const preset = await resolvePromoPreset("combo-2da-30");

  assert.ok(preset);

  const banner = getPromoBannerForCatalogListing("encargue", preset);
  assert.ok(banner);
  assert.equal(banner?.title, "30% OFF en la segunda unidad");
  assert.equal(banner?.rules, "Combiná 1 pantalón + 1 buzo/campera");
  assert.equal(banner?.disclosure, "Descuento sobre la prenda más barata");

  assert.equal(getPromoBannerForCatalogListing("stock", preset), null);
  assert.equal(getPromoBannerForCatalogListing("encargue", null), null);
});
