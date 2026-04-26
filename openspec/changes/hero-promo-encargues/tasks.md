# Tasks: Hero Promo Encargues

## Phase 1: Foundation — Models & Config (Dependencies)

- [x] 1.1 Add `categoryIds?: string[]` to `CatalogProductFilters` in `lib/catalog/models.ts`
- [x] 1.2 Create `lib/curations/hero-promo-products.ts` with static `heroPromoProducts` config (6 top slugs, 6 bottom slugs)
- [x] 1.3 Define `PromoPreset` interface in `lib/catalog/selectors.ts`

## Phase 2: Core Logic — Preset Resolution & Multi-Category

- [x] 2.1 Implement `resolvePromoPreset(promoId: string)` in `lib/catalog/selectors.ts` returning preset or null
- [x] 2.2 Implement `getHeroPromoProducts()` in `lib/catalog/selectors.ts` reading from curation config
- [x] 2.3 Update `getCatalogProducts` to support filtering by multiple `categoryIds` (array OR logic)
- [x] 2.4 Align `lib/pricing/encargue-combos-core.ts` with "30% off cheapest" rule

## Phase 3: UI Components — Hero & Banner

- [x] 3.1 Create `components/marketing/hero-promo.tsx` with 2 Keen Slider rows, CTA, promo copy hierarchy
- [x] 3.2 Add analytics attributes: `data-track="hero-cta"` `data-promo="combo-2da-30"` to CTA button
- [x] 3.3 Add `data-track="hero-product"` to each product card
- [x] 3.4 Create `components/catalog/promo-banner.tsx` with title, rules, disclosure, dismiss button
- [x] 3.5 Ensure fallback: render standard hero if curation config is empty

## Phase 4: Integration — Homepage & Encargue

- [x] 4.1 Modify `components/marketing/homepage.tsx` to conditionally render `HeroPromo` when curation has products
- [x] 4.2 Modify `app/encargue/page.tsx` to parse `?promo=combo-2da-30` and pass preset to catalog
- [x] 4.3 Modify `components/catalog/catalog-listing-page.tsx` to render `PromoBanner` when preset active
- [x] 4.4 Add ARIA labels and keyboard navigation for hero rows

## Phase 5: Testing — TDD

- [x] 5.1 RED: Write test for `resolvePromoPreset` with valid/invalid promo IDs
- [x] 5.2 GREEN: Implement `resolvePromoPreset` to make test pass
- [x] 5.3 RED: Write test for multi-category filter in `getCatalogProducts`
- [x] 5.4 GREEN: Implement multi-category filter logic
- [x] 5.5 Integration: Write test for homepage fallback when curation empty
- [x] 5.6 Integration: Write test for banner visibility on `/encargue?promo=combo-2da-30`
- [x] 5.7 Runtime contracts: Add page/render contract tests for scenarios 1, 2, 3, and 6

## Phase 6: Rollout & Fallback

- [x] 6.1 Verify hero fallback renders when `hero-promo-products.ts` is empty
- [x] 6.2 Verify mobile breakpoints show compact rows with horizontal scroll
- [ ] 6.3 Verify LCP impact < 500ms with Lighthouse (manual run pending; workspace substitute documented in apply-progress)
- [x] 6.4 Verify CTA navigates to `/encargue?promo=combo-2da-30` without category IDs in URL
- [x] 6.5 Document rollback steps: revert homepage, remove preset logic, hide banner

## Phase 7: Approved Visual/Layout Revisions (2026-04-21)

- [x] 7.1 Update hero composition to framed editorial layout with info panel beside carousels on desktop
- [x] 7.2 Apply light 3D Misc Carousel-style visual depth to both rails while keeping Keen slider
- [x] 7.3 Remove legacy legal phrase "Una compra por envío" from promo copy contract
- [x] 7.4 Preserve temporary visual fallback/mock asset mode compatibility after layout revision

## Phase 8: Keen Carousel Core + Production Fallback Fix (Delta)

- [x] 8.1 Replace dual fake-3D rails with a single Keen Slider `Misc > Carousel` composition as the hero visual core
- [x] 8.2 Ensure center-dominant slide with visible side slides and real depth cues aligned to the Keen pattern
- [x] 8.3 Keep the editorial side-panel beside the carousel composition on desktop and maintain responsive fallback
- [x] 8.4 Fix production empty-curation behavior so homepage falls back to default hero instead of mock promo rows
- [x] 8.5 Preserve preview/mock compatibility through explicit preview-only helper path (no production leakage)
- [x] 8.6 Add strict-TDD tests for carousel runtime contract and production-vs-preview fallback behavior

