# Verification Report

**Change**: refresh-homepage-hero  
**Version**: N/A  
**Mode**: Strict TDD

---

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 24 |
| Tasks complete | 20 |
| Tasks incomplete | 4 |

Incomplete tasks:
- [ ] 5.2 Run dev server and visually verify hero layout on desktop breakpoint
- [ ] 5.3 Run dev server and visually verify hero layout on mobile breakpoint
- [ ] 5.4 Verify carousel drag interaction smooth on desktop
- [ ] 5.5 No console errors on hero mount

---

### Build & Tests Execution

**Build**: ➖ Skipped
```text
Skipped to respect project rule in AGENTS.md: "Never build after changes."
```

**Type Checker**: ❌ Failed
```text
components/marketing/hero-promo-shader-background.tsx(30,13): error TS2322: Property 'axesHelper' does not exist on ShaderGradient props.
components/marketing/homepage.tsx(130,25): error TS2322: Property 'className' does not exist on AuroraBackgroundProps.
```

**Tests**: ❌ 21 passed / ❌ 1 failed / ⚠️ 0 skipped
```text
PASS  node --import ./tests/node-test-register.mjs --test tests/unit/hero-promo-ui-contract.test.ts  (8/8)
PASS  node --import ./tests/node-test-register.mjs --test tests/unit/lib/hero-promo-encargues.test.ts  (11/11)
FAIL  node --import ./tests/node-test-register.mjs --test tests/unit/hero-promo-shader-gradient-contract.test.ts  (2/3)

Failing test:
- tests/unit/hero-promo-shader-gradient-contract.test.ts > hero shader background wrapper keeps the exact configured shader url and lightweight layering
  Expected outdated ShaderGradient customize URL regex that is not present in current shader source.
```

**Coverage**: 35.31% total / threshold: N/A → ➖ Informational only

---

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Found in `apply-progress.md` |
| All tasks have tests | ⚠️ | 3/4 evidence rows map to executable tests; shader-preservation row relies on static audit, not a dedicated passing test |
| RED confirmed (tests exist) | ✅ | `tests/unit/hero-promo-ui-contract.test.ts` exists and contains the reported assertions |
| GREEN confirmed (tests pass) | ⚠️ | Hero contract test file passes now, but not every spec scenario has runtime proof |
| Triangulation adequate | ⚠️ | Multi-path assertions exist for contract/layout, but behavior scenarios still lack runtime variance |
| Safety Net for modified files | ✅ | 2/2 modified-task rows reported baseline execution before edits |

**TDD Compliance**: 3/6 checks passed cleanly

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 8 | 1 | node:test + assert |
| Integration | 0 | 0 | not installed |
| E2E | 0 | 0 | Playwright available, but no hero test covers this change |
| **Total** | **8** | **1** | |

---

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `lib/marketing/hero-promo-runtime.ts` | 98.67% | 91.30% | 118-119, 131-132 | ✅ Excellent |
| `components/marketing/hero-promo.tsx` | 0% (not instrumented) | — | Entire file unexecuted by tests | ⚠️ Low |
| `components/marketing/hero-promo.module.css` | — | — | CSS not covered by Node coverage; only source-regex checks exist | ➖ Not coverable |

**Average changed file coverage**: 49.34% across executable source files counted above

---

### Assertion Quality
| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `tests/unit/hero-promo-ui-contract.test.ts` | 232 | `assert.match(heroSource, /<div className=\{styles\.darkeningOverlay\} \/>/)` | Source-regex assertion does not render or execute component behavior | CRITICAL |
| `tests/unit/hero-promo-ui-contract.test.ts` | 235 | `assert.match(cssSource, /\.darkeningOverlay\s*\{/)` | Static CSS-source assertion proves implementation detail, not runtime behavior | CRITICAL |

**Assertion quality**: 2 CRITICAL, 0 WARNING

---

### Quality Metrics
**Linter**: ⚠️ 1 error, 2 warnings on changed hero files (`react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`, CSS file ignored by current ESLint config)  
**Type Checker**: ❌ 1 changed-area error in `components/marketing/hero-promo-shader-background.tsx` and 1 unrelated/adjacent error in `components/marketing/homepage.tsx`

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| R1-R4, R6, R10 | Scenario 1: Desktop User Views Refreshed Hero | `tests/unit/hero-promo-ui-contract.test.ts > hero render contract enforces full first-screen composition...` + `hero promo source applies external darkening layer...` | ⚠️ PARTIAL |
| R5, R10 | Scenario 2: Mobile User Views Refreshed Hero | `tests/unit/hero-promo-ui-contract.test.ts > hero render contract keeps compact mobile carousel behavior` | ⚠️ PARTIAL |
| R3, R7 | Scenario 3: User Interacts with Carousel | `tests/unit/hero-promo-ui-contract.test.ts > hero carousel layout keeps mechanics...` + `promo carousel layout caps per-view...` | ⚠️ PARTIAL |
| R2, R8 | Scenario 4: Shader Background Loads | (no passing runtime test; unrelated shader contract test currently fails) | ❌ UNTESTED |

