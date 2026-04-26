# Tasks: Refresh Homepage Hero

## Phase 1: Contract & Configuration (Foundation)

- [x] 1.1 Update runtime headline from "30% OFF en la segunda unidad" to "COMBINALOS COMO QUIERAS" in `lib/marketing/hero-promo-runtime.ts`
- [x] 1.2 Update runtime rules from promo copy to "30% OFF EN LA 2DA UNIDAD" in `lib/marketing/hero-promo-runtime.ts`
- [x] 1.3 Update CTA label from "Armá tu combo" to "ARMA TU COMBO" in `lib/marketing/hero-promo-runtime.ts`
- [x] 1.4 Update promoLabel to "COMBINALOS COMO QUIERAS" and move current promoLabel to headline in `lib/marketing/hero-promo-runtime.ts`
- [x] 1.5 Update carousel dimensions: sceneHeightPx 360→420, cellWidthPx 260→300, cellHeightPx 220→280 in `getHeroPromoCarouselLayout`
- [x] 1.6 Update visual.hierarchy from ["brand", "promo", "subheading", "cta"] to ["brand", "promo", "headline", "proof", "cta"] in `lib/marketing/hero-promo-runtime.ts`
- [x] 1.7 Update layout.desktop.infoPanelWidthRatio from 0.62 to 0.55 in `lib/marketing/hero-promo-runtime.ts`

## Phase 2: CSS Visual Changes (Styling)

- [x] 2.1 Add `.darkeningOverlay` class with rgba gradient in `hero-promo.module.css`
- [x] 2.2 Add `.textContent` class for transparent floating text container in `hero-promo.module.css`
- [x] 2.3 Add `.carouselFrame` class for carousel wrapping with labels in `hero-promo.module.css`
- [x] 2.4 Add `.edgeFade` class for carousel edge visual cues in `hero-promo.module.css`
- [x] 2.5 Remove `.infoPanel` background gradients, borders, and box-shadow in `hero-promo.module.css`
- [x] 2.6 Remove `.infoPanel::before` vertical accent in `hero-promo.module.css`
- [x] 2.7 Update `.heroFrame` darkening gradient to increase contrast in `hero-promo.module.css`

## Phase 3: Component Markup (Implementation)

- [x] 3.1 Add darkening overlay div after `.heroFrame` open tag in `hero-promo.tsx`
- [x] 3.2 Replace `.infoPanel` container with `.textContent` in `hero-promo.tsx`
- [x] 3.3 Center headline with text-center and increased font-size in `hero-promo.tsx`
- [x] 3.4 Add carousel framing wrappers with labels in `hero-promo.tsx`
- [x] 3.5 Reorder mobile content: headline → CTA → supporting copy → carousels using CSS order in `hero-promo.tsx`
- [x] 3.6 Update desktop infoPanelWidthRatio to use 0.55fr in grid style in `hero-promo.tsx`

## Phase 4: Unit Tests

- [x] 4.1 Update assertion for headline "COMBINALOS COMO QUIERAS" in `tests/unit/hero-promo-ui-contract.test.ts`
- [x] 4.2 Update assertion for rules "30% OFF EN LA 2DA UNIDAD" in `tests/unit/hero-promo-ui-contract.test.ts`
- [x] 4.3 Update assertion for CTA label "ARMA TU COMBO" in `tests/unit/hero-promo-ui-contract.test.ts`
- [x] 4.4 Update assertion for carousel dimensions (420, 300, 280) in `tests/unit/hero-promo-ui-contract.test.ts`
- [x] 4.5 Verify tests pass: `npm test -- tests/unit/hero-promo-ui-contract.test.ts`

## Phase 5: Verification

- [x] 5.1 Verify shader background file unchanged: `components/marketing/hero-promo-shader-background.tsx`
- [ ] 5.2 Run dev server and visually verify hero layout on desktop breakpoint
- [ ] 5.3 Run dev server and visually verify hero layout on mobile breakpoint
- [ ] 5.4 Verify carousel drag interaction smooth on desktop
- [ ] 5.5 No console errors on hero mount

## Refinement Batches

- [x] R1 (2026-04-22) Fade-to-page continuation + shorter hero + debug slide frame + tighter carousel visual packing
- [x] R2 (2026-04-22) Aggressive hero-height reduction + near-zero rail spacing + max slide image occupancy tuning
- [x] R3 (2026-04-23) Shorter first-screen hero + wider inter-slide spacing + slightly smaller slides while preserving fade-to-page blend
- [x] R4 (2026-04-25) Indexed per-cell carousel asset mapping (`01..06`) for top/bottom front/back rails
- [x] R5 (2026-04-25) Migrate hero carousel face assets from local `/public` paths to R2 public URLs via shared resolver with `thewestrep-catalog/imports/hero-promo-encargues` keys
- [x] R6 (2026-04-25) Correct hero carousel R2 asset keys to `imports/hero-promo-encargues/*` (remove duplicated `thewestrep-catalog/` prefix)
- [x] R7 (2026-04-25) Replace temporary debug slide frame with premium outer frame and add Keen `created`-driven hidden-until-ready fade-in
- [x] R8 (2026-04-25) Polish batch: stronger premium frame glow, tighter dual-rail vertical spacing, tighter header-to-scene spacing, and text panel shifted toward center
- [x] R9 (2026-04-25) Balance outfit rails: reduce top-rail perceived size, enlarge slide/frame contract to avoid border overflow, and remove scene-height structural limiter so rails can appear nearly attached
- [x] R10 (2026-04-25) Add per-rail vertical image scaling metadata so bottom rail reads taller while top rail stays visually compact
- [x] R11 (2026-04-25) Increase bottom-rail vertical stretch (`railImageScaleY.bottom`) to 1.3 while keeping top rail controlled at 0.94
- [x] R12 (2026-04-26) Increase bottom rail real frame/slide height via per-rail layout dimensions (`scene/cell height`) and wire component to consume contract-provided rail layouts
- [x] R13 (2026-04-26) Remove axis-specific Y stretch and use uniform per-rail image scaling so pants keep original aspect ratio while bottom real frame remains taller
- [x] R14 (2026-04-26) Fix same-page homepage anchor scrolling by replacing `scrollIntoView(block:start)` with sticky-header-aware top-offset scrolling (`window.scrollTo`) plus pure offset helper tests
