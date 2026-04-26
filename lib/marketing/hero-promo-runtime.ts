import { getProductImageUrlForContext } from "@/lib/media/product-images";

export const HERO_PROMO_ID = "combo-2da-30" as const;

export interface HeroPromoCarouselSnapshot {
  canSlide: boolean;
  drag: boolean;
  renderMode: "custom";
  mode: "free-snap";
  selector: ".hero-promo-carousel-cell";
  scene: {
    widthPx: number;
    heightPx: number;
  };
  slides: {
    origin: "center";
    perView: 1;
    spacing: 0;
  };
  cylinder: {
    cellCount: number;
    thetaDeg: number;
    radiusPx: number;
    perspectivePx: number;
    cellWidthPx: number;
    cellHeightPx: number;
    cellGapPx: number;
    getContainerTransform: (progress: number, scale?: number) => string;
    getCellTransform: (index: number, scale?: number) => string;
    getCellVisualState: (index: number, progress: number) => {
      scale: number;
      opacity: number;
      zIndex: number;
    };
    getCellHemisphere: (index: number, progress: number) => "front" | "rear";
  };
}

interface HeroPromoFaceAsset {
  front: string;
  back: string;
}

interface HeroPromoLayoutPlacement {
  infoPanelPosition: "side" | "top";
  frameMode: "framed";
  infoPanelWidthRatio: number;
  carouselMaxWidthPx: number;
}

export interface HomepageHeroAvailability {
  isEnabled: boolean;
  topRowCount: number;
  bottomRowCount: number;
}

export interface HeroPromoRenderContract {
  heroLabel: string;
  promoLabel: string;
  headline: string;
  rules: string;
  disclosure: string;
  legal: string;
  cta: {
    label: string;
    href: string;
    ariaLabel: string;
    tracking: {
      track: string;
      promo: string;
    };
  };
  secondaryCta: {
    label: string;
    href: string;
    tracking: {
      track: string;
      promo: string;
    };
  };
  visual: {
    cellTreatment: "floating-cutout";
    hideCardSurfaces: true;
    carouselStackGapPx: number;
    panelTone: "dark-urban";
    panelBranding: "thewestrep";
    hierarchy: ["brand", "promo", "headline", "proof", "cta"];
    heroSurface: "transparent-editorial";
    carouselSetAlignment: "centered";
    textTreatment: "transparent-editorial";
    headlineAlign: "left";
  continuationCue: {
    showBottomFade: boolean;
    fadeToBackgroundColor: string;
  };
    textInsetInlineStartPx: {
      desktop: number;
      mobile: number;
    };
    showSlideFrame: true;
    railImageScale: {
      top: number;
      bottom: number;
    };
    carouselHints: {
      showLabels: true;
      showEdgeFades: boolean;
      showDragCue: true;
    };
    mobileOrder: ["brand", "promo", "headline", "cta", "proof", "disclosure", "legal", "carousels"];
  };
  topCarousel: {
    ariaLabel: string;
    label: string;
    dragCue: string;
    productCount: number;
    faceAssets: HeroPromoFaceAsset[];
    layout: HeroPromoCarouselSnapshot;
  };
  bottomCarousel: {
    ariaLabel: string;
    label: string;
    dragCue: string;
    productCount: number;
    faceAssets: HeroPromoFaceAsset[];
    layout: HeroPromoCarouselSnapshot;
  };
    layout: {
      viewport: {
        screenHeight: "first-screen-minus-header";
        heightVh: number;
        publicHeaderOffsetPx: number;
      };
    desktop: HeroPromoLayoutPlacement;
    tablet: HeroPromoLayoutPlacement;
    mobile: HeroPromoLayoutPlacement;
  };
}

const CONTINUOUS_RAIL_PIXELS_PER_SECOND = 30;
const HERO_PROMO_R2_ASSET_PREFIX = "imports/hero-promo-encargues";

function resolveHeroPromoFaceAssetUrl(assetKey: string) {
  return getProductImageUrlForContext(
    {
      src: `r2://${assetKey}`,
      assetKey,
    },
    "detail",
  );
}

export function getHeroPromoRailAutoplaySpeed() {
  return CONTINUOUS_RAIL_PIXELS_PER_SECOND;
}