**Compliance summary**: 0/4 scenarios compliant

---

### Correctness (Static — Structural Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| R1 Dominant Commercial Headline Hierarchy | ⚠️ Partial | Headline is centered, largest, and CTA/proof ordering is updated, but runtime contract uses `COMBINALOS COMO QUIERAS` instead of the spec's `COMBINALOS<br/>COMO QUIERAS`. |
| R2 External Background Darkening | ⚠️ Partial | `hero-promo.tsx` adds `styles.darkeningOverlay` and CSS uses static gradients only, but shader preservation cannot be proven byte-for-byte from git because the shader file is untracked. |
| R3 Enlarged Dual-Carousel Presentation | ✅ Implemented | Runtime enlarges carousel dimensions to 420/300/280, markup adds labels and edge fades, and 3D mechanics remain in `getHeroPromoCarouselLayout()`. |
| R4 Transparent Text Presentation | ✅ Implemented | `.textContent` replaces boxed panel, `.infoPanel::before` is absent, and no heavy panel border/shadow styling remains. |
| R5 Mobile-Specific Message-First Composition | ✅ Implemented | Mobile order metadata is `brand → promo → headline → cta → proof → disclosure → legal → carousels`, and CSS reorders CTA/supporting copy ahead of carousels under 768px. |
| R6 CTA Hierarchy Preservation | ⚠️ Partial | Primary CTA remains first with solid style and secondary CTA remains ghost/subordinate, but secondary CTA tracking attributes are not evident and the primary CTA still includes a hardcoded aria-label string. |
| R7 Performance Expectations | ❌ Missing evidence | No runtime performance, CLS, console, or device verification was executed in this verify pass. |
| R8 Shader Preservation | ⚠️ Partial | Source still mounts shader behind content and overlay is external, but byte-for-byte preservation is not verifiable from VCS in the current working tree. |
| R9 Contract Consistency | ⚠️ Partial | Most copy/metadata now come from `hero-promo-runtime.ts`, but `hero-promo.tsx` still hardcodes `aria-label="Armá tu combo en encargues"`. |
| R10 Responsive Behavior | ⚠️ Partial | Desktop/mobile breakpoints and layout metadata exist, but no executed UI test proves rendered behavior at ≥1024px / 768–1023px / <768px. |

---

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| External shader darkening via parent/sibling layer | ✅ Yes | `HeroPromoShaderBackground` remains a separate child and `darkeningOverlay` is a sibling overlay in `hero-promo.tsx`. |
| Remove card metaphor and float text on background | ✅ Yes | `.textContent` is transparent and `.infoPanel::before` is removed. |
| Enlarge carousel through runtime math, not CSS scale | ✅ Yes | `getHeroPromoCarouselLayout()` now carries the larger dimensions directly. |
| File changes match design table | ⚠️ Deviated | Design/apply artifacts do not list `components/marketing/homepage.tsx`, yet typecheck failure shows adjacent integration breakage there. |

---

### Issues Found

**CRITICAL** (must fix before archive):
- 4 verification tasks remain incomplete (`5.2`–`5.5`), so desktop/mobile visuals, drag smoothness, and console cleanliness are still unverified.
- 0/4 spec scenarios are behaviorally compliant under Strict TDD because no scenario has a passing runtime test that proves the full behavior.
- `tests/unit/hero-promo-ui-contract.test.ts` relies on source-regex assertions for UI proof, which do not execute rendered behavior.
- Type checking fails in `components/marketing/hero-promo-shader-background.tsx` and `components/marketing/homepage.tsx`.
- Shader preservation cannot be proven byte-for-byte from git because `components/marketing/hero-promo-shader-background.tsx` is untracked in the current working tree.

**WARNING** (should fix):
- Runtime contract headline does not match the spec's explicit `<br/>` contract value.
- `hero-promo.tsx` still contains hardcoded CTA aria-label copy instead of sourcing all copy metadata from `hero-promo-runtime.ts`.
- Secondary CTA tracking attributes are not evident in the refreshed markup.
- Coverage does not exercise `components/marketing/hero-promo.tsx`; only the runtime helper is meaningfully covered.
- ESLint reports `react-hooks/set-state-in-effect` and `react-hooks/exhaustive-deps` issues in `components/marketing/hero-promo.tsx`.
- `tests/unit/hero-promo-shader-gradient-contract.test.ts` still fails with an outdated shader URL expectation; this appears unrelated to this specific change but remains a repo failure.

**SUGGESTION** (nice to have):
- Add Playwright or rendered component tests that prove desktop/mobile hierarchy, overlay layering, and carousel interaction at runtime.
- Add a preservation guard based on a committed baseline or hash for `hero-promo-shader-background.tsx` so future verify passes can prove no edits occurred.

---

### Verdict
FAIL

Implementation is structurally close to the spec, but Strict TDD verification fails because behavior-level proof is missing, manual verification tasks remain open, and typecheck is currently red.
