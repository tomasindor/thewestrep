# Spec: Refresh Homepage Hero

## Executive Summary

This delta spec defines the refreshed homepage hero that prioritizes commercial impact through a dominant centered headline (`COMBINALOS COMO QUIERAS`), removes the heavy card aesthetic for transparent text presentation, enlarges the dual-carousel presentation with clearer affordances, and introduces a mobile-first message composition—all while preserving the existing `HeroPromoShaderBackground` implementation unchanged and maintaining performance on mid-range phones.

The spec builds on the existing `HeroPromo` architecture, using a contract-led refresh approach where all copy, layout metadata, and carousel hints flow from `lib/marketing/hero-promo-runtime.ts` as the single source of truth.

---

## 1. Requirements

### 1.1 Functional Requirements

#### R1: Dominant Commercial Headline Hierarchy
- **R1.1**: The hero must feature `COMBINALOS COMO QUIERAS` as the dominant centered headline, visually larger and more prominent than any other text element.
- **R1.2**: The headline must be multi-line capable (text-wrap allowed) to maintain readability at larger sizes.
- **R1.3**: The brand label (`THE WEST REP`) and promo label (`Encargues · Promo especial`) must remain present but visually subordinate to the main headline.
- **R1.4**: The promo rule (`30% OFF EN LA 2DA UNIDAD`) must be repositioned as supporting proof, not the primary headline.

#### R2: External Background Darkening
- **R2.1**: The hero background must appear darker than the current implementation to increase text contrast and visual depth.
- **R2.2**: The darkening effect MUST be implemented as an overlay layer external to `components/marketing/hero-promo-shader-background.tsx`.
- **R2.3**: The file `components/marketing/hero-promo-shader-background.tsx` MUST remain completely unchanged (line-by-line preservation).
- **R2.4**: The darkening overlay must use static CSS (gradients, rgba) only—no additional animated layers, blur filters, or JavaScript-based effects.

#### R3: Enlarged Dual-Carousel Presentation
- **R3.1**: Both carousels (top and bottom) must appear larger and more prominent than the current implementation.
- **R3.2**: Each carousel must have explicit framing cues (labels, edge fades, or visual boundaries) to communicate interactivity.
- **R3.3**: Carousel cells must maintain their 3D cylindrical mechanics but with increased visual weight and spacing.
- **R3.4**: The carousels must retain their drag affordance and slide indicators (if any) without modification to core mechanics.

#### R4: Transparent Text Presentation
- **R4.1**: The left info panel must remove its bordered card appearance (no visible border, no heavy background gradient, no drop shadow).
- **R4.2**: Text must appear to float directly on the darkened background, creating an editorial/layered feel.
- **R4.3**: The vertical left edge accent (`.infoPanel::before`) must be removed or significantly minimized.
- **R4.4**: Visual separation must be achieved through typography, spacing, and subtle contrast—not boxed containers.

#### R5: Mobile-Specific Message-First Composition
- **R5.1**: Mobile layout must reorder content to prioritize: (1) headline, (2) CTA block, (3) supporting copy, (4) carousels.
- **R5.2**: The desktop left/right split must NOT be simply stacked vertically on mobile.
- **R5.3**: Mobile must maintain full-bleed text treatment without the bordered info panel.
- **R5.4**: Carousel dimensions and stacking on mobile must be optimized for smaller viewports while preserving the dual-rail concept.

#### R6: CTA Hierarchy Preservation
- **R6.1**: Primary CTA (`ARMA TU COMBO`) must remain the first and most prominent action.
- **R6.2**: Secondary CTA (`VER CATALOGO COMPLETO`) must remain present but visually subordinate.
- **R6.3**: Both CTAs must retain their existing href targets and tracking attributes.
- **R6.4**: CTA copy may be updated to uppercase for consistency with the new headline treatment.