## Phase 9: Split Cylindrical Rails + Floating Cutouts (Delta)

- [x] 9.1 Remove card-like surfaces/borders/background blocks from carousel cells so products feel like floating cutouts
- [x] 9.2 Restore TWO cylindrical carousels (top: buzos/camperas, bottom: pantalones) while preserving Keen cylindrical mechanics
- [x] 9.3 Preserve editorial side-panel composition beside the carousels and keep preview/mock compatibility unchanged
- [x] 9.4 Update strict-TDD runtime contracts/tests for split-carousel scope and revised visual treatment

## Phase 10: Keen Geometry Parity Refinement (Visual Delta)

- [x] 10.1 Tune cylindrical scene/cell geometry to a fixed, readable profile closer to Keen Misc example proportions
- [x] 10.2 Increase perceived 3D depth by applying per-cell visual state (scale/opacity/z-index) from carousel progress
- [x] 10.3 Keep dual top/bottom cylindrical rails + editorial side-panel composition and preview/mock compatibility unchanged
- [x] 10.4 Update strict-TDD runtime contracts for geometry constants and depth-state behavior in this scope

## Phase 11: Keen Example Baseline Rebuild (Visual Delta)

- [x] 11.1 Rebuild hero carousel DOM to mirror Keen example structure: wrapper → scene → carousel → carousel cells
- [x] 11.2 Keep cylindrical mechanics faithful to Keen baseline (`renderMode: custom`, `mode: free-snap`, selector-based cells, `translateZ(-z) rotateY(...)` and `rotateY(angle) translateZ(z)`)
- [x] 11.3 Use local preview assets (`/campera.png`, `/pantalones.png`) for the base visual while preserving side-panel hero context
- [x] 11.4 Update strict-TDD runtime contracts/tests only for this baseline delta

## Phase 12: Smaller Cylinder + Always-Visible Side Depth (Visual Delta)

- [x] 12.1 Limit hero carousel visual set to 6 images total while preserving existing local preview assets
- [x] 12.2 Reduce cylinder scene/cell geometry so the carousel reads visually smaller within current hero frame
- [x] 12.3 Keep side/background carousel images visibly present across rotation to reinforce cylindrical depth perception
- [x] 12.4 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 13: Wider Spacing + Opaque/Stable Cells (Visual Delta)

- [x] 13.1 Make the carousel visually wider while preserving surrounding hero composition
- [x] 13.2 Increase visible spacing between carousel images/cells
- [x] 13.3 Remove size/emphasis resting effects so images do not scale by depth state
- [x] 13.4 Remove transparency depth effects so carousel images stay fully opaque
- [x] 13.5 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 14: Slightly Wider + Corrected Rotation Direction (Visual Delta)

- [x] 14.1 Increase carousel width slightly from the current baseline while preserving surrounding hero composition
- [x] 14.2 Correct carousel rotation direction so movement no longer appears backward
- [x] 14.3 Preserve existing spacing, opacity/no-scale depth behavior, local preview assets, and editorial layout
- [x] 14.4 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 15: Responsive Fit Without Overflow (Visual Delta)

- [x] 15.1 Make carousel scene/cells scale down progressively with available width so the composition never overflows the viewport
- [x] 15.2 Preserve wider desktop composition, current rotation direction, spacing intent, opaque/no-scale visual behavior, and local preview assets
- [x] 15.3 Keep existing hero framed/editorial layout and side-panel composition while applying responsive fit behavior
- [x] 15.4 Update strict-TDD runtime contracts/tests only for this revised responsive scope

## Phase 16: Larger Split Cylinders + Front/Back Faces (Visual Delta)

- [x] 16.1 Move top/bottom cylinders closer together vertically while preserving the two-cylinder structure
- [x] 16.2 Increase cylinder scene/cell size slightly in both width and height
- [x] 16.3 Add front/back two-face rendering so backside shows dedicated back artwork (not mirrored front)
- [x] 16.4 Wire desktop garment assets as face source set for top/bottom cylinders and keep 6 repetitions per cylinder
- [x] 16.5 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 17: Back-Face Correction + Manual Rotation (Visual Delta)

