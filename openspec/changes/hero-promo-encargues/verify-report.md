# Verification Report

**Change**: hero-promo-encargues  
**Version**: 1.2  
**Mode**: Strict TDD

---

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 27 |
| Tasks complete | 26 |
| Tasks incomplete | 1 |

Incomplete tasks:
- [ ] 6.3 Verify LCP impact < 500ms with Lighthouse

Assessment:
- **WARNING**: manual performance evidence is still pending.

---

### Build & Tests Execution

**Build**: ➖ Skipped  
Project rule in `AGENTS.md` says **Never build after changes**. No build command was executed.

**Type Check**: ✅ Passed  
Command: `npm run typecheck`

**Targeted change tests**: ✅ 18 passed / ❌ 0 failed / ⚠️ 0 skipped  
Command: `node --experimental-test-coverage --import ./tests/node-test-register.mjs --test tests/unit/lib/hero-promo-encargues.test.ts tests/unit/hero-promo-ui-contract.test.ts`

**Project unit suite**: ✅ 196 passed / ❌ 1 failed / ⚠️ 0 skipped  
Command: `npm run test:unit`

Failed test:
- `tests/unit/csrf-middleware.test.ts` → `ERR_MODULE_NOT_FOUND: Cannot find module '/home/gonzalo/projects/thewestrep/node_modules/next/server' imported from /home/gonzalo/projects/thewestrep/proxy.ts`

Assessment:
- **WARNING (environment/repo-wide)**: full `npm run test:unit` remains red because of the known unrelated `csrf-middleware` resolver/runtime issue.
- **INFO**: the change-focused hero-promo strict-TDD suite is green.

**Coverage**: available via targeted run only

---

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress.md` contains the required `TDD Cycle Evidence` table |
| All tasks have tests | ✅ | 8/8 evidence rows reference concrete test files |
| RED confirmed (tests exist) | ✅ | Referenced test files exist and contain the described assertions |
| GREEN confirmed (tests pass) | ✅ | Targeted delta suite passes now (`18/18`) |
| Triangulation adequate | ✅ | Evidence rows include multi-case checks for carousel layout and production-vs-preview fallback |
| Safety Net for modified files | ⚠️ | Apply progress reports baseline runs, but verify cannot replay pre-change state |

**TDD Compliance**: 5/6 checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 18 | 2 | node:test + assert |
| Integration | 0 | 0 | not used for this delta |
| E2E | 0 | 0 | Playwright available but not used for this delta |
| **Total** | **18** | **2** | |

---

### Changed File Coverage
Targeted coverage command:
`node --experimental-test-coverage --import ./tests/node-test-register.mjs --test tests/unit/lib/hero-promo-encargues.test.ts tests/unit/hero-promo-ui-contract.test.ts`

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `lib/marketing/hero-promo-runtime.ts` | 97.33% | 87.50% | 56-57, 69-70 | ✅ Excellent |
| `lib/catalog/selectors.ts` | 37.97% | 72.34% | Includes large untouched catalog paths; changed fallback helpers covered but broader selector file remains mostly unexecuted | ⚠️ Low |
| `components/marketing/hero-promo.tsx` | not instrumented | not instrumented | Client component not executed by targeted node tests | ⚠️ Low |
| `components/marketing/hero-promo.module.css` | not instrumented | not instrumented | CSS-only presentation not runtime-instrumented | ⚠️ Low |

**Average instrumented changed file coverage**: 67.65%  
**Coverage analysis conclusion**: helper/runtime coverage is strong enough to validate the selector split and carousel contract, but rendered UI behavior is still not directly executed.

---

### Assertion Quality

**Assertion quality**: ✅ All assertions verify real behavior

---

### Quality Metrics
**Linter**: ✅ No errors  
Command: `npx eslint components/marketing/hero-promo.tsx components/marketing/homepage.tsx app/encargue/page.tsx components/catalog/catalog-listing-page.tsx lib/catalog/selectors.ts lib/curations/hero-promo-products.ts lib/marketing/hero-promo-runtime.ts tests/unit/hero-promo-ui-contract.test.ts tests/unit/lib/hero-promo-encargues.test.ts`

**Type Checker**: ✅ No errors  
Command: `npm run typecheck`

---

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| FR-1 / FR-7 / FR-8 / NFR-3 | Scenario 1: homepage hero shows framed editorial composition with dominant carousel | `tests/unit/hero-promo-ui-contract.test.ts > hero render contract exposes side panel and single carousel composition` + `hero carousel layout keeps dominant center slide and real depth cues` | ⚠️ PARTIAL |
| FR-2 / FR-3 / FR-5 | Scenario 2: CTA enters promo flow with preset active on `/encargue` | `tests/unit/hero-promo-ui-contract.test.ts > hero CTA keeps semantic promo URL and preset activates promo banner payload` + `tests/unit/lib/hero-promo-encargues.test.ts > resolvePromoIdFromSearchParams prefers first promo value and keeps semantic id` + `getPromoBannerForCatalogListing exposes destination banner only for encargue promo preset` | ⚠️ PARTIAL |
| FR-5 | Scenario 3: promo banner rules visible on destination | `tests/unit/lib/hero-promo-encargues.test.ts > getPromoBannerForCatalogListing exposes destination banner only for encargue promo preset` | ⚠️ PARTIAL |
| FR-6 | Scenario 4: clicking product navigates to PDP `/producto/[slug]` | `tests/unit/hero-promo-ui-contract.test.ts > hero product click resolves to /producto/[slug] route` | ✅ COMPLIANT |
| FR-3 | Scenario 5: preset survives extra filters | `tests/unit/lib/hero-promo-encargues.test.ts > applyPromoPresetFilters injects multi-category ids while preserving explicit filters` | ✅ COMPLIANT |
| FR-7 / FR-8 / NFR-3 | Scenario 6: mobile experience keeps compact center-weighted carousel behavior | `tests/unit/hero-promo-ui-contract.test.ts > hero render contract keeps compact mobile carousel behavior` + `promo carousel layout caps per-view by available products` | ⚠️ PARTIAL |
| NFR-5 | Scenario 7: empty/missing curation falls back to default hero, not preview mode | `tests/unit/lib/hero-promo-encargues.test.ts > production empty curation falls back to default hero instead of mock promo rows` + `tests/unit/hero-promo-ui-contract.test.ts > homepage hero resolves promo variant only when promo rows are available` + `tests/unit/lib/hero-promo-encargues.test.ts > preview mode can still use explicit mock promo rows` | ✅ COMPLIANT |
| FR-7 / NFR-3 | Scenario 8: editorial side-panel sits beside carousel on desktop/tablet | `tests/unit/hero-promo-ui-contract.test.ts > hero render contract exposes side panel and single carousel composition` | ⚠️ PARTIAL |
| FR-8 | Scenario 9: actual Keen Slider Misc Carousel pattern with visible side slides and depth cues | `tests/unit/hero-promo-ui-contract.test.ts > hero carousel layout keeps dominant center slide and real depth cues` | ⚠️ PARTIAL |

**Compliance summary**: 3/9 scenarios compliant

Reasoning:
- The latest delta is behaviorally covered at helper/runtime-contract level for the new carousel core and production-vs-preview fallback split.
- The remaining non-compliant scenarios are not broken by evidence; they are only partially proven because tests stop before rendered component/page execution.

---

### Correctness (Static — Structural Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Actual Keen Misc Carousel core | ✅ Implemented | `HeroPromo` now uses a single `useKeenSlider` carousel over combined curated products instead of dual fake rails |
| Dominant center slide + visible side slides + depth cues | ✅ Implemented | Runtime contract uses `origin: center`, low `perView`, and depth plugin transforms (`translateZ`, `rotateY`, `scale`, opacity, z-index`) |
| Editorial side-panel beside carousel | ✅ Implemented | Desktop grid places the info panel beside the carousel, with tablet/mobile stacking |
| Production empty-curation fallback returns default hero | ✅ Implemented | `getHeroPromoProducts()` delegates to `selectHeroPromoProductsFromCuration()`, which returns disabled empty rows on invalid/missing curation |
| Preview/mock mode does not leak into production fallback | ✅ Implemented | Preview mocks are isolated behind `getHeroPromoPreviewProducts()` and not used by `getHeroPromoProducts()` |
| Responsive/mobile behavior | ⚠️ Partial | Breakpoint values and layout metadata exist, but no rendered viewport execution was run |
| Performance budget / LCP | ⚠️ Partial | No Lighthouse/manual proof yet |