#### R7: Performance Expectations
- **R7.1**: The hero must maintain acceptable performance on mid-range Android phones (e.g., 3-4GB RAM, mid-tier GPU).
- **R7.2**: No additional JavaScript-based animations or effects may be introduced.
- **R7.3**: CSS changes must avoid expensive properties (e.g., `backdrop-filter: blur()`, multiple `transform` layers, complex gradients in animations).
- **R7.4**: First Contentful Paint (FCP) and Largest Contentful Paint (LCP) must not regress by more than 10% from baseline.

### 1.2 Non-Functional Requirements

#### R8: Shader Preservation
- **R8.1**: The component `components/marketing/hero-promo-shader-background.tsx` MUST NOT be modified in any way.
- **R8.2**: No props, imports, or internal logic of the shader component may be altered.
- **R8.3**: Any darkening or overlay effects must be implemented in parent components or sibling layers.

#### R9: Contract Consistency
- **R9.1**: All copy, labels, and layout metadata must flow from `lib/marketing/hero-promo-runtime.ts`.
- **R9.2**: The runtime contract interface (`HeroPromoRenderContract`) may be extended but not broken.
- **R9.3**: Unit tests in `tests/unit/hero-promo-ui-contract.test.ts` must be updated to reflect new contract values.

#### R10: Responsive Behavior
- **R10.1**: Desktop breakpoint (≥1024px): maintains left-text/right-visual split with updated styling.
- **R10.2**: Tablet breakpoint (768px–1023px): transitional layout with adjusted proportions.
- **R10.3**: Mobile breakpoint (<768px): message-first vertical stack with reordered content blocks.

---

## 2. Scenarios

### Scenario 1: Desktop User Views Refreshed Hero

**Given** a user on a desktop device (≥1024px viewport)  
**When** the homepage loads with the promo hero enabled  
**Then** the user sees:
- A darkened background with the shader animation visible underneath
- The text `COMBINALOS COMO QUIERAS` as the largest, centered headline
- Supporting text (brand, promo label, rules) arranged hierarchically below/around the headline
- Two large, clearly-framed carousels on the right with visible drag cues
- Primary CTA (`ARMA TU COMBO`) and secondary CTA (`VER CATALOGO COMPLETO`) below the headline block
- No visible card border or heavy background behind the text

**Visual Hierarchy (Desktop)**:
1. `COMBINALOS COMO QUIERAS` (headline, dominant, centered)
2. Brand label + Promo label (subordinate, top-aligned)
3. Promo rule/proof (`30% OFF EN LA 2DA UNIDAD`)
4. CTA block (primary + secondary)
5. Disclosure + legal text (smallest, bottom)
6. Dual carousels (right side, framed, interactive)

### Scenario 2: Mobile User Views Refreshed Hero

**Given** a user on a mobile device (<768px viewport)  
**When** the homepage loads with the promo hero enabled  
**Then** the user sees:
- Content ordered: headline → CTA block → supporting copy → carousels
- Full-bleed text without card borders or heavy backgrounds
- Carousels stacked vertically with tighter spacing than desktop
- Clear visual separation between content blocks through spacing and typography only

**Content Order (Mobile)**:
1. Brand label (compact)
2. Promo label (compact)
3. `COMBINALOS COMO QUIERAS` (headline, dominant)
4. Promo rule/proof
5. Primary CTA (`ARMA TU COMBO`)
6. Secondary CTA (`VER CATALOGO COMPLETO`)
7. Disclosure + legal (condensed)
8. Top carousel (framed, labeled)
9. Bottom carousel (framed, labeled)

### Scenario 3: User Interacts with Carousel

**Given** a user viewing the hero on any device  
**When** the user drags or swipes on either carousel  
**Then**:
- The carousel rotates smoothly in 3D space
- Visual cues (edge fades, labels) remain visible
- The carousel maintains its enlarged dimensions
- No performance stutter or frame drops occur on mid-range devices

### Scenario 4: Shader Background Loads

**Given** the hero component mounts  
**When** the shader background lazy-loads after the timeout  
**Then**:
- The shader appears behind all content layers
- The external darkening overlay sits between shader and content
- No flash of unstyled content (FOUC) occurs
- The shader file itself remains untouched

