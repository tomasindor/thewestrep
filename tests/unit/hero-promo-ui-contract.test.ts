import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildHeroPromoRenderContract,
  buildHeroPromoCtaHref,
  buildHeroPromoProductHref,
  getHeroPromoCarouselLayout,
  getHeroPromoInitialCellHemispheres,
  splitHeroPromoHeadline,
  resolveHomepageHeroVariant,
} from "../../lib/marketing/hero-promo-runtime";
import {
  applyPromoPresetFilters,
  resolvePromoPreset,
} from "../../lib/catalog/selectors";

test("homepage hero resolves promo variant only when promo rows are available", () => {
  assert.equal(
    resolveHomepageHeroVariant({
      isEnabled: true,
      topRowCount: 6,
      bottomRowCount: 6,
    }),
    "promo",
  );

  assert.equal(
    resolveHomepageHeroVariant({
      isEnabled: true,
      topRowCount: 6,
      bottomRowCount: 0,
    }),
    "default",
  );
});

test("hero CTA keeps semantic promo URL and preset activates promo banner payload", async () => {
  const ctaHref = buildHeroPromoCtaHref("combo-2da-30");
  const preset = await resolvePromoPreset("combo-2da-30");
  const applied = applyPromoPresetFilters(
    {
      query: "nike",
      promoId: undefined,
    },
    preset
      ? {
          ...preset,
          categoryIds: ["cat-pantalones", "cat-buzos", "cat-camperas"],
        }
      : null,
  );

  assert.equal(ctaHref, "/encargue?promo=combo-2da-30");
  assert.ok(preset);
  assert.equal(preset?.banner.title, "30% OFF en la segunda unidad");
  assert.equal(applied.promoId, "combo-2da-30");
  assert.deepEqual(applied.categoryIds, ["cat-pantalones", "cat-buzos", "cat-camperas"]);
});

test("hero product click resolves to /producto/[slug] route", () => {
  assert.equal(buildHeroPromoProductHref("buzo-nike-gris"), "/producto/buzo-nike-gris");
  assert.equal(buildHeroPromoProductHref("campera-nike-01"), "/producto/campera-nike-01");
});