---

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Single dominant Keen carousel as visual core | ✅ Yes | Implemented in `components/marketing/hero-promo.tsx` |
| Preview/mock mode isolated from production selector path | ✅ Yes | `getHeroPromoPreviewProducts()` is explicit and separate |
| Semantic promo URL resolved server-side | ✅ Yes | `/encargue?promo=combo-2da-30` remains server-driven via `resolvePromoIdFromSearchParams` + listing helpers |
| Empty curation falls back to default hero | ✅ Yes | Current selector/runtime path now matches design |
| Artifact wording aligned to single-carousel delta | ⚠️ Deviated | `proposal.md` and portions of `spec.md` still contain stale two-row/two-carousel language alongside the newer single-carousel delta wording |

---

### Issues Found

**CRITICAL** (must fix before archive):
None change-specific in the latest delta.

**WARNING** (should fix):
1. Several scenarios are still only partially proven because verification evidence stops at helper/runtime-contract tests and does not execute rendered `HomePage` / `HeroPromo` / `/encargue` page behavior.
2. Task 6.3 remains open: Lighthouse/LCP evidence for the `< 500ms` budget is still missing.
3. Full `npm run test:unit` remains red because of the known unrelated repo/runtime issue in `tests/unit/csrf-middleware.test.ts` (`next/server` resolution from `proxy.ts`).
4. OpenSpec artifacts still have stale pre-delta wording about dual rows/two carousels, which can confuse archive/compliance review.

**SUGGESTION** (nice to have):
1. Add rendered component or Playwright proof for homepage composition, destination banner visibility, and responsive side-panel behavior.
2. Reconcile proposal/spec wording so the approved single-carousel delta is unambiguous everywhere.

---

### Verdict
**PASS WITH WARNINGS**

The latest hero-promo delta is implemented as designed: real single Keen carousel core, center-weighted depth contract, editorial side-panel, and production-vs-preview fallback split are all present and targeted tests pass. Verification is not fully green overall because rendered integration evidence is still thin, Lighthouse proof is manual/pending, and the repo-wide unrelated `csrf-middleware` unit failure keeps the full suite red.