---

## 3. UI Contract Changes

### 3.1 Runtime Contract Updates

The `buildHeroPromoRenderContract()` function in `lib/marketing/hero-promo-runtime.ts` must be updated with the following changes:

#### Copy Updates
| Field | Current Value | New Value |
|-------|---------------|-----------|
| `heroLabel` | `"THE WEST REP"` | `"THE WEST REP"` (unchanged) |
| `promoLabel` | `"Encargues · Promo especial"` | `"COMBINALOS COMO QUIERAS"` (moved to headline) |
| `headline` | `"30% OFF en la segunda unidad"` | `"COMBINALOS<br/>COMO QUIERAS"` (multi-line, dominant) |
| `rules` | `"Aplica al combinar 1 pantalón + 1 buzo/campera"` | `"30% OFF EN LA 2DA UNIDAD"` (promoted from headline) |
| `disclosure` | `"Descuento sobre la prenda más barata"` | (unchanged) |
| `legal` | `"Promo por tiempo limitado."` | (unchanged) |
| `cta.label` | `"Armá tu combo"` | `"ARMA TU COMBO"` (uppercase) |

#### Layout Metadata Updates
| Field | Current Value | New Value |
|-------|---------------|-----------|
| `visual.carouselStackGapPx` | `-18` | `-12` (reduced gap for larger appearance) |
| `visual.hierarchy` | `["brand", "promo", "subheading", "cta"]` | `["brand", "promo", "headline", "proof", "cta"]` |
| `visual.heroSurface` | `"edge-to-edge-purple"` | `"transparent-editorial"` |
| `desktop.infoPanelWidthRatio` | `0.62` | `0.55` (narrower text panel for larger carousels) |
| `desktop.carouselMaxWidthPx` | `1480` | `1600` (wider carousel area) |

#### New Contract Fields (Optional Extensions)
```typescript
visual: {
  carouselHints: {
    showLabels: true;
    showEdgeFades: true;
    showDragCue: true;
  };
  textTreatment: "transparent-editorial";
  mobileOrder: Array<"brand" | "promo" | "headline" | "proof" | "cta" | "disclosure" | "legal" | "carousels">;
}
```

### 3.2 Component Structure Changes

#### Desktop Layout (`hero-promo.tsx`)
- Remove `.infoPanel` class and its background/border/shadow styles
- Wrap text content in a new `.textContent` container with transparent styling
- Add external darkening overlay as a sibling to `<HeroPromoShaderBackground />`
- Add carousel framing wrappers with labels and edge fade effects
- Center headline using `text-center` and increased font size

#### Mobile Layout (`hero-promo.tsx`)
- Reorder content blocks using flexbox/grid order or separate mobile-specific markup
- Place headline and CTAs before carousel content
- Remove any remaining card-like styling
- Use full-bleed text with generous spacing

#### CSS Updates (`hero-promo.module.css`)
- Remove `.infoPanel` background gradients, borders, and shadows
- Remove `.infoPanel::before` vertical accent
- Add `.textContent` class for transparent text container
- Add `.darkeningOverlay` class for external background darkening
- Add `.carouselFrame` class for carousel wrapping with labels
- Add `.edgeFade` class for carousel edge visual cues
- Update responsive breakpoints for mobile-first ordering

---

## 4. Implementation Boundaries

### 4.1 Files to Modify

| File | Changes | Risk Level |
|------|---------|------------|
| `components/marketing/hero-promo.tsx` | Composition, overlay layer, carousel framing, mobile reorder | Medium |
| `components/marketing/hero-promo.module.css` | Remove card styles, add transparent text styles, darkening overlay, carousel framing | Medium |
| `lib/marketing/hero-promo-runtime.ts` | Update copy, layout metadata, hierarchy hints | Low |
| `tests/unit/hero-promo-ui-contract.test.ts` | Update assertions for new contract values | Low |

### 4.2 Files to Preserve

