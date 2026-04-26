# Design: Hero Promo Encargues

## Technical Approach

Introduce a server-driven promo hero in the homepage. The visual core implements a dual-cylinder Keen Slider setup (top and bottom rails) with reduced vertical separation so they read as a tighter, cohesive set. This composition is placed beside a redesigned, visually dominant left-side hero information panel. The left panel will feel heavily branded to TheWestRep (dark urban aesthetic, textured backgrounds or bold shapes) rather than a generic promo card, featuring a striking hierarchy: Brand -> Promo Name -> Details -> CTA. The CTA links to `/encargue?promo=combo-2da-30`.

To resolve the empty-curation drift, the production selector `getHeroPromoProducts` will strictly return empty/null when curation is missing, ensuring the homepage correctly falls back to the default hero. The preview/mock mode will be preserved by injecting mock assets purely at the component level.

## Architecture Decisions

### Decision: Left-Panel Visual Dominance & Branding
**Choice**: Increase prominence of the left info panel. Incorporate TheWestRep branding elements (e.g., brand typography, stark contrast, dark background treatments). Establish a strict copy hierarchy: Top eyebrow (Brand), Main heading (Promo), Subheading (Offer), and a high-contrast CTA.
**Alternatives considered**: Keeping the current narrow editorial panel.
**Rationale**: The hero is the first thing users see; it needs to make a strong brand statement and immediately communicate the offer clearly, avoiding the look of a generic ad.

### Decision: Dual-Cylinder Spacing & Coherence
**Choice**: Maintain the dual-cylinder Keen Slider direction but reduce the vertical gap between the top and bottom rails (e.g., via adjusted flex gap or overlapping margins) to form a tighter set.
**Alternatives considered**: A single 3D rotating wheel.
**Rationale**: Preserves the established dark urban aesthetic and dynamic movement of dual opposing rails, while improving the composition's tightness and visual balance alongside the dominant left panel. Quick to iterate on the existing implementation.

### Decision: Preview/Mock Mode vs Production Fallback
**Choice**: The selector `getHeroPromoProducts` will perform a strict empty check and return null/empty when curation is missing. Mock mode will be pushed up to the component layer (e.g., used only when explicitly requested).
**Alternatives considered**: Returning mock data from the selector when curation is empty.
**Rationale**: Prevents mock data from leaking into the production render path and strictly honors the requirement that an empty curation must trigger the default hero fallback.

## Data Flow

    [Homepage] ──(requests)──→ lib/catalog/selectors.ts (getHeroPromoProducts - STRICT empty check)
         │                              │
         └────────(reads)───────────────┴─ lib/curations/hero-promo-products.ts

    [User Clicks CTA] ──→ /encargue?promo=combo-2da-30
                               │
    [CatalogListingPage] ──(resolves)──→ resolvePromoPreset()
                               │
                               ├─→ Injects category IDs into CatalogProductFilters
                               └─→ Renders PromoBanner component

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `components/marketing/hero-promo.tsx` | Modify | Update layout: redesign left panel for brand dominance/hierarchy, reduce vertical gap between top/bottom Keen Slider cylinders. Support explicit `previewMode` prop for mock assets. |
| `lib/marketing/hero-promo-runtime.ts` | Modify | Update layout/render contracts to reflect the tighter dual-cylinder spacing and left-panel prominence. |
| `lib/catalog/selectors.ts` | Modify | Remove mock data injection from `getHeroPromoProducts`; return null/empty when curation is empty. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modify | Update layout assertions to expect the tighter dual-cylinder structure and dominant left panel. Assert empty curation yields fallback hero. |
| `tests/unit/lib/hero-promo-encargues.test.ts` | Modify | Assert `getHeroPromoProducts` returns empty (no mock data) on empty curation. |

## Interfaces / Contracts

```typescript
// lib/catalog/selectors.ts
export interface PromoPreset {
  id: 'combo-2da-30';
  categorySlugs: string[];
}

// components/marketing/hero-promo.tsx
export interface HeroPromoProps {
  products: HeroPromoProduct[];
  previewMode?: boolean; // explicitly enables mock assets when products are empty
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getHeroPromoProducts` | MUST test the empty-curation path to ensure it returns empty/null and does not return mock data. |
| Unit | `hero-promo-runtime.ts` | Update tests to assert the dual-cylinder tight layout configuration. |
| Integration| `Homepage` rendering | Ensure default fallback hero renders if `getHeroPromoProducts` returns empty. |

## Migration / Rollout

No data migration required. Feature is toggled by the presence of products in `hero-promo-products.ts`. If empty, defaults to the existing hero. The UI will use the visual fallback/mock asset mode ONLY when explicitly rendered with `previewMode=true`.

## Open Questions

- None.