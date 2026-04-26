# Design: Refresh Homepage Hero

## Technical Approach

Use a contract-led refresh to update the `HeroPromo` messaging, remove the boxed visual style, enlarge carousels, and ensure a message-first mobile layout, all while preserving the existing animated shader background (`HeroPromoShaderBackground`). Changes are localized to the hero UI and contract definition.

Additionally, this design defines a production-ready outer slide frame treatment that looks premium, and a no-flash initialization strategy for the carousel to prevent brief flashes of stacked/collapsed cells on first load.

## Architecture Decisions

### Decision: External Shader Darkening
**Choice**: Apply darkening via a static CSS-based full-width overlay placed over the shader component within `.heroFrame` (or adjusting the `.heroFrame` gradient), completely outside `HeroPromoShaderBackground`.
**Alternatives considered**: Passing a prop to `HeroPromoShaderBackground` to darken the canvas gradient.
**Rationale**: The proposal explicitly limits touching the shader internally to avoid performance regressions or breaking the standalone component. An external overlay is safe and computationally cheap.

### Decision: Removing the Card Metaphor
**Choice**: Delete the inner gradients, borders, and shadows from `.infoPanel` in CSS, letting text float directly over the darkened background.
**Alternatives considered**: Simplifying the card to a solid translucent color.
**Rationale**: Floating text over the darkened shader feels more direct and modern, satisfying the design goal without a heavy surface.

### Decision: Carousel Enlargement
**Choice**: Update `getHeroPromoCarouselLayout` in `hero-promo-runtime.ts` to increase `sceneHeightPx`, `cellWidthPx`, and `cellHeightPx` for a larger footprint. Add explicit visual framing and labels via CSS and React markup.
**Alternatives considered**: Keeping the current dimensions and just zooming the container via CSS `transform: scale()`.
**Rationale**: Adjusting the contract directly scales the mathematical model of the 3D cylinder, ensuring the 3D effect calculates correctly with larger images.

### Decision: Production Slide Frame Treatment
**Choice**: Replace the debug frame with a "subtle rail card outline" via CSS class `.premiumSlideFrame` (`border: 1px solid rgba(255,255,255,0.15); border-radius: 1rem;`) applied to the `.slideCard` anchor tags, without any background or inner shadow. Rename the contract variable `debugSlideFrame` to `showSlideFrame: true`.
**Alternatives considered**:
1. Soft glow stroke: `box-shadow` or blurry strokes. Rejected for feeling outdated/blurry.
2. Ring frame / Solid background card: Adding `background: rgba(...)` with blur. Rejected because it violates the "Removing the Card Metaphor" decision made earlier. We explicitly want the slides to float.
3. Capsule frame: Rejected as the cutout assets already dictate a roughly square bounding box; forcing a capsule might clip images or feel out of place.
**Rationale**: A subtle semi-transparent white stroke clearly marks the slide boundary and adds a premium feel ("intentional framing") while maintaining the lightweight floating cutout aesthetic.

### Decision: No-Flash Initialization Strategy
**Choice**: `hidden-until-ready + fade-in` using a React JS ready-state. Introduce a `const [isReady, setIsReady] = useState(false)` to `HeroPromoCarousel`. Update it to `true` in the `created` callback of `useKeenSlider`. Apply `opacity: 0` to `.carouselFrame` when `!isReady`, and `opacity: 1; transition: opacity 0.4s ease-out;` when `isReady`.
**Alternatives considered**:
1. CSS-only mitigation: E.g., defaulting `opacity: 0` and toggling a class on `.carousel`. Rejected because the CSS transform pipeline applies `opacity` inline per-cell, which could conflict or require brittle `!important` flags.
2. Skeleton/placeholder shell: Rendering an empty layout first. Rejected because it's too complex and unnecessary for a fast-mounting component that only needs ~50ms to calculate transforms.
**Rationale**: The JS ready-state combined with a top-level container fade-in provides a deterministic guarantee that the DOM will never flash a collapsed stack of elements. The fade-in creates a smooth entry for the 3D carousel, keeping performance acceptable on mid-range phones without adding heavy DOM mutations.

## Data Flow

    HeroPromo ──→ [buildHeroPromoRenderContract] (Returns larger layout and updated copy/frame hints)
        │
        ├──→ [HeroPromoShaderBackground] (Untouched)
        ├──→ [External CSS Darkening Layer]
        └──→ [HeroPromoCarousel] (Initializes hidden ──→ useKeenSlider created() ──→ isReady=true ──→ Fades in)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `components/marketing/hero-promo.tsx` | Modify | Reorder markup for mobile; add `isReady` state to `HeroPromoCarousel` and conditional `.carouselReady` / `.carouselLoading` classes; use `showSlideFrame` prop. |
| `components/marketing/hero-promo.module.css` | Modify | Strip `.infoPanel` backgrounds; add static darkening overlay; replace `.debugSlideFrame` with `.premiumSlideFrame`; add `.carouselLoading` and `.carouselReady` states. |
| `lib/marketing/hero-promo-runtime.ts` | Modify | Update headline to `COMBINALOS COMO QUIERAS`; increase carousel dimensions; rename `debugSlideFrame` to `showSlideFrame: true`. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modify | Update static string and layout assertions to match the new contract output (`showSlideFrame`). |

## Interfaces / Contracts

```typescript
// Updated variable in visual contract
visual: {
  // renamed from debugSlideFrame
  showSlideFrame: true,
  // ...
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Runtime contract strings & layout | Update `hero-promo-ui-contract.test.ts` to assert the new headline, scaled dimensions, and `showSlideFrame`. |

## Migration / Rollout

No migration required. This is a localized UI and static layout contract update.

## Open Questions

- None