export function buildHeroPromoCtaHref(promoId: string = HERO_PROMO_ID) {
  return `/encargue?promo=${promoId}`;
}

export function buildHeroPromoProductHref(slug: string) {
  return `/producto/${slug}`;
}

export function splitHeroPromoHeadline(headline: string) {
  const parts = headline
    .split(/<br\s*\/?\s*>/i)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (parts.length === 0) {
    return [headline];
  }

  return parts;
}

export function getHeroPromoInitialCellHemispheres(
  layout: HeroPromoCarouselSnapshot,
  progress: number = 0,
): Array<"front" | "rear"> {
  return Array.from({ length: layout.cylinder.cellCount }, (_, index) => layout.cylinder.getCellHemisphere(index, progress));
}

export function resolveHomepageHeroVariant(availability: HomepageHeroAvailability) {
  if (!availability.isEnabled) {
    return "default" as const;
  }

  if (availability.topRowCount <= 0 || availability.bottomRowCount <= 0) {
    return "default" as const;
  }

  return "promo" as const;
}

export function getHeroPromoCarouselLayout(
  productCount: number,
  rail: "top" | "bottom" = "top",
): HeroPromoCarouselSnapshot {
  const normalizedCount = Math.max(productCount, 0);
  const cellCount = Math.max(normalizedCount, 1);
  const thetaDeg = 360 / cellCount;
  const sceneWidthPx = 1480;
  const sceneHeightPx = rail === "bottom" ? 432 : 324;
  const cellWidthPx = 292;
  const cellHeightPx = rail === "bottom" ? 344 : 276;
  const cellGapPx = 72;
  const effectiveCellWidthPx = cellWidthPx + cellGapPx;
  const radiusPx = Math.max(1, Math.round((effectiveCellWidthPx / 2) / Math.tan(Math.PI / cellCount)));
  const rounded = (value: number) => Math.round(value * 1000) / 1000;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const toScaledRadius = (scale: number) => Math.max(1, Math.round(radiusPx * scale));

  return {
    canSlide: normalizedCount > 1,
    drag: normalizedCount > 1,
    renderMode: "custom",
    mode: "free-snap",
    selector: ".hero-promo-carousel-cell",
    scene: {
      widthPx: sceneWidthPx,
      heightPx: sceneHeightPx,
    },
    slides: {
      origin: "center",
      perView: 1,
      spacing: 0,
    },
    cylinder: {
      cellCount,
      thetaDeg,
      radiusPx,
      perspectivePx: 980,
      cellWidthPx,
      cellHeightPx,
      cellGapPx,
      getContainerTransform(progress: number, scale: number = 1) {
        const rotationDeg = rounded(360 * progress);
        const correctedRotationDeg = rotationDeg === 0 ? 0 : -rotationDeg;
        const scaledRadiusPx = toScaledRadius(scale);
        return `translateZ(-${scaledRadiusPx}px) rotateY(${correctedRotationDeg}deg)`;
      },
      getCellTransform(index: number, scale: number = 1) {
        const angle = rounded(thetaDeg * index);
        const scaledRadiusPx = toScaledRadius(scale);
        return `rotateY(${angle}deg) translateZ(${scaledRadiusPx}px)`;
      },
      getCellVisualState(index: number, progress: number) {
        const current = (index * thetaDeg - progress * 360) % 360;
        const normalized = current < 0 ? current + 360 : current;
        const distanceToFront = Math.min(normalized, 360 - normalized);
        const depthRatio = clamp(distanceToFront / 180, 0, 1);

        return {
          scale: 1,
          opacity: 1,
          zIndex: Math.floor(clamp(2 - depthRatio * 1.1, 1, 2)),
        };
      },
      getCellHemisphere(index: number, progress: number) {
        const current = (index * thetaDeg - progress * 360) % 360;
        const normalized = current < 0 ? current + 360 : current;
        const isRearHemisphere = normalized >= 75 && normalized <= 285;

        return isRearHemisphere ? "rear" : "front";
      },
    },
  };
}