test("hero carousel layout enlarges frame area while reducing vertical dead-zone between rails", () => {
  const compactLayout = getHeroPromoCarouselLayout(1, "top");
  const richLayout = getHeroPromoCarouselLayout(12, "top");
  const richBottomLayout = getHeroPromoCarouselLayout(12, "bottom");

  assert.equal(compactLayout.canSlide, false);
  assert.equal(richLayout.canSlide, true);
  assert.equal(richLayout.renderMode, "custom");
  assert.equal(richLayout.mode, "free-snap");
  assert.equal(richLayout.selector, ".hero-promo-carousel-cell");
  assert.equal(richLayout.drag, true);
  assert.equal(richLayout.slides.perView, 1);
  assert.equal(richLayout.slides.origin, "center");
  assert.equal(richLayout.slides.spacing, 0);
  assert.equal(richLayout.scene.widthPx, 1480);
  assert.equal(richLayout.scene.heightPx, 324);
  assert.equal(richBottomLayout.scene.heightPx, 432);
  assert.ok(richBottomLayout.scene.heightPx > richLayout.scene.heightPx);
  assert.equal(richLayout.cylinder.cellCount, 12);
  assert.equal(richLayout.cylinder.thetaDeg, 30);
  assert.ok(richLayout.cylinder.radiusPx > 0);
  assert.equal(richLayout.cylinder.perspectivePx, 980);
  assert.equal(richLayout.cylinder.cellWidthPx, 292);
  assert.equal(richLayout.cylinder.cellHeightPx, 276);
  assert.equal(richBottomLayout.cylinder.cellHeightPx, 344);
  assert.ok(richBottomLayout.cylinder.cellHeightPx > richLayout.cylinder.cellHeightPx);
  assert.equal(richLayout.cylinder.cellGapPx, 72);
  assert.equal(compactLayout.scene.widthPx, 1480);
  assert.equal(compactLayout.scene.heightPx, 324);
  assert.equal(compactLayout.cylinder.perspectivePx, 980);
  assert.equal(compactLayout.cylinder.cellWidthPx, 292);
  assert.equal(compactLayout.cylinder.cellHeightPx, 276);
  assert.equal(compactLayout.cylinder.cellGapPx, 72);
  assert.equal(
    richLayout.cylinder.getContainerTransform(0),
    `translateZ(-${richLayout.cylinder.radiusPx}px) rotateY(0deg)`,
  );
  assert.equal(richLayout.cylinder.getContainerTransform(0.25), `translateZ(-${richLayout.cylinder.radiusPx}px) rotateY(-90deg)`);
  assert.equal(
    richLayout.cylinder.getCellTransform(1),
    `rotateY(${richLayout.cylinder.thetaDeg}deg) translateZ(${richLayout.cylinder.radiusPx}px)`,
  );

  const frontCell = richLayout.cylinder.getCellVisualState(0, 0);
  const sideCell = richLayout.cylinder.getCellVisualState(1, 0);
  const backCell = richLayout.cylinder.getCellVisualState(6, 0);
  const frontHemisphereAtFront = richLayout.cylinder.getCellHemisphere(0, 0);
  const sideHemisphereAtEdge = richLayout.cylinder.getCellHemisphere(3, 0);
  const frontHemisphereAtRearTurn = richLayout.cylinder.getCellHemisphere(0, 0.5);
  const rearHemisphereAtFront = richLayout.cylinder.getCellHemisphere(6, 0);
  const initialHemispheres = getHeroPromoInitialCellHemispheres(richLayout);

  assert.equal(frontCell.scale, 1);
  assert.equal(frontCell.opacity, 1);
  assert.equal(frontCell.zIndex, 2);
  assert.equal(sideCell.scale, frontCell.scale);
  assert.equal(sideCell.opacity, frontCell.opacity);
  assert.ok(sideCell.zIndex < frontCell.zIndex);
  assert.equal(sideCell.scale, 1);
  assert.equal(sideCell.opacity, 1);
  assert.ok(sideCell.zIndex >= 1);
  assert.equal(backCell.scale, 1);
  assert.equal(backCell.opacity, 1);
  assert.ok(backCell.zIndex >= 1);
  assert.equal(frontHemisphereAtFront, "front");
  assert.equal(sideHemisphereAtEdge, "rear");
  assert.equal(frontHemisphereAtRearTurn, "rear");
  assert.equal(rearHemisphereAtFront, "rear");
  assert.deepEqual(initialHemispheres.slice(0, 7), ["front", "front", "front", "rear", "rear", "rear", "rear"]);
});

test("promo carousel layout caps per-view by available products", () => {
  const twoProducts = getHeroPromoCarouselLayout(2, "bottom");

  assert.equal(twoProducts.slides.perView, 1);
  assert.equal(twoProducts.cylinder.cellCount, 2);
  assert.equal(twoProducts.cylinder.thetaDeg, 180);
  assert.equal(twoProducts.mode, "free-snap");
  assert.equal(twoProducts.renderMode, "custom");
  assert.equal(twoProducts.drag, true);
});

