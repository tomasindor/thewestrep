# Apply Progress: refresh-homepage-hero

## Implementation Progress

**Change**: `refresh-homepage-hero`  
**Mode**: Strict TDD

### Completed Tasks
- [x] 1.1–1.7 Runtime contract and layout metadata updates in `lib/marketing/hero-promo-runtime.ts`
- [x] 2.1–2.7 Hero CSS refresh (external darkening, transparent text treatment, carousel framing, edge fades)
- [x] 3.1–3.6 Hero component markup/composition updates (overlay layer, text container replacement, mobile order, framing wrappers)
- [x] 4.1–4.5 Unit test updates and execution for hero runtime/component contract
- [x] 5.1 Verified shader background file remained untouched by this implementation
- [x] Verify-remediation batch: fixed adjacent typecheck failures, removed source-regex-only proof in favor of runtime contract checks, and aligned CTA metadata sourcing to runtime contract
- [x] Refinement batch (2026-04-22): reduced apparent hero height, added bottom continuation fade cue, removed carousel side edge shadows, tightened carousel stack spacing, shifted text block right, and left-aligned headline
- [x] Refinement batch (2026-04-22 · pass 2): fade now transitions into page background instead of black, hero viewport reduced again, temporary visible frame enabled for each slide, and carousel visual mass tightened (smaller cylinder gap + scaled image occupancy)
- [x] Refinement batch (2026-04-22 · pass 3): hero viewport reduced aggressively, top/bottom rails pulled nearly together, slide images switched to high-occupancy fill behavior, and debug frame default disabled to prioritize final visual output
- [x] Refinement batch (2026-04-23 · pass 4): further shortened the hero viewport so next section can peek sooner, increased carousel inter-slide spacing, reduced slide footprint slightly, and preserved fade-to-page blending
- [x] Refinement batch (2026-04-25 · pass 5): switched carousel face assets from shared rail-level images to indexed per-cell image paths (`01..06`) for top/bottom front/back while preserving hemisphere swap behavior
- [x] Refinement batch (2026-04-25 · pass 6): corrected hero R2 asset keys to root at `imports/hero-promo-encargues/...` (removed duplicated `thewestrep-catalog/` segment)
- [x] Refinement batch (2026-04-25 · pass 7): replaced temporary debug slide frame with production premium outer stroke and added deterministic Keen `created`-driven hidden-until-ready fade-in before carousel reveal
- [x] Refinement batch (2026-04-25 · pass 8): increased premium outer frame glow visibility, tightened top/bottom rail vertical overlap, reduced frame-header-to-scene spacing, and shifted left text container toward center within its column
- [x] Refinement batch (2026-04-25 · pass 9): balanced outfit visual mass by reducing top-rail image scale, enlarged slide/frame contract to contain images, and fixed the real rail-attachment limiter by reducing scene-height dead space instead of only retuning spacing
- [x] Refinement batch (2026-04-25 · pass 10): introduced per-rail vertical image scaling metadata so the bottom rail reads taller in vertical proportion while the top rail stays comparatively compact
- [x] Refinement batch (2026-04-25 · pass 11): increased bottom-rail vertical stretch further (`railImageScaleY.bottom` `1.18 -> 1.3`) while keeping top rail controlled (`railImageScaleY.top` `0.94`)
- [x] Refinement batch (2026-04-26 · pass 12): introduced real per-rail layout sizing so the bottom rail uses a substantially taller scene/cell frame while top rail remains compact, and wired component rails to consume contract-provided layouts
- [x] Refinement batch (2026-04-26 · pass 13): removed axis-only vertical stretch (`railImageScaleY`) and switched to uniform per-rail image scaling so pants grow in both axes while preserving aspect ratio, keeping bottom real frame/layout taller than top
- [x] Refinement batch (2026-04-26 · pass 14): fixed homepage same-page anchor navigation offset by replacing `scrollIntoView({ block: "start" })` with sticky-header-aware `window.scrollTo` top computation, preventing sections from being hidden under the sticky header