export function buildHeroPromoRenderContract({
  topRowCount,
  bottomRowCount,
  promoId = HERO_PROMO_ID,
}: {
  topRowCount: number;
  bottomRowCount: number;
  promoId?: string;
}): HeroPromoRenderContract {
  const buildCarouselFaceAssets = (rail: "top" | "bottom"): HeroPromoFaceAsset[] =>
    Array.from({ length: 6 }, (_, index) => {
      const slot = `${index + 1}`.padStart(2, "0");
      const frontAssetKey = `${HERO_PROMO_R2_ASSET_PREFIX}/${rail}/front/${rail}-${slot}-front.png`;
      const backAssetKey = `${HERO_PROMO_R2_ASSET_PREFIX}/${rail}/back/${rail}-${slot}-back.png`;

      return {
        front: resolveHeroPromoFaceAssetUrl(frontAssetKey),
        back: resolveHeroPromoFaceAssetUrl(backAssetKey),
      };
    });

  return {
    heroLabel: "THE WEST REP",
    promoLabel: "COMBINALOS COMO QUIERAS",
    headline: "COMBINALOS<br/>COMO QUIERAS",
    rules: "30% OFF EN LA 2DA UNIDAD",
    disclosure: "Descuento sobre la prenda más barata",
    legal: "Promo por tiempo limitado.",
    cta: {
      label: "ARMA TU COMBO",
      href: buildHeroPromoCtaHref(promoId),
      ariaLabel: "Armá tu combo en encargues",
      tracking: {
        track: "hero-cta",
        promo: promoId,
      },
    },
    secondaryCta: {
      label: "VER CATALOGO COMPLETO",
      href: "/encargue",
      tracking: {
        track: "hero-secondary-cta",
        promo: promoId,
      },
    },
    visual: {
      cellTreatment: "floating-cutout",
      hideCardSurfaces: true,
      carouselStackGapPx: -168,
      panelTone: "dark-urban",
      panelBranding: "thewestrep",
      hierarchy: ["brand", "promo", "headline", "proof", "cta"],
      heroSurface: "transparent-editorial",
      carouselSetAlignment: "centered",
      textTreatment: "transparent-editorial",
      headlineAlign: "left",
      continuationCue: {
        showBottomFade: false,
        fadeToBackgroundColor: "rgba(8, 10, 18, 0.5)",
      },
      textInsetInlineStartPx: {
        desktop: 108,
        mobile: 24,
      },
      showSlideFrame: true,
      railImageScale: {
        top: 0.94,
        bottom: 1.08,
      },
      carouselHints: {
        showLabels: true,
        showEdgeFades: false,
        showDragCue: true,
      },
      mobileOrder: ["brand", "promo", "headline", "cta", "proof", "disclosure", "legal", "carousels"],
    },
    topCarousel: {
      ariaLabel: "Carrusel superior de buzos y camperas",
      label: "BUZOS & CAMPERAS",
      dragCue: "ARRASTRÁ",
      productCount: Math.min(topRowCount, 6),
      faceAssets: buildCarouselFaceAssets("top"),
      layout: getHeroPromoCarouselLayout(Math.min(topRowCount, 6), "top"),
    },
    bottomCarousel: {
      ariaLabel: "Carrusel inferior de pantalones",
      label: "PANTALONES",
      dragCue: "ARRASTRÁ",
      productCount: Math.min(bottomRowCount, 6),
      faceAssets: buildCarouselFaceAssets("bottom"),
      layout: getHeroPromoCarouselLayout(Math.min(bottomRowCount, 6), "bottom"),
    },
    layout: {
      viewport: {
        screenHeight: "first-screen-minus-header",
        heightVh: 58,
        publicHeaderOffsetPx: 92,
      },
      desktop: {
        infoPanelPosition: "side",
        frameMode: "framed",
        infoPanelWidthRatio: 0.55,
        carouselMaxWidthPx: 1600,
      },
      tablet: {
        infoPanelPosition: "top",
        frameMode: "framed",
        infoPanelWidthRatio: 1,
        carouselMaxWidthPx: 1480,
      },
      mobile: {
        infoPanelPosition: "top",
        frameMode: "framed",
        infoPanelWidthRatio: 1,
        carouselMaxWidthPx: 1480,
      },
    },
  };
}
