## Exploration: refresh-homepage-hero

### Current State
`HeroPromo` already owns the full homepage promo hero: desktop is a two-column grid with left copy and right dual cylindrical carousels, while mobile collapses to a single-column stack (`components/marketing/hero-promo.tsx`, `components/marketing/hero-promo.module.css`). All hero copy, CTA labels/URLs, layout ratios, and carousel geometry come from `buildHeroPromoRenderContract()` / `getHeroPromoCarouselLayout()` in `lib/marketing/hero-promo-runtime.ts`, so the component is already wired around a centralized UI contract.

The current visual tension comes from two places: the left side still reads like a bordered promo card (`.infoPanel` background/border/shadow), and the right side reads more like floating product cutouts than unmistakable “carousel” modules. The shader background is isolated in `HeroPromoShaderBackground`, mounted as a background-only layer, and already includes its own internal vignette/radial overlay. Because the requirement is to keep that shader EXACTLY as-is line-by-line, any extra darkening must happen outside that file.

### Affected Areas
- `components/marketing/hero-promo.tsx` — primary composition changes: new headline hierarchy, desktop/mobile arrangement, extra darkening layer outside the shader component, and clearer carousel framing/hints.
- `components/marketing/hero-promo.module.css` — primary styling changes: remove the heavy card feel, add new overlay/surface layers, establish stronger desktop hierarchy, and define a different mobile composition.
- `lib/marketing/hero-promo-runtime.ts` — update render-contract copy (`COMBINALOS COMO QUIERAS`, CTA labels casing/text), layout metadata, and any new semantic labels needed for carousel headings/hints without scattering strings in the component.
- `components/marketing/hero-promo-shader-background.tsx` — DO NOT modify; treat as a preserved dependency boundary.
- `tests/unit/hero-promo-ui-contract.test.ts` — will need updates during implementation because current contract assertions lock the existing headline, rules, CTA text, and layout metadata.

### Approaches
1. **Contract-led visual refresh on the existing structure** — Keep the current hero architecture, dual carousels, and shader wrapper intact; refresh copy, hierarchy, overlay layering, and carousel presentation through `hero-promo.tsx` + CSS + runtime contract.
   - Pros: smallest safe surface area, preserves tested carousel mechanics, respects the “keep shader exactly as-is” constraint, and limits performance risk to mostly CSS.
   - Cons: mobile composition must be carefully restaged inside the existing component so it does not feel like a desktop layout merely stacked vertically.
   - Effort: Medium

2. **Split desktop/mobile hero sublayouts inside the same feature** — Keep the same runtime and background, but render separate desktop and mobile content blocks to allow a more aggressive mobile-first message composition.
   - Pros: best control over impact on mobile, easiest way to make mobile feel intentionally different.
   - Cons: duplicates some markup/copy wiring, increases maintenance, and raises the chance of contract drift between breakpoints.
   - Effort: Medium/High

### Recommendation
Recommend **Approach 1** with a light-touch breakpoint-specific composition change inside the existing `HeroPromo` component.

Concrete implementation direction:
- **Desktop**: preserve the left-text / right-visual split, but turn the left side from a boxed card into a transparent editorial stack sitting on top of the darkened background. Lead with a compact brand/promo kicker, then a dominant multi-line `COMBINALOS COMO QUIERAS` headline, then the promo proof (`30% OFF EN LA 2DA UNIDAD`) and rule/disclosure as tighter supporting rows. Keep CTAs directly under the headline block. On the right, keep both carousels but wrap them in a more intentional stage: labels per rail, subtle edge fades, stronger spacing/scale, and a small drag/carousel cue so they read as interactive carousels instead of ambient decoration.
- **Mobile**: reorder for impact, not for desktop parity. Put the headline first, CTA block immediately after, compress legal/supporting copy, and place the dual carousels as a single visual mass underneath with tighter vertical overlap and simpler chrome. Avoid the bordered info panel entirely on mobile; use full-bleed text plus chips/badges so the first impression is message-first.
- **Darkening the shader safely**: add one extra overlay layer in `hero-promo.tsx` or a pseudo-element on `.heroFrame` above `<HeroPromoShaderBackground />` and below content. Use static CSS gradients/rgba only. Do not touch `components/marketing/hero-promo-shader-background.tsx`, its prop values, or its internal overlay line.

### Risks
- **Shader preservation risk**: editing `hero-promo-shader-background.tsx` would violate the explicit requirement and could also break the existing contract test around that wrapper.
- **Mobile readability risk**: if the same desktop hierarchy is merely stacked, the hero will stay visually heavy and miss the requested message impact.
- **Carousel clarity risk**: making the carousels feel “bigger” only by increasing dimensions may hurt viewport fit without actually improving perceived affordance; they need framing/hints, not just size.
- **Contract drift risk**: current unit tests assert the existing runtime copy/layout, so implementation must update tests together with the runtime contract.
- **Performance risk on mid-range phones**: extra blur, multiple translucent cards, or additional animated layers on top of the shader would be the wrong move; keep the delta CSS-only and mostly static.

### Ready for Proposal
Yes — enough is clear to move into proposal/spec work. The proposal should lock three decisions explicitly: (1) whether new desktop/mobile labels/hints live in the runtime contract, (2) how much carousel enlargement is acceptable before the hero loses first-screen balance, and (3) the exact darkening strategy as an external overlay so the shader file remains untouched.
