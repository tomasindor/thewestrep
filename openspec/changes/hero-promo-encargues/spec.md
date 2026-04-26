# Specification: Hero Promo Encargues

**Change ID:** `hero-promo-encargues`
**Status:** Approved
**Created:** 2026-04-20
**Last Updated:** 2026-04-21

---

## 1. Executive Summary

This specification defines a promotional hero section for the homepage centered on the "Encargues" (custom orders) category, featuring a **30% OFF on the second unit** promotion when combining **1 pantalón (pants) + 1 buzo/campera (sweatshirt/jacket)**, with the discount applied to the cheaper item. The hero uses a **framed/editorial composition** with the **Keen Slider Misc > Carousel pattern** featuring a dominant center slide with visible side slides and real depth cues, positioned beside a striking promo information block, creating a true hero experience. The CTA navigates to `/encargue` with a server-driven promo preset that activates the three required categories and displays an explanatory banner.

---

## 2. Requirements

### 2.1 Functional Requirements

#### FR-1: Promo Copy Hierarchy
The hero must display promotional messaging with the following hierarchy:

1. **Primary headline**: "30% OFF en la segunda unidad" (prominent, bold, hero-striking)
2. **Secondary disclosure**: "Aplica al combinar 1 pantalón + 1 buzo/campera" (medium weight)
3. **Tertiary disclosure**: "Descuento sobre la prenda más barata" (smaller, supporting)
4. **Legal footer**: "Promo por tiempo limitado." (minimal, legal size)

**Note**: The phrase "Una compra por envío" has been removed from the legal footer.

#### FR-2: CTA Behavior
- **Primary CTA text**: "Armá tu combo"
- **Destination**: `/encargue?promo=combo-2da-30`
- **Behavior**: Server-side preset activation, no client-side hacks
- **Tracking**: Click events must be measurable for KPI analysis

#### FR-3: Promo Preset on `/encargue`
The destination must support a semantic preset `combo-2da-30` that:
- Activates three categories internally: `pantalones`, `buzos`, `camperas`
- Does NOT expose raw category IDs in the URL
- Renders an explanatory banner (see FR-5)
- Allows users to dismantle the preset by applying additional filters

#### FR-4: Manually Curated Hero Products with Editorial Composition
The hero must display two compact animated carousels in a **framed/editorial composition**:
- **Top carousel**: 6 curated outerwear products (buzos + camperas mixed)
- **Bottom carousel**: 6 curated bottom products (pantalones only)
- **Layout**: Carousels do NOT span full width; they are contained within a framed editorial layout
- **Source**: Manual curation via configuration file (not automated)
- **Assets**: Cutout product images optimized for performance (webp/avif)
- **Preview mode**: Must support mock/fallback assets for previewing before Cloudflare assets arrive

#### FR-5: Promo Explainer Banner on Destination
When the promo preset is active, `/encargue` must display a banner with:
- **Title**: "30% OFF en la segunda unidad"
- **Rules**: "Combiná 1 pantalón + 1 buzo/campera"
- **Disclosure**: "Descuento sobre la prenda más barata"
- **Dismissal**: Optional dismiss button (does not deactivate preset)
- **Persistence**: Banner reappears on next visit if preset is reactivated

#### FR-6: Click Behavior
- **Individual products**: Clicking a product navigates to its PDP (`/producto/[slug]`)
- **Primary CTA**: Clicking "Armá tu combo" navigates to `/encargue?promo=combo-2da-30`
- **No quick-view**: No modal or overlay; direct navigation only

#### FR-7: Hero Promo Information Block Layout
The hero must feature a **true hero-striking promo information block** positioned **beside** the Keen Slider carousel pattern:
- **Position**: The promo info block is placed to the side of the carousel pattern (not above them)
- **Visual weight**: Must feel more striking and prominent than a standard banner/card
- **Composition**: Editorial-style framing that contains both the info block and the Keen Slider carousels
- **Content hierarchy**:
  - Primary headline dominates the info block
  - Secondary and tertiary disclosures support without overwhelming
  - Legal footer minimized but present