| File | Constraint |
|------|------------|
| `components/marketing/hero-promo-shader-background.tsx` | MUST NOT be modified (line-by-line preservation) |
| `components/marketing/hero-promo-shader-background.module.css` | No changes required |
| `lib/catalog/*` | No changes unless promo logic updates |
| `app/page.tsx` | No changes unless hero integration changes |

### 4.3 Performance Budget

| Metric | Target | Constraint |
|--------|--------|------------|
| Additional CSS size | <2KB gzipped | Avoid new complex selectors |
| Additional JS | 0 bytes | No new JavaScript logic |
| LCP regression | <10% | Maintain current LCP baseline |
| FPS during carousel drag | ≥55fps on mid-range phones | No expensive animations |
| Memory footprint | No increase | Reuse existing assets |

---

## 5. Acceptance Criteria

### AC1: Headline Dominance
- [ ] `COMBINALOS COMO QUIERAS` is the largest text element in the hero (font-size ≥ 3rem on mobile, ≥ 4rem on desktop)
- [ ] Headline is visually centered (text-align center or flex center)
- [ ] Headline uses multi-line layout with appropriate line-height (1.0–1.1)

### AC2: Background Darkening
- [ ] Background appears noticeably darker than current implementation
- [ ] Shader component file is byte-for-byte identical to original
- [ ] Darkening implemented as CSS overlay (gradient or rgba) in parent component
- [ ] No blur filters or animated overlays added

### AC3: Carousel Enlargement
- [ ] Both carousels have increased visual presence (dimensions, spacing, or framing)
- [ ] Each carousel has a visible label (e.g., "BUZOS & CAMPERAS", "PANTALONES")
- [ ] Edge fade effects or visual boundaries are present
- [ ] Drag interaction remains smooth (≥55fps)

### AC4: Transparent Text Treatment
- [ ] No visible border around text area
- [ ] No heavy background gradient behind text
- [ ] No drop shadow on text container
- [ ] Vertical accent bar removed or minimized to invisibility
- [ ] Text appears to float on background

### AC5: Mobile Message-First Order
- [ ] On mobile (<768px), headline appears before carousels in DOM order
- [ ] CTA block appears immediately after headline block
- [ ] Layout is not simply a vertical stack of desktop layout
- [ ] Content blocks are separated by spacing, not containers

### AC6: CTA Hierarchy
- [ ] Primary CTA (`ARMA TU COMBO`) uses solid/filled style
- [ ] Secondary CTA (`VER CATALOGO COMPLETO`) uses ghost/outline style
- [ ] Both CTAs retain correct hrefs and tracking attributes
- [ ] CTA copy is uppercase (or matches new headline treatment)

### AC7: Performance
- [ ] Lighthouse performance score ≥90 on mid-range phone emulation
- [ ] No layout shift (CLS < 0.1) during hero load
- [ ] Carousel drag maintains smooth frame rate
- [ ] No console errors or warnings related to hero component

### AC8: Contract Consistency
- [ ] All copy values match runtime contract
- [ ] Unit tests pass with updated assertions
- [ ] Layout metadata correctly reflects new proportions
- [ ] No hardcoded strings in component JSX

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shader file accidentally modified | Low | High | Pre-commit hook to check file hash; code review checklist |
| Mobile layout feels rushed/stacked | Medium | Medium | Test on real devices; iterate on spacing and typography |
| Carousel enlargement breaks viewport fit | Medium | Medium | Use `max-width` constraints; test on smallest supported viewport |
| Performance regression on low-end devices | Medium | High | Profile on Chrome DevTools throttling; avoid blur/complex gradients |
| Contract test drift | Low | Medium | Update tests in same commit as runtime changes |
| Text readability on bright backgrounds | Low | Medium | Ensure darkening overlay is strong enough; test in light mode if applicable |

---

## 7. Dependencies

