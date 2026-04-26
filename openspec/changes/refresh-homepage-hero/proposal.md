# Proposal: Refresh Homepage Hero

## Intent

Refresh the homepage promo hero so it sells the combo harder and pushes users into the catalog without rebuilding the feature. The hero must feel direct, exclusive, and modern while preserving the current animated shader and dual-carousel foundation.

## Scope

### In Scope
- Replace hero messaging with a stronger commercial hierarchy led by `COMBINALOS COMO QUIERAS` and updated CTA copy.
- Remove the boxed text-card feel and add external darkening over the existing shader without editing the shader component.
- Make both carousels larger and more obviously carousel-like with framing, labels/cues, and breakpoint-tuned composition.
- Keep desktop split layout; introduce a message-first mobile composition that is intentionally different.
- Update runtime contract and locked unit tests for the revised copy/layout metadata.

### Out of Scope
- Rewriting carousel mechanics, shader internals, or product selection logic.
- New promo rules, catalog filters, analytics flows, or broader homepage redesign.

## Capabilities

### New Capabilities
- `homepage-hero-promo`: Defines homepage hero copy, CTA hierarchy, carousel presentation, overlay treatment, and responsive composition for the promo variant.

### Modified Capabilities
- None.

## Approach

Use a contract-led refresh on the existing `HeroPromo` structure. Update `hero-promo-runtime.ts` as the single source of truth for copy/labels/layout hints, restage `hero-promo.tsx` for stronger hierarchy and mobile-specific ordering, and restyle via CSS using static overlay layers only. Preserve `HeroPromoShaderBackground` unchanged.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `components/marketing/hero-promo.tsx` | Modified | Composition, CTA ordering, overlay layer, carousel framing |
| `components/marketing/hero-promo.module.css` | Modified | Editorial text treatment, darker surface, responsive layout |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Copy, CTA labels, layout metadata, carousel hints |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Contract assertions for updated hero behavior |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shader changed accidentally | Low | Treat shader file as untouched boundary |
| Bigger carousels hurt first-screen balance | Med | Tune dimensions with viewport-fit checks |
| Mobile polish adds rendering cost | Med | Keep changes CSS-only and avoid extra animated/blur layers |

## Rollback Plan

Revert the proposal's implementation changes in `hero-promo.tsx`, `hero-promo.module.css`, `hero-promo-runtime.ts`, and related tests to restore the current hero contract and styling.

## Dependencies

- Existing `HeroPromo` runtime contract and Keen Slider carousel behavior.

## Success Criteria

- [ ] Hero copy and CTA hierarchy prioritize promo conversion and catalog traffic.
- [ ] Desktop keeps left-copy/right-visual split; mobile becomes message-first without the heavy card look.
- [ ] Shader background remains unchanged and performance stays acceptable on mid-range phones.