test("hero render contract enforces tighter rail attachment with uniform per-rail image scaling", () => {
  const previousPublicBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL = "https://cdn.thewestrep.com/images";

  try {
    const contract = buildHeroPromoRenderContract({
      topRowCount: 6,
      bottomRowCount: 6,
    });

    assert.equal(contract.heroLabel, "THE WEST REP");
    assert.equal(contract.promoLabel, "COMBINALOS COMO QUIERAS");
    assert.equal(contract.headline, "COMBINALOS<br/>COMO QUIERAS");
    assert.equal(contract.rules, "30% OFF EN LA 2DA UNIDAD");
    assert.equal(contract.disclosure, "Descuento sobre la prenda más barata");
    assert.equal(contract.legal, "Promo por tiempo limitado.");
    assert.equal(contract.cta.label, "ARMA TU COMBO");
    assert.equal(contract.cta.href, "/encargue?promo=combo-2da-30");
    assert.equal(contract.cta.ariaLabel, "Armá tu combo en encargues");
    assert.equal(contract.cta.tracking.track, "hero-cta");
    assert.equal(contract.cta.tracking.promo, "combo-2da-30");
    assert.equal(contract.secondaryCta.tracking.track, "hero-secondary-cta");
    assert.equal(contract.secondaryCta.tracking.promo, "combo-2da-30");
    assert.equal(contract.visual.cellTreatment, "floating-cutout");
    assert.equal(contract.visual.hideCardSurfaces, true);
    assert.equal(contract.visual.carouselStackGapPx, -168);
    assert.equal(contract.visual.panelTone, "dark-urban");
    assert.equal(contract.visual.panelBranding, "thewestrep");
    assert.deepEqual(contract.visual.hierarchy, ["brand", "promo", "headline", "proof", "cta"]);
    assert.equal(contract.visual.heroSurface, "transparent-editorial");
    assert.equal(contract.visual.carouselSetAlignment, "centered");
    assert.equal(contract.visual.railImageScale.top, 0.94);
    assert.equal(contract.visual.railImageScale.bottom, 1.08);

    assert.equal(contract.topCarousel.ariaLabel, "Carrusel superior de buzos y camperas");
    assert.equal(contract.topCarousel.productCount, 6);
    assert.equal(contract.topCarousel.faceAssets.length, 6);
    assert.deepEqual(contract.topCarousel.faceAssets[0], {
      front: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/top/front/top-01-front.png",
      back: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/top/back/top-01-back.png",
    });
    assert.deepEqual(contract.topCarousel.faceAssets[5], {
      front: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/top/front/top-06-front.png",
      back: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/top/back/top-06-back.png",
    });
    assert.equal(contract.topCarousel.layout.renderMode, "custom");
    assert.equal(contract.topCarousel.layout.mode, "free-snap");
    assert.equal(contract.topCarousel.layout.selector, ".hero-promo-carousel-cell");
    assert.equal(contract.topCarousel.label, "BUZOS & CAMPERAS");
    assert.equal(contract.topCarousel.dragCue, "ARRASTRÁ");
    assert.equal(contract.topCarousel.layout.scene.widthPx, 1480);
    assert.equal(contract.topCarousel.layout.scene.heightPx, 324);
    assert.equal(contract.topCarousel.layout.cylinder.cellGapPx, 72);

    assert.equal(contract.bottomCarousel.ariaLabel, "Carrusel inferior de pantalones");
    assert.equal(contract.bottomCarousel.productCount, 6);
    assert.equal(contract.bottomCarousel.faceAssets.length, 6);
    assert.deepEqual(contract.bottomCarousel.faceAssets[0], {
      front: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/bottom/front/bottom-01-front.png",
      back: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/bottom/back/bottom-01-back.png",
    });
    assert.deepEqual(contract.bottomCarousel.faceAssets[5], {
      front: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/bottom/front/bottom-06-front.png",
      back: "https://cdn.thewestrep.com/images/imports/hero-promo-encargues/bottom/back/bottom-06-back.png",
    });
    assert.equal(contract.bottomCarousel.layout.renderMode, "custom");
    assert.equal(contract.bottomCarousel.layout.mode, "free-snap");
    assert.equal(contract.bottomCarousel.layout.selector, ".hero-promo-carousel-cell");
    assert.equal(contract.bottomCarousel.label, "PANTALONES");
    assert.equal(contract.bottomCarousel.dragCue, "ARRASTRÁ");
    assert.equal(contract.bottomCarousel.layout.scene.widthPx, 1480);
    assert.equal(contract.bottomCarousel.layout.scene.heightPx, 432);
    assert.equal(contract.bottomCarousel.layout.cylinder.cellHeightPx, 344);
    assert.ok(contract.bottomCarousel.layout.scene.heightPx > contract.topCarousel.layout.scene.heightPx);
    assert.ok(contract.bottomCarousel.layout.cylinder.cellHeightPx > contract.topCarousel.layout.cylinder.cellHeightPx);
    assert.equal(contract.bottomCarousel.layout.cylinder.cellGapPx, 72);

    assert.equal(contract.layout.desktop.infoPanelPosition, "side");
    assert.equal(contract.layout.desktop.frameMode, "framed");
    assert.equal(contract.layout.desktop.infoPanelWidthRatio, 0.55);
    assert.equal(contract.layout.desktop.carouselMaxWidthPx, 1600);
    assert.equal(contract.layout.viewport.screenHeight, "first-screen-minus-header");
    assert.equal(contract.layout.viewport.heightVh, 58);
    assert.equal(contract.layout.viewport.publicHeaderOffsetPx, 92);
    assert.equal(contract.layout.tablet.infoPanelPosition, "top");
    assert.equal(contract.layout.mobile.infoPanelPosition, "top");
  } finally {
    if (previousPublicBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL = previousPublicBaseUrl;
    }
  }
});