### Latest Batch (R14)
- Added pure helper `computeAnchorScrollTop` to compute same-page anchor target top from current scroll, target position, and sticky header height.
- Updated `PublicNavLink` hash-click interception to compute sticky header height and scroll with explicit offset (`window.scrollTo`).
- Added stable header selector `data-public-header` to `PublicHeader` so offset measurement remains robust.
- Added focused unit tests (strict TDD) for helper happy path + clamp-to-zero edge case.

### TDD Cycle Evidence (R14)
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| R14 (sticky-header-aware same-page anchor scrolling) | `tests/unit/public-nav-link-scroll.test.ts` | Unit | N/A (no pre-existing targeted test file for this behavior) | ✅ Wrote helper tests first; run failed with missing module (`ERR_MODULE_NOT_FOUND`) | ✅ 2/2 passing after minimal helper + wiring | ✅ 2 cases (normal offset + clamp to page start) | ✅ Extracted pure helper for deterministic logic and minimal component changes |

### Test Summary (R14)
- ✅ RED: `node --import ./tests/node-test-register.mjs --test tests/unit/public-nav-link-scroll.test.ts` (failed: missing `computeAnchorScrollTop` module)
- ✅ GREEN: `node --import ./tests/node-test-register.mjs --test tests/unit/public-nav-link-scroll.test.ts` (2/2 passing)

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `lib/marketing/hero-promo-runtime.ts` | Modified | Updated hero copy hierarchy, CTA text, carousel dimensions (420/300/280), desktop ratio (0.55), added carousel label/drag-cue and mobile order metadata. |
| `components/marketing/hero-promo.tsx` | Modified | Added external darkening overlay, replaced boxed panel with transparent text container, centered dominant headline, added carousel frame headers + edge fades, reordered mobile text flow via structural blocks. |
| `components/marketing/hero-promo.module.css` | Modified | Reworked hero styling to remove card metaphor, introduced static darkening overlay and framing cues, tuned mobile ordering and spacing, preserved low-cost CSS (no blur/JS animations). |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Updated contract expectations, replaced source-regex-only checks with runtime contract assertions, and validated multiline headline + CTA metadata behavior. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Marked completed tasks for phases 1–4 and 5.1. |
| `components/ui/aurora-background.tsx` | Modified | Added optional `className` prop so homepage usage type-checks without local casting or unsafe overrides. |
| `types/shadergradient-react-overrides.d.ts` | Added | Added safe module typing override so `ShaderGradient` accepts runtime props used by the untouched shader component. |
| `tests/unit/hero-promo-shader-gradient-contract.test.ts` | Modified | Replaced stale customize-URL assertion with current shader prop assertions while preserving the no-edit shader guard. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Added refinement metadata (`heightVh`, headline alignment, continuation cue, text inset), disabled edge fades, and tightened carousel stack gap to `-64`. |
| `components/marketing/hero-promo.tsx` | Modified | Consumed new runtime metadata, removed carousel side shadow layers, injected bottom continuation fade layer, and switched headline to left alignment. |
| `components/marketing/hero-promo.module.css` | Modified | Reduced perceived hero height via top-biased layout/padding, added `.continuationFade`, removed edge-fade shading classes, increased text left inset, and kept low-cost static CSS. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Added failing-first assertions for refinement metadata (`heightVh`, stack gap, no edge fades, left alignment, continuation cue, text inset) and validated GREEN pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Second refinement pass: reduced carousel cylinder `cellGapPx` (`108 → 72`), lowered hero `heightVh` (`86 → 80`), and extended continuation cue/image debug metadata (`fadeToBackgroundColor`, `debugSlideFrame`, `carouselImageScale`). |
| `components/marketing/hero-promo.tsx` | Modified | Wired continuation fade color via CSS variable and propagated `debugSlideFrame` + `carouselImageScale` runtime flags into both carousel instances. |
| `components/marketing/hero-promo.module.css` | Modified | Removed bottom border cut, changed continuation gradient to fade into page tone, added temporary `.debugSlideFrame`, and scaled carousel image mass with `--hero-carousel-image-scale`. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | RED-first assertions for tighter carousel gap, lower viewport height, and new refinement metadata; GREEN run confirmed all assertions passing. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R1` for this pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Third refinement pass: tightened cylinder spacing (`cellGapPx` `72 → 40`), pulled rails near-contact (`carouselStackGapPx` `-64 → -132`), reduced viewport height (`80 → 66`), increased image occupancy scale (`1.12 → 1.3`), and disabled debug frame by default for production appearance. |
| `components/marketing/hero-promo.tsx` | Modified | Switched carousel image fit from contain to cover while preserving runtime-driven occupancy scale and unchanged slider mechanics. |
| `components/marketing/hero-promo.module.css` | Modified | Compressed hero paddings and frame gaps to materially reduce first-screen height and inter-rail separation; expanded face-swap inset to increase image occupancy in each slide. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | RED-first contract updates for aggressive spacing/height/image-occupancy metadata values and GREEN pass verification. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R2` for this pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Fourth refinement pass: reduced viewport height (`66 → 58`), increased inter-slide gap (`cellGapPx 40 → 72`), and reduced slide footprint (`300x280 → 264x244`) while preserving fade-to-page metadata contract. |
| `components/marketing/hero-promo.tsx` | Modified | Tuned responsive `sizes` hints to match smaller slide footprint and preserve readability. |
| `components/marketing/hero-promo.module.css` | Modified | Synced carousel fallback dimensions with smaller slides, reduced `continuationFade` height, removed hero grid min-height coupling, and softened `faceSwap` inset to reduce visual slide mass. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | RED-first expectation updates for new scene height, cell size/gap, lower viewport height, and lower image scale; GREEN pass verified. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R3` for this pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Replaced shared top/bottom `faceAssets` with indexed per-cell asset arrays using zero-padded paths (`01..06`) for front/back rails. |
| `components/marketing/hero-promo.tsx` | Modified | Updated carousel cell rendering to resolve image source per product index while preserving front/rear hemisphere swap behavior. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | RED-first contract assertions now verify indexed top/bottom asset mapping (slot 1 and slot 6) and GREEN pass confirms per-cell naming convention. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R4` for indexed asset mapping pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Updated hero carousel R2 key prefix from `thewestrep-catalog/imports/...` to `imports/...` so generated public URLs match catalog asset keys. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | RED-first expected URLs now assert `imports/hero-promo-encargues/...` asset keys for top/bottom slot `01` and `06`. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R6` for asset-key prefix correction. |
| `components/marketing/hero-promo.tsx` | Modified | Added `isReady` state toggled from Keen `created` callback, applied hidden/loading vs ready classes to carousel frame, and renamed slide-frame flag usage from `debugSlideFrame` to `showSlideFrame` with premium frame class. |
| `components/marketing/hero-promo.module.css` | Modified | Replaced temporary `.debugSlideFrame` with production `.premiumSlideFrame` subtle stroke and added `.carouselLoading`/`.carouselReady` classes for no-flash fade-in reveal. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Renamed runtime visual contract field to `showSlideFrame: true` to make production slide framing explicit and non-debug. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | RED-first assertions for `showSlideFrame`, no `debugSlideFrame`, Keen-created readiness state wiring, and premium frame/fade CSS classes; GREEN run confirms updated contract/source behavior. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R7` for frame + ready-state batch. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Pass 8 polish: tightened `visual.carouselStackGapPx` (`-132 → -156`) and moved text container inward via `visual.textInsetInlineStartPx` (`desktop 72 → 108`, `mobile 20 → 24`). |
| `components/marketing/hero-promo.module.css` | Modified | Pass 8 polish: reduced `.carouselFrame` header-to-scene gap (`0.3rem → 0.12rem`) and increased `.premiumSlideFrame` visibility with stronger stroke + soft glow. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Pass 8 RED-first expectations for tighter stack gap, centered text inset metadata, tighter header spacing, and stronger premium frame glow assertions; GREEN run validates runtime/CSS output. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R8` for this polish batch. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Pass 9 balance/attachment batch: reduced top-rail scale via new `visual.railImageScale.top`, kept bottom rail punch, reduced scene dead space (`368 → 324`), enlarged cell frame area (`264x244 → 292x276`), and tightened stack overlap (`-156 → -168`) to remove structural separation limiter. |
| `components/marketing/hero-promo.tsx` | Modified | Wired per-rail runtime metadata by passing top/bottom image scales independently to each carousel instance while preserving existing slider mechanics. |
| `components/marketing/hero-promo.module.css` | Modified | Updated carousel fallback dimensions to match enlarged frame contract, clipped frame overflow inside premium border (`overflow: hidden`), and inset image face layer (`inset: 2%`) so images stay within visible frame. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Pass 9 RED-first assertions for scene/cell geometry, stack gap, per-rail scale metadata, component wiring, and overflow-clamp CSS guards; GREEN pass confirmed all contract/source checks. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R9` for this balancing/attachment pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Pass 10 refinement: added per-rail vertical scaling contract metadata (`railImageScaleY`) and rebalanced horizontal/image mass (`top 1.0`, `bottom 1.08`) so bottom pants rail reads taller while top remains compact. |
| `components/marketing/hero-promo.tsx` | Modified | Pass 10 refinement: wired per-rail vertical scale metadata into carousel instances via dedicated CSS variables (`--hero-carousel-image-scale-x/y`). |
| `components/marketing/hero-promo.module.css` | Modified | Pass 10 refinement: switched carousel image transform to axis-specific scaling so vertical proportion can vary per rail without widening both rails equally. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Pass 10 RED-first assertions for new per-rail vertical scale metadata and component/CSS wiring; GREEN pass confirmed contract + source behavior. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R10` for bottom-rail vertical sizing pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Pass 11 refinement: increased only `visual.railImageScaleY.bottom` from `1.18` to `1.3` to stretch pants rail vertically without changing top-rail control. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Pass 11 RED-first expectation updates for stronger bottom-rail vertical stretch (`1.3`) across rich/compact/visual-cue contract checks; GREEN pass confirmed runtime alignment. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R11` for stronger bottom-rail vertical stretch pass. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Pass 12 refinement: added minimal per-rail real layout sizing (`top` keeps `324/276`, `bottom` uses `432/344` for scene/cell height) via `getHeroPromoCarouselLayout(productCount, rail)`, and wired render contract top/bottom layouts to these rail variants. |
| `components/marketing/hero-promo.tsx` | Modified | Pass 12 refinement: removed local uniform layout recomputation and made each rail consume its contract-provided layout (`layout={renderContract.topCarousel.layout}` / `layout={renderContract.bottomCarousel.layout}`). |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Pass 12 RED-first assertions for per-rail real layout dimensions and component wiring; GREEN pass confirms bottom rail real frame/slide height is substantially taller while top remains compact. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R12` for bottom-rail real-frame-height batch. |
| `lib/marketing/hero-promo-runtime.ts` | Modified | Pass 13 refinement: removed `railImageScaleY` contract metadata and set uniform per-rail `railImageScale` values (`top: 0.94`, `bottom: 1.08`) to preserve image aspect ratio while keeping top compact. |
| `components/marketing/hero-promo.tsx` | Modified | Pass 13 refinement: removed `carouselImageScaleY` wiring and passed a single uniform `--hero-carousel-image-scale` variable to each rail image. |
| `components/marketing/hero-promo.module.css` | Modified | Pass 13 refinement: switched image transform from two-axis scale to single uniform `scale(var(--hero-carousel-image-scale))` to prevent aspect-ratio distortion. |
| `tests/unit/hero-promo-ui-contract.test.ts` | Modified | Pass 13 RED-first updates assert no `railImageScaleY` wiring remains and validate uniform-scaling contract/source behavior; GREEN confirms expected runtime values and CSS transform strategy. |
| `openspec/changes/refresh-homepage-hero/tasks.md` | Modified | Added checked refinement-batch tracking entry `R13` for aspect-ratio-preserving bottom-rail batch. |

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1–1.7 | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 7/7 baseline passing | ✅ Updated assertions first (failed: 4 tests) | ✅ 8/8 passing after runtime updates | ✅ Added/kept multiple value-path assertions (compact vs rich layout, desktop + mobile contract values) | ✅ Kept runtime extensions typed and minimal |
| 2.1–2.7 + 3.1–3.6 | `tests/unit/hero-promo-ui-contract.test.ts` | Unit (source contract) | ✅ 7/8 passing before CSS/markup (new source assertion failing) | ✅ Source contract assertions written first for overlay/text/frame classes | ✅ 8/8 passing after component/CSS updates | ✅ Verified both presence (`.darkeningOverlay`, `.carouselFrame`, `.edgeFade`) and absence (no `.infoPanel::before`) | ✅ Simplified by using static CSS layers only |
| 4.1–4.5 | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | N/A (same file under cycle) | ✅ Assertions updated before implementation | ✅ Executed with node runner, all pass | ✅ Included contract + source assertions for non-empty behavior coverage | ➖ None needed |
| 5.1 | `tests/unit/hero-promo-ui-contract.test.ts` + code audit | Unit + static audit | N/A | ✅ Verified preservation constraint explicitly | ✅ No edits applied to shader component file during this batch | ➖ Single preservation constraint | ➖ None needed |
| Verify remediation (runtime proof + contract consistency + type safety) | `tests/unit/hero-promo-ui-contract.test.ts`, `tests/unit/hero-promo-shader-gradient-contract.test.ts`, `npm run typecheck` | Unit + typecheck | ✅ Baseline captured (UI test 8/8 pass, shader test 2/3 fail, typecheck 2 known failures) | ✅ Added failing contract/headline split assertions first (missing export + mismatched values) | ✅ 9/9 UI contract tests pass, 3/3 shader contract tests pass, typecheck passes | ✅ Multi-line headline parsing + CTA metadata + visual hints validated through runtime contract outputs | ✅ Kept shader file unchanged; solved via surrounding typings and contract-driven wiring |
| Refinement batch (height/cue/spacing/alignment) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 9/9 baseline passing | ✅ Updated contract assertions first (failed: 3 tests) | ✅ 9/9 passing after runtime + component/CSS updates | ✅ Added multiple assertions covering `heightVh`, `carouselStackGapPx`, `showEdgeFades`, headline alignment, continuation cue, and inset metadata | ✅ Kept implementation static-CSS-only with contract-driven toggles |
| Refinement batch pass 2 (fade target + tighter packing debug) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 9/9 baseline passing | ✅ Updated assertions first (failed: 3 tests) | ✅ 9/9 passing after runtime + component/CSS updates | ✅ Added second-path assertions on compact contract for `heightVh`, fade target color, debug frame flag, and image scale | ✅ Used runtime-driven CSS vars to avoid hardcoding in JSX |
| Refinement batch pass 3 (height drop + rail compression + slide occupancy) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ Prior pass baseline available (9/9) | ✅ Updated expectations first (failed: 4 tests) | ✅ 9/9 passing after runtime + component/CSS updates | ✅ Rich + compact contract assertions cover spacing, height, debug toggle, and occupancy scale | ✅ Kept changes contract-led and low-cost (CSS/static layout only) |
| Refinement batch pass 4 (shorter viewport + wider spacing + smaller slides) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ Prior pass baseline available (9/9) | ✅ Updated expectations first (failed: 4 tests) | ✅ 9/9 passing after runtime + component/CSS updates | ✅ Rich + compact contract assertions cover scene height, cell size, cell gap, viewport height, and image scale | ✅ Kept changes contract-driven with static CSS/runtime metadata only |
| Refinement batch pass 5 (indexed per-cell top/bottom face assets) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 9/9 baseline passing | ✅ Added indexed asset assertions first (failed: 1 test) | ✅ 9/9 passing after runtime + component updates | ✅ Verified first and sixth slots for both rails (`top` and `bottom`) with zero-padded naming (`01`, `06`) | ✅ Kept change contract-driven with minimal component adaptation |
| Refinement batch pass 6 (R2 key-root correction) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 9/9 baseline passing | ✅ Updated URL expectations first to `imports/...` (8/9, expected failure) | ✅ 9/9 passing after runtime prefix fix | ✅ Top/bottom + slot `01`/`06` assertions confirm all hero face keys resolve from `imports/hero-promo-encargues` root | ✅ Single-prefix constant remains centralized for maintainability |
| Refinement batch pass 7 (premium frame + deterministic no-flash ready state) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 9/9 baseline passing | ✅ Added `showSlideFrame` and source/CSS readiness assertions first (7/11, expected failure) | ✅ 11/11 passing after runtime rename + component/CSS ready-state implementation | ✅ Contract + source coverage validates `showSlideFrame`, no `debugSlideFrame`, Keen `created` readiness transition, and premium frame/fade classes | ✅ Kept solution scoped to hero carousel/runtime with static low-cost CSS |
| Refinement batch pass 8 (glow + tighter rails + tighter header spacing + centered text panel) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 11/11 baseline passing | ✅ Updated assertions first for `carouselStackGapPx`, text insets, and CSS glow/spacing rules (7/11, expected failure) | ✅ 11/11 passing after runtime + CSS updates | ✅ Rich + compact contract assertions plus source checks cover all four requested polish adjustments | ✅ Kept changes contract-led and CSS-only; no shader edits |
| Refinement batch pass 9 (rail balance + overflow containment + structural attachment fix) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 11/11 baseline passing | ✅ Updated assertions first for scene/cell geometry, stack gap, per-rail scales, and overflow/source guards (6/11, expected failure) | ✅ 11/11 passing after runtime + component + CSS updates | ✅ Contract + source assertions cover top-vs-bottom visual balance, enlarged frame geometry, and real attachment limiter removal via scene-height reduction | ✅ Kept implementation contract-led with minimal metadata (`railImageScale`) and no shader changes |
| Refinement batch pass 10 (bottom-rail vertical sizing + top compactness) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 11/11 baseline passing | ✅ Updated assertions first for per-rail horizontal + vertical scale contract and source wiring (7/11, expected failure) | ✅ 11/11 passing after runtime + component + CSS updates | ✅ Contract + source assertions validate `railImageScaleY` metadata and top/bottom per-rail axis-specific wiring | ✅ Minimal contract-led extension; no scene/slider mechanic changes required |
| Refinement batch pass 11 (stronger pants vertical stretch, top rail held controlled) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 11/11 baseline passing | ✅ Updated assertions first for `railImageScaleY.bottom = 1.3` (8/11, expected failure) | ✅ 11/11 passing after runtime update | ✅ Three contract paths (`rich`, `compact`, visual cues) now assert stronger bottom stretch while top remains `0.94` | ➖ None needed |
| Refinement batch pass 12 (real bottom-rail frame/slide height increase) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 11/11 baseline passing | ✅ Updated assertions first for per-rail real layout geometry + layout wiring (8/11, expected failure) | ✅ 11/11 passing after runtime + component updates | ✅ Rich contract + source assertions cover `top` vs `bottom` scene/cell dimensions and explicit per-rail layout consumption | ✅ Kept implementation minimal and contract-led (no shader/CSS mechanic rewrites) |
| Refinement batch pass 13 (uniform image scaling, no aspect-ratio distortion) | `tests/unit/hero-promo-ui-contract.test.ts` | Unit | ✅ 11/11 baseline passing | ✅ Updated assertions first for no `railImageScaleY`, top compact scale, and uniform CSS transform (7/11, expected failure) | ✅ 11/11 passing after runtime + component + CSS updates | ✅ Contract + source assertions validate both rails use one scale axis and bottom remains visually larger via taller frame + higher uniform scale | ✅ Removed axis-specific complexity, retained contract-driven layout |

### Test Summary
- **Total tests written/updated**: 11 (11 in `hero-promo-ui-contract.test.ts` after refinement pass 7; shader contract updates retained from prior batch)
- **Total tests passing (targeted)**: 14/14
- **Additional regression checks**:
  - ✅ `tests/unit/lib/hero-promo-encargues.test.ts` (11/11 in previous batch)
  - ✅ `tests/unit/hero-promo-shader-gradient-contract.test.ts` (3/3 after updating stale expectation)
  - ✅ `npm run typecheck` passes for hero-related failures after surrounding fixes
  - ✅ `tests/unit/hero-promo-ui-contract.test.ts` (9/9 after refinement batch)
  - ✅ `tests/unit/hero-promo-shader-gradient-contract.test.ts` (3/3 re-run to confirm shader preservation contract)
  - ✅ `tests/unit/hero-promo-ui-contract.test.ts` (9/9 after refinement pass 2)
  - ✅ `tests/unit/hero-promo-shader-gradient-contract.test.ts` (3/3 after refinement pass 2)
  - ✅ `tests/unit/hero-promo-ui-contract.test.ts` (9/9 after refinement pass 3)
  - ✅ `tests/unit/hero-promo-shader-gradient-contract.test.ts` (3/3 after refinement pass 3)
  - ✅ `npm run typecheck` (pass after refinement pass 3)
  - ✅ `tests/unit/hero-promo-ui-contract.test.ts` (9/9 after refinement pass 4)
  - ✅ `tests/unit/hero-promo-shader-gradient-contract.test.ts` (3/3 after refinement pass 4)
  - ✅ `tests/unit/hero-promo-ui-contract.test.ts` (9/9 after refinement pass 5)
  - ✅ `tests/unit/hero-promo-shader-gradient-contract.test.ts` (3/3 after refinement pass 5)
  - ✅ `npm run typecheck` (pass after refinement pass 5)
  - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (8/9 after assertion update to `imports/...`)
  - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (9/9 after runtime prefix fix)
  - ✅ `tests/unit/product-images-url.test.ts` + `tests/unit/hero-promo-ui-contract.test.ts` (13/13)
  - ✅ `npm run typecheck` (pass after refinement pass 6)
  - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (7/11 after frame + ready-state assertions)
  - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after implementation)
  - ✅ `npm run typecheck` (pass after refinement pass 7)
  - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (7/11 after pass 8 polish assertions)
  - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after pass 8 runtime/CSS implementation)
  - ✅ `npm run typecheck` (pass after refinement pass 8)
  - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (6/11 after pass 9 balance/attachment assertions)
  - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after pass 9 runtime/component/CSS implementation)
  - ✅ `npm run typecheck` (pass after refinement pass 9)
   - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (7/11 after pass 10 vertical-scaling assertions)
   - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after pass 10 runtime/component/CSS implementation)
   - ✅ `npm run typecheck` (pass after refinement pass 10)
    - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (8/11 after pass 11 stronger bottom-stretch assertions)
    - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after pass 11 runtime refinement)
    - ✅ `npm run typecheck` (pass after refinement pass 11)
     - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (8/11 after pass 12 real frame-height assertions)
     - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after pass 12 runtime + component refinement)
     - ✅ `npm run typecheck` (pass after refinement pass 12)
     - ✅ RED: `tests/unit/hero-promo-ui-contract.test.ts` (7/11 after pass 13 uniform-scaling assertions)
     - ✅ GREEN: `tests/unit/hero-promo-ui-contract.test.ts` (11/11 after pass 13 runtime + component + CSS refinement)
     - ✅ `npm run typecheck` (pass after refinement pass 13)
- **Layers used**: Unit
- **Approval tests (refactoring)**: None
- **Pure functions created**: 0 (extended existing runtime pure contract function)

### Deviations from Design
Minor additive extension only — runtime contract now carries CTA aria/tracking metadata and multiline headline split support to satisfy spec contract-consistency constraints without changing shader internals.

Refinement additive extension — runtime contract now also carries viewport height (`heightVh`), continuation cue metadata, headline alignment, and text inset metadata so component layout refinements remain contract-driven and testable.

Second refinement additive extension — runtime contract now also carries continuation fade target color, temporary slide debug-frame flag, and carousel image scale metadata so visual spacing fixes remain explicitly contract-driven.

Third refinement additive extension — runtime contract now tunes cylinder cell gap, rail stack gap, viewport height, and default debug-frame behavior to target tighter dual-rail composition while preserving diagnostic capability in code.

Fourth refinement additive extension — runtime contract now further reduces first-screen viewport height and updates scene/cell metrics (`368`, `264x244`, `gap 72`) to make slides smaller yet more separated, while preserving continuation fade-to-page behavior.

Fifth refinement additive extension — runtime contract now maps top/bottom carousel assets per slot index (`01..06`) and per hemisphere (`front/back`) so each product cell resolves its own image path instead of sharing a single rail-level front/back pair.

Sixth refinement correction — hero carousel asset keys now use catalog-rooted keys (`imports/hero-promo-encargues/...`) so the R2 public URL resolver does not duplicate bucket/base path segments already provided by environment configuration.

Seventh refinement correction — renamed `debugSlideFrame` to production `showSlideFrame`, replaced temporary debug stroke with premium subtle frame treatment, and introduced deterministic hidden-until-ready fade-in controlled by Keen `created` callback.

Eighth refinement polish — increased frame glow visibility for a more premium boundary cue, reduced rail separation with a stronger negative stack gap, tightened frame header spacing above each scene, and pushed the left text panel inward to feel less left-anchored.

Ninth refinement balancing/attachment fix — introduced per-rail visual scale metadata so the top rail can read slightly smaller than the bottom, enlarged cell/frame geometry to keep product imagery inside the visible premium frame, and reduced carousel scene dead space (the real structural limiter) so top and bottom rails can visually sit almost attached without relying only on repeated gap tweaks.

Tenth refinement vertical-proportion pass — introduced a separate per-rail vertical scale contract (`railImageScaleY`) and axis-specific CSS transform wiring so the bottom pants rail can read naturally taller while the top rail remains compact without widening both rails equally.

Eleventh refinement vertical-proportion pass — increased only `railImageScaleY.bottom` to `1.3` for a stronger pants-rail stretch while preserving top-rail control at `0.94`; retained existing per-rail axis-specific mechanism with no slider-mechanics changes.

Twelfth refinement real-layout pass — introduced rail-specific real geometry (`scene`/`cell` height) in the runtime contract and consumed those contract layouts directly in the component so bottom rail grows in actual frame/slide dimensions (not just visual scaling) while top rail remains compact.

Thirteenth refinement aspect-ratio pass — removed axis-only Y scaling (`railImageScaleY`) and replaced it with uniform per-rail scaling so bottom pants imagery grows on both axes without distortion, while preserving the real taller bottom frame introduced in pass 12.

### Issues Found
- ESLint still reports pre-existing hook-rule findings in `components/marketing/hero-promo.tsx` (`react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`); not modified in this remediation because it would require behavior refactor outside verify-failure scope.

### Remaining Tasks
- [ ] 5.2 Run dev server and visually verify hero layout on desktop breakpoint
- [ ] 5.3 Run dev server and visually verify hero layout on mobile breakpoint
- [ ] 5.4 Verify carousel drag interaction smooth on desktop
- [ ] 5.5 No console errors on hero mount

### Status
Implementation/code tasks complete through refinement batch R14. Manual visual checks 5.2–5.5 are still pending before verify can fully close.