- **Desktop layout**: Info block on one side, Keen Slider carousels stacked on the other side
- **Tablet layout**: Info block may move above carousels while maintaining framed composition
- **Mobile layout**: Info block on top, carousels below (stacked vertically)

#### FR-8: Animation & Performance with Keen Slider Misc Carousel Pattern
- **Animation library**: **MUST use the actual Keen Slider `Misc > Carousel` interaction/composition pattern** — not a CSS-only approximation
- **Center-dominant composition**: The carousel must emphasize a **dominant center slide** with **visible side slides** on both sides
- **Real depth cues**: Must implement genuine depth effects aligned with the Keen Slider Misc Carousel example (scale transforms, z-index layering, opacity gradients for side slides)
- **CSS micro-motion**: Supplementary opacity, translate, scale, and transforms (no video, no canvas)
- **Mobile-safe**: Breakpoints must limit visual density on small screens
- **Performance budget**:
  - LCP impact < 500ms
  - Total hero bundle < 150KB (excluding images)
  - Images optimized via `SmartImage` with `object-contain`

### 2.2 Non-Functional Requirements

#### NFR-1: Server-Side Rendering
- Hero content must be server-rendered for SEO and initial load performance
- Preset resolution happens on the server, not client-side

#### NFR-2: Accessibility
- All interactive elements must have proper ARIA labels
- Keyboard navigation must work for both rows and CTA
- Color contrast must meet WCAG AA standards

#### NFR-3: Responsive Behavior with Editorial Layout
- Desktop: **Framed editorial composition** with promo info block beside two Keen Slider carousels (6 products each, center-dominant with side slides visible)
- Tablet: **Framed layout** with promo info block above or beside carousels, Keen Slider horizontal scroll with center emphasis
- Mobile: **Stacked layout** with promo info block on top, two compact Keen Slider carousels below, reduced padding

#### NFR-4: Content Constraints
- Exactly 6 products per row (12 total)
- Products must be manually curated (no auto-selection)
- Assets must be pre-processed cutouts (no background removal at runtime)

#### NFR-5: Empty Curation Fallback Behavior
- **Production empty-curation fallback**: When the curation config file is missing, empty, or contains fewer than the required products, the hero **MUST return the default hero** (standard homepage hero without promo display)
- **Preview/mock mode is NOT production fallback**: The mock/fallback asset mode is ONLY for previewing layout before Cloudflare assets arrive — it is NOT the production behavior for missing curation data
- **Graceful degradation**: If curation is incomplete but not empty, display only available products without breaking layout

---

## 3. Scenarios

### Scenario 1: User Views Homepage with Promo Hero
**Given** the user visits the homepage
**When** the hero promo is active
**Then** they see a **framed editorial composition** with promo info block beside two Keen Slider carousels (6 outerwear top, 6 pants bottom) with promo copy and CTA "Armá tu combo", featuring a dominant center slide with visible side slides and real depth cues

### Scenario 2: User Clicks CTA to Enter Promo Flow
**Given** the user clicks "Armá tu combo"
**When** they navigate to `/encargue?promo=combo-2da-30`
**Then** the page loads with the promo preset active, showing the explainer banner and filtered catalog

### Scenario 3: User Sees Promo Banner on Destination
**Given** the user is on `/encargue?promo=combo-2da-30`
**When** the promo preset is detected
**Then** a banner displays the promo rules: "30% OFF en la segunda unidad · Combiná 1 pantalón + 1 buzo/campera · Descuento sobre la prenda más barata"

### Scenario 4: User Clicks Individual Product
**Given** the user clicks a product in the hero
**When** the product card is clicked
**Then** they navigate directly to the PDP (`/producto/[slug]`)

### Scenario 5: User Dismantles Preset via Filters
**Given** the user is on `/encargue?promo=combo-2da-30`
**When** they apply an additional filter (e.g., brand, size)
**Then** the preset remains active but the banner may indicate filters have been applied