test("hero render contract keeps compact mobile carousel behavior", () => {
  const contract = buildHeroPromoRenderContract({
    topRowCount: 6,
    bottomRowCount: 2,
  });
  const compactContract = buildHeroPromoRenderContract({
    topRowCount: 2,
    bottomRowCount: 1,
  });

  assert.equal(contract.topCarousel.layout.slides.perView, 1);
  assert.equal(contract.topCarousel.layout.canSlide, true);
  assert.equal(contract.topCarousel.layout.slides.spacing, 0);
  assert.equal(contract.bottomCarousel.layout.canSlide, true);
  assert.equal(compactContract.visual.carouselStackGapPx, -168);
  assert.equal(compactContract.heroLabel, "THE WEST REP");
  assert.equal(compactContract.visual.heroSurface, "transparent-editorial");
  assert.deepEqual(compactContract.visual.hierarchy, ["brand", "promo", "headline", "proof", "cta"]);
  assert.deepEqual(compactContract.visual.mobileOrder, [
    "brand",
    "promo",
    "headline",
    "cta",
    "proof",
    "disclosure",
    "legal",
    "carousels",
  ]);
  assert.equal(compactContract.layout.viewport.heightVh, 58);
  assert.equal(compactContract.visual.continuationCue.fadeToBackgroundColor, "rgba(8, 10, 18, 0.5)");
  assert.equal(compactContract.visual.showSlideFrame, true);
  assert.equal(compactContract.visual.railImageScale.top, 0.94);
  assert.equal(compactContract.visual.railImageScale.bottom, 1.08);
});

test("hero render contract exposes layered visual cues and CTA metadata for runtime rendering", () => {
  const contract = buildHeroPromoRenderContract({
    topRowCount: 6,
    bottomRowCount: 6,
  });

  assert.equal(contract.visual.textTreatment, "transparent-editorial");
  assert.equal(contract.visual.carouselHints.showLabels, true);
  assert.equal(contract.visual.carouselHints.showEdgeFades, false);
  assert.equal(contract.visual.carouselHints.showDragCue, true);
  assert.equal(contract.visual.headlineAlign, "left");
  assert.equal(contract.visual.continuationCue.showBottomFade, false);
  assert.equal(contract.visual.continuationCue.fadeToBackgroundColor, "rgba(8, 10, 18, 0.5)");
  assert.equal(contract.visual.showSlideFrame, true);
  assert.equal(contract.visual.railImageScale.top, 0.94);
  assert.equal(contract.visual.railImageScale.bottom, 1.08);
  assert.equal(contract.visual.textInsetInlineStartPx.desktop, 108);
  assert.equal(contract.visual.textInsetInlineStartPx.mobile, 24);
  assert.equal(contract.cta.ariaLabel, "Armá tu combo en encargues");
  assert.equal(contract.cta.tracking.track, "hero-cta");
  assert.equal(contract.secondaryCta.tracking.track, "hero-secondary-cta");
  assert.equal(contract.secondaryCta.label, "VER CATALOGO COMPLETO");
});