- [x] 17.1 Fix top/bottom garment rear-face rendering so dedicated back artwork is visible on rear hemisphere rotation
- [x] 17.2 Re-enable manual user drag/rotation for cylinders while keeping garment images non-draggable/non-selectable
- [x] 17.3 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 18: Hemisphere Source Swap (Visual Delta)

- [x] 18.1 Replace two-face backface rendering with hemisphere-based source swap (front hemisphere → front image, rear hemisphere → back image)
- [x] 18.2 Preserve current cylinder geometry, drag interaction, two-carousel structure, larger size, close spacing, and non-selectable/non-draggable images
- [x] 18.3 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 19: Branded Panel Dominance + Tighter Cylinder Set (Visual Delta)

- [x] 19.1 Reduce the top/bottom cylinder vertical gap so both rails read as a tighter visual set
- [x] 19.2 Redesign the left panel to be visually dominant and immediately noticeable in the hero frame
- [x] 19.3 Reinforce TheWestRep-specific branding and hierarchy (Brand → Promo → Subheading → CTA) while preserving dark urban coherence
- [x] 19.4 Update strict-TDD runtime contracts/tests only for this revised visual scope

## Phase 20: Full-Width Hero Impact + Centered Dual-Cylinder Set (Visual Delta)

- [x] 20.1 Expand hero composition to span edge-to-edge width with energetic dark/purple treatment
- [x] 20.2 Keep dual cylinders on the right and reduce vertical separation further while centering them as one set
- [x] 20.3 Increase left promo block dominance (layout ratio/hierarchy emphasis) while preserving current carousel mechanics/assets
- [x] 20.4 Update strict-TDD runtime contracts/tests only for this revised visual/layout scope

## Phase 21: Aurora Shell Extension Across Homepage (Visual Delta)

- [x] 21.1 Move/extend `AuroraBackground` ownership to homepage shell so effect reaches hero + subsequent sections
- [x] 21.2 Preserve existing hero promo/carousel mechanics and assets while keeping integration reversible
- [x] 21.3 Add/adjust homepage shell readability treatment so non-hero sections remain legible over aurora layer
- [x] 21.4 Add strict-TDD contract test for aurora shell placement/ownership (homepage shell owns aurora; hero no longer owns it)

## Phase 22: Builder-Parity Aurora Layering (Visual Delta)

- [x] 22.1 Update `AuroraBackground` to mirror the shared Background Builder stack (base gradient, conic/radial blobs, blur, opacity, blend treatment)
- [x] 22.2 Add literal grid + noise + vignette + saturation layers in aurora shell while keeping composition reversible
- [x] 22.3 Preserve homepage readability with minimal non-hero scrim treatment (avoid global washout)
- [x] 22.4 Add strict-TDD contracts for builder-style aurora layers and homepage readability guardrails

## Phase 23: Literal Builder Aurora Replacement (Visual Delta)

- [x] 23.1 Replace `components/ui/aurora-background.tsx` with a near-literal Background Builder profile while preserving only `children` + export shape adaptations
- [x] 23.2 Keep homepage shell integration untouched and keep hero promo/carousel mechanics/assets unchanged
- [x] 23.3 Update strict-TDD aurora contract tests for literal gradient/layer/opacity/blur/grid/noise/vignette/saturation values

## Phase 24: ShaderGradient Hero Background Layer (Visual Delta)

- [x] 24.1 Install ShaderGradient React dependencies (`@shadergradient/react`, `@react-three/fiber`, `three`, `three-stdlib`, `camera-controls`) and type support (`@types/three`)
- [x] 24.2 Create a lightweight, isolated hero ShaderGradient background wrapper with the exact provided ShaderGradient URL config
- [x] 24.3 Integrate ShaderGradient strictly as a background layer in `HeroPromo` while preserving existing cylinder/copy/layout logic
- [x] 24.4 Keep integration easy to revert by isolating changes to one new wrapper component + one hero composition insertion
- [x] 24.5 Add strict-TDD unit contract tests for dependency declaration, wrapper contract, and hero background-layer composition

## Phase 25: First-Screen Hero Height + Larger Cylinders (Visual Delta)

- [x] 25.1 Make hero occupy full first screen height excluding public nav/header area
- [x] 25.2 Increase dual-cylinder scene footprint so carousels take more visual space in hero
- [x] 25.3 Increase garment image read size within cylinder cells on desktop
- [x] 25.4 Preserve ShaderGradient background layer, front/rear hemisphere swap logic, drag interaction, and current image sources
- [x] 25.5 Update strict-TDD unit contracts for first-screen/layout geometry deltas only