- Existing `HeroPromo` component structure and Keen Slider integration
- `HeroPromoShaderBackground` component (preserved as-is)
- Runtime contract pattern in `lib/marketing/hero-promo-runtime.ts`
- Native Node test runner for unit tests
- CSS modules for styling

---

## 8. Out of Scope

- Modifying carousel mechanics or 3D cylinder math
- Changing product selection logic or promo rules
- Adding new analytics or tracking beyond existing attributes
- Redesigning the shader or its animation parameters
- Creating new homepage sections or features
- Modifying the header, footer, or navigation

---

## 9. Success Metrics

1. **Commercial Impact**: Increased CTR on primary CTA (`ARMA TU COMBO`) by ≥15%
2. **Visual Clarity**: User testing shows 100% recognition of carousel interactivity
3. **Performance**: No regression in Lighthouse performance score (maintain ≥90)
4. **Code Quality**: Zero modifications to shader file; all changes in designated files
5. **Contract Integrity**: All unit tests pass; no hardcoded strings in component

---

## 10. References

- Proposal: `/home/gonzalo/projects/thewestrep/openspec/changes/refresh-homepage-hero/proposal.md`
- Exploration: `/home/gonzalo/projects/thewestrep/openspec/changes/refresh-homepage-hero/exploration.md`
- Component: `/home/gonzalo/projects/thewestrep/components/marketing/hero-promo.tsx`
- Runtime: `/home/gonzalo/projects/thewestrep/lib/marketing/hero-promo-runtime.ts`
- Shader: `/home/gonzalo/projects/thewestrep/components/marketing/hero-promo-shader-background.tsx`
- Tests: `/home/gonzalo/projects/thewestrep/tests/unit/hero-promo-ui-contract.test.ts`

---

## 11. Appendix: Visual Reference

### Desktop Layout (Text Left, Visual Right)
```.infoPanel (now transparent)
├─ .brandEyebrow "THE WEST REP"
├─ .promoEyebrow "COMBINALOS COMO QUIERAS" (moved to headline)
├─ h1.headline "COMBINALOS<br/>COMO QUIERAS" (dominant, centered, 4rem+)
├─ .proof "30% OFF EN LA 2DA UNIDAD"
├─ .ctaBlock
│  ├─ primary "ARMA TU COMBO"
│  └─ secondary "VER CATALOGO COMPLETO"
├─ .disclosure
└─ .legal

.carouselSet (enlarged, framed)
├─ .carouselFrame.top
│  ├─ label "BUZOS & CAMPERAS"
│  ├─ .scene (enlarged)
│  └─ edgeFade
└─ .carouselFrame.bottom
   ├─ label "PANTALONES"
   ├─ .scene (enlarged)
   └─ edgeFade
```

### Mobile Layout (Message First)
```.mobileContent
├─ .brandEyebrow (compact)
├─ .promoEyebrow (compact)
├─ h1.headline "COMBINALOS<br/>COMO QUIERAS" (dominant)
├─ .proof "30% OFF EN LA 2DA UNIDAD"
├─ .ctaBlock
│  ├─ primary "ARMA TU COMBO"
│  └─ secondary "VER CATALOGO COMPLETO"
├─ .disclosure + .legal (condensed)
└─ .carouselSet (stacked, tighter)
   ├─ .carouselFrame.top
   └─ .carouselFrame.bottom
```

### Darkening Overlay Implementation
```tsx
<div className={styles.heroFrame}>
  {/* External darkening overlay (NEW) */}
  <div className={styles.darkeningOverlay} />
  
  {/* Shader background (PRESERVED) */}
  <HeroPromoShaderBackground />
  
  {/* Content (updated styling) */}
  <div className={styles.heroGrid}>
    {/* ... transparent text content ... */}
  </div>
</div>
```

```css
/* hero-promo.module.css */
.darkeningOverlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(4, 4, 8, 0.65) 0%,
    rgba(4, 4, 8, 0.78) 100%
  );
  z-index: 1;
  pointer-events: none;
}

.heroFrame {
  /* existing styles */
  isolation: isolate; /* ensure stacking context */
}