test("hero runtime uses production slide-frame contract without debug flag", () => {
  const contract = buildHeroPromoRenderContract({
    topRowCount: 6,
    bottomRowCount: 6,
  });
  const visual = contract.visual as Record<string, unknown>;

  assert.equal(visual.showSlideFrame, true);
  assert.equal("debugSlideFrame" in visual, false);
});

test("hero carousel source keeps hidden-until-ready strategy and premium frame styles", () => {
  const heroSource = fs.readFileSync(path.resolve("./components/marketing/hero-promo.tsx"), "utf-8");
  const cssSource = fs.readFileSync(path.resolve("./components/marketing/hero-promo.module.css"), "utf-8");

  assert.match(heroSource, /const \[isReady, setIsReady\] = useState\(false\);/);
  assert.match(heroSource, /useState<Array<"front" \| "rear">>\(\(\) => getHeroPromoInitialCellHemispheres\(carouselLayout\)\)/);
  assert.match(heroSource, /setCellHemispheres\(getHeroPromoInitialCellHemispheres\(carouselLayout\)\);/);
  assert.doesNotMatch(heroSource, /products\.map\(\(\) => "front"\)/);
  assert.match(heroSource, /created\(slider\) \{/);
  assert.match(heroSource, /setIsReady\(true\);/);
  assert.match(heroSource, /\$\{styles\.carouselFrame\} \$\{isReady \? styles\.carouselReady : styles\.carouselLoading\}/);
  assert.match(heroSource, /\$\{showSlideFrame \? styles\.premiumSlideFrame : ""\}/);
  assert.match(heroSource, /carouselImageScale=\{renderContract\.visual\.railImageScale\.top\}/);
  assert.match(heroSource, /carouselImageScale=\{renderContract\.visual\.railImageScale\.bottom\}/);
  assert.doesNotMatch(heroSource, /carouselImageScaleY/);
  assert.match(heroSource, /layout=\{renderContract\.topCarousel\.layout\}/);
  assert.match(heroSource, /layout=\{renderContract\.bottomCarousel\.layout\}/);
  assert.doesNotMatch(heroSource, /const carouselLayout = getHeroPromoCarouselLayout\(products\.length\);/);
  assert.doesNotMatch(heroSource, /debugSlideFrame/);

  assert.match(cssSource, /\.carouselLoading \{[\s\S]*opacity: 0;/);
  assert.match(cssSource, /\.carouselReady \{[\s\S]*opacity: 1;/);
  assert.match(cssSource, /\.carouselReady \{[\s\S]*transition: opacity 0\.4s ease-out;/);
  assert.match(cssSource, /\.carouselFrame \{[\s\S]*gap: 0\.12rem;/);
  assert.match(cssSource, /\.premiumSlideFrame \{[\s\S]*border: 1px solid rgba\(255, 255, 255, 0\.28\);/);
  assert.match(cssSource, /\.premiumSlideFrame \{[\s\S]*overflow: hidden;/);
  assert.match(cssSource, /\.premiumSlideFrame \{[\s\S]*box-shadow: 0 0 0\.85rem rgba\(239, 199, 223, 0\.26\);/);
  assert.match(cssSource, /\.faceSwap \{[\s\S]*inset: 2%;/);
  assert.match(cssSource, /\.carouselImage \{[\s\S]*transform: scale\(var\(--hero-carousel-image-scale, 1\)\);/);
  assert.doesNotMatch(cssSource, /\.debugSlideFrame/);
});

test("hero headline splitting supports multiline and fallback single-line rendering", () => {
  assert.deepEqual(splitHeroPromoHeadline("COMBINALOS<br/>COMO QUIERAS"), [
    "COMBINALOS",
    "COMO QUIERAS",
  ]);
  assert.deepEqual(splitHeroPromoHeadline("COMBINALOS COMO QUIERAS"), ["COMBINALOS COMO QUIERAS"]);
});