### Scenario 6: Mobile Experience
**Given** the user is on a mobile device
**When** they view the hero
**Then** they see the promo info block on top with two compact Keen Slider carousels below, reduced padding, with center-dominant slide composition

### Scenario 7: Missing Curated Products (Production Fallback)
**Given** the curation config file is missing, empty, or contains fewer than required products
**When** the hero attempts to render
**Then** it displays the **default hero** (standard homepage hero without promo display) — NOT the mock/fallback preview mode

### Scenario 8: Editorial Composition with Side Info Block
**Given** the user is on a desktop or tablet device
**When** they view the hero promo
**Then** the promo information block is positioned **beside** the Keen Slider carousel pattern (not above) in a framed editorial layout with dominant center slide and visible side slides

### Scenario 9: Keen Slider Misc Carousel Pattern
**Given** the user views the hero carousels
**When** the carousels animate or the user interacts with products
**Then** they see the **actual Keen Slider Misc > Carousel pattern** with:
- Dominant center slide (larger scale, full opacity)
- Visible side slides on both sides (smaller scale, reduced opacity)
- Real depth cues (z-index layering, perspective transforms, shadow gradients)
- Smooth transitions aligned with Keen Slider's example implementation

---

## 4. Technical Specifications

### 4.1 Preset Resolution Logic
```typescript
// lib/catalog/selectors.ts
interface PromoPreset {
  id: 'combo-2da-30' | string;
  categories: string[]; // ['pantalones', 'buzos', 'camperas']
  bannerProps: BannerConfig;
}

function resolvePromoPreset(searchParams: URLSearchParams): PromoPreset | null;
```

### 4.2 Curation Config Structure
```typescript
// lib/curations/hero-promo-products.ts
export const heroPromoProducts = {
  topRow: ['product-slug-1', 'product-slug-2', /* ... 6 total */],
  bottomRow: ['product-slug-7', 'product-slug-8', /* ... 6 total */],
};
```

### 4.3 Banner Component Contract
```typescript
interface PromoBannerProps {
  presetId: 'combo-2da-30';
  onDismiss?: () => void;
  className?: string;
}
```

### 4.4 Keen Slider Misc Carousel Configuration
```typescript
// components/marketing/hero-promo.tsx
import { useKeenSlider } from 'keen-slider'
import 'keen-slider/keen-slider.min.css'

// Misc Carousel pattern with center-dominant composition
const carouselOptions = {
  slides: {
    origin: 'center',
    perView: 3, // Shows center + partial side slides
    spacing: 16,
  },
  loop: true,
  breakpoints: {
    '(max-width: 640px)': {
      perView: 1.5, // Mobile: center + partial side
      spacing: 8,
    }
  }
}

// CSS depth cues (applied via className)
// - Center slide: scale(1), opacity(1), zIndex(2)
// - Side slides: scale(0.85), opacity(0.7), zIndex(1)
// - Perspective container for depth
```

### 4.5 URL Structure
- **Hero CTA**: `/encargue?promo=combo-2da-30`
- **Product click**: `/producto/[slug]`
- **No category IDs exposed**: URL uses semantic preset name only

### 4.6 Empty Curation Fallback Logic
```typescript
// lib/curations/hero-promo-products.ts
export function getHeroPromoProducts(): HeroPromoProducts | null {
  // If curation is missing, empty, or incomplete → return null
  // Caller must render default hero (not mock/preview mode)
  if (!heroPromoProducts || !heroPromoProducts.topRow?.length || !heroPromoProducts.bottomRow?.length) {
    return null
  }
  return heroPromoProducts
}
```

---

## 5. Non-Goals

### Explicitly Out of Scope
- ❌ Refactoring generic multi-category filters for the entire catalog
- ❌ Automated background removal pipeline for product images
- ❌ Real-time inventory checks for curated products
- ❌ Dynamic product selection based on availability or popularity
- ❌ Integration with existing `comboGroup` logic (this is an open promo, not pre-built looks)
- ❌ CSS-only carousel approximation (MUST use Keen Slider Misc Carousel pattern)

### Edge Cases Not Handled
- ❌ Products that become unavailable after curation (fallback to available set)
- ❌ Missing cutout assets (use standard product images)
- ❌ Category ID changes across environments (mitigated by semantic preset)

---

## 6. Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Hero displays 12 curated products | Visual inspection | ✅ 6 top + 6 bottom |
| CTA navigates to preset URL | Click tracking | ✅ `/encargue?promo=combo-2da-30` |
| Banner shows promo rules | Visual inspection | ✅ All 3 disclosure levels (no "Una compra por envío") |
| Animation is performant | Lighthouse LCP | ✅ < 500ms impact |
| Mobile experience works | Responsive test | ✅ Stacked layout with compact Keen Slider carousels |
| No category IDs in URL | Code review | ✅ Semantic preset only |
| Editorial composition | Visual inspection | ✅ Promo info block beside carousels (desktop) |
| Keen Slider Misc Carousel pattern | Code inspection + visual | ✅ Actual Keen pattern with center-dominant slide, visible side slides, real depth cues |
| Center-dominant composition | Visual inspection | ✅ Center slide larger, side slides visible with reduced scale/opacity |
| Production fallback behavior | Functional test | ✅ Empty curation → default hero (NOT mock/preview mode) |
| Mock asset compatibility | Functional test | ✅ Previews work with fallback assets (preview mode only) |

---

## 7. Dependencies

- ✅ Assets: 12 cutout product images (webp/avif format)
- ✅ Mock/fallback assets: Compatible preview mode for before Cloudflare assets arrive (NOT production fallback)
- ✅ Commercial validation: Final promo copy and legal disclosure (without "Una compra por envío")
- ✅ Existing stack: **Keen Slider (Misc Carousel pattern REQUIRED)**, `SmartImage`, `CatalogListingPage`
- ✅ Editorial composition: Framed layout design for hero section with side info block

---

## 8. Rollback Plan

If issues arise:

1. **Immediate**: Revert hero to previous version (remove promo hero component)
2. **Preset**: Remove `combo-2da-30` preset resolution logic
3. **Banner**: Hide promo banner without affecting catalog functionality
4. **Preserve**: Do not touch general catalog filtering or multi-category logic

---

## 9. Related Artifacts

- **Proposal**: `/openspec/changes/hero-promo-encargues/proposal.md`
- **Exploration**: `/openspec/changes/hero-promo-encargues/exploration.md`
- **Components**: `components/marketing/homepage.tsx`, `components/marketing/brands-slider.tsx`, `components/marketing/hero-promo.tsx`
- **Destination**: `app/encargue/page.tsx`, `components/catalog/catalog-listing-page.tsx`
- **Models**: `lib/catalog/models.ts`, `lib/catalog/selectors.ts`
- **Pricing**: `lib/pricing/encargue-combos-core.ts`
- **Curation**: `lib/curations/hero-promo-products.ts`
- **Runtime**: `lib/marketing/hero-promo-runtime.ts`

---

## 10. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-20 | SDD Spec Agent | Initial specification from approved proposal |
| 1.1 | 2026-04-21 | SDD Spec Agent | Updated with approved requirements: (1) Keen Slider Misc Carousel with light 3D feel, (2) promo info block as true hero beside carousels (not above), (3) framed/editorial composition (no full-width carousels), (4) removed "Una compra por envío" copy, (5) preserved mock/fallback asset compatibility |
| 1.2 | 2026-04-21 | SDD Spec Agent | **Delta update** making requirements explicit: (1) MUST use actual Keen Slider `Misc > Carousel` pattern (not CSS-only approximation), (2) center-dominant composition with visible side slides and real depth cues aligned with Keen example, (3) editorial side-panel composes beside carousel pattern, (4) production empty-curation fallback returns default hero (mock/preview mode is NOT production fallback) |

---
