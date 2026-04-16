# Tasks: Yupoo R2 Image Pipeline (Revised)

## Phase 1: Foundation — schema for direct URL storage and price validation

- [ ] 1.1 Update `lib/db/schema.ts` to add `source_url`, `is_size_guide`, and `price` fields to `import_images` and `import_items` tables for direct Yupoo URL storage and price tracking.
- [x] 1.2 Create `lib/imports/price-validator.ts` to validate price exists and is positive during ingestion, returning explicit skip reason when missing.
- [x] 1.3 Write unit tests for price validation: `tests/unit/lib/imports/price-validator.test.ts` asserting imports without price are rejected with clear reason.

## Phase 2: Ingestion — scrape and store direct URLs, skip R2 entirely

- [x] 2.1 Update `lib/imports/ingestion.ts` to scrape Yupoo URLs and store them in staging tables WITHOUT any R2 upload during staging.
- [x] 2.2 Update `lib/imports/heuristics.ts` to run after URL scrape, not after R2 download; mark candidates as `rejected` or `pending_review` based on heuristics.
- [x] 2.3 Add `tests/unit/lib/imports/ingestion.test.ts` asserting staging creates records with direct URLs only and never triggers R2 upload during ingestion.
- [x] 2.4 Update `app/api/admin/imports/route.ts` to include `source_url` in queue payload for review display.
- [x] 2.5 Update `lib/imports/promotion.ts` to skip products with fewer than 2 useful (active non-size-guide) images after filtering; mark as ineligible with explicit reason "insufficient useful images".
- [x] 2.6 Fix queue navigation bug: after reject or delete of current image, properly advance to next available image or handle empty state gracefully.

## Phase 2.5: Duplicate detection — skip already-existing products

- [x] 2.7 Add duplicate detection against catalog products in `lib/imports/ingestion.ts`: check if album source URL or product identity already exists in `products.source_url` or `products.album_reference` before creating staging records.
- [x] 2.8 Add duplicate detection against staging queue: check if album source URL or canonical key already exists in `import_items.source_url` or `import_items.album_reference` before creating new staging records.
- [x] 2.9 Implement skip-existing behavior: when a duplicate is detected, return early with `skipped: true` and `skipReason: "already-exists"` without creating any staging records; ensure this happens AFTER price validation but BEFORE DB insert.
- [x] 2.10 Add unit tests for duplicate detection: `tests/unit/lib/imports/duplicate-detection.test.ts` covering: (a) new album creates staging record, (b) existing catalog product triggers skip, (c) existing staging record triggers skip, (d) same album different source URL format still detects duplicate.

## Phase 3: Review UI — display direct Yupoo URLs, curate active/inactive

- [x] 3.1 Update `components/admin/imports-review-client.tsx` to render images from `source_url` (direct Yupoo URLs), not from R2 pre-uploaded assets.
- [x] 3.2 Add active/inactive toggle and isSizeGuide toggle to the review UI for each staged image.
- [x] 3.3 Update `components/admin/imports-review-client.tsx` to filter lower strip to show only active images.
- [x] 3.4 Add E2E tests in `tests/e2e/admin-imports.spec.ts` verifying review uses direct URLs, active toggle works, and price-missing imports are blocked.
- [x] 3.5 Add current image position indicator (e.g., "3 of 12") to show which image is currently being reviewed in the detail view.
- [x] 3.6 Add per-product promotion button in the queue list to promote individual products directly without going through bulk promote.
- [x] 3.7 Implement Yupoo small/preview asset proxy: create `app/api/admin/imports/proxy/route.ts` to fetch small preview versions via Yupoo's thumbnail endpoints and cache them to avoid loading full-resolution images during review.
- [x] 3.8 Ensure staging persists real Yupoo `previewUrl` + `sourceUrl` pairing from album scrape data so review uses actual preview assets instead of guessed URL conventions.
- [x] 3.9 Add 404 handling in `app/api/admin/imports/proxy/route.ts` to gracefully fall back to full-resolution URL when preview fails (e.g., image doesn't have small variant), preventing review 404s.

## Phase 4: Promotion — R2 upload + variant generation for curated images only

- [x] 4.1 Update `lib/imports/promotion.ts` to: (a) read active curated images from staging, (b) upload original to R2, (c) generate `admin-preview`, `thumb`, `cart-thumb`, `card`, `detail`, `lightbox` for active images only.
- [ ] 4.2 Update `lib/imports/promotion.ts` to track and expose media failure state when variant generation fails post-promotion.
- [x] 4.3 Add `tests/unit/lib/imports/promotion.test.ts` asserting promotion creates variants only for active curated images, skips rejected/inactive, and handles failures explicitly.
- [ ] 4.4 Update `lib/media/variants.ts` to support generation from URL (not just from existing R2 key) since we now download during promotion.

## Phase 5: Eligibility and bulk promote — enforce price + image requirements

- [x] 5.1 Update `lib/imports/promotion.ts` to enforce eligibility: must have price AND at least one active non-size-guide image.
- [ ] 5.2 Update `lib/imports/promotion.ts` to return per-item block reasons in bulk promotion results.
- [ ] 5.3 Add unit tests for eligibility logic: `tests/unit/lib/imports/eligibility.test.ts` covering price-missing, no-active-images, mixed batches.
- [ ] 5.4 Update `components/admin/imports-review-client.tsx` to show explicit block reasons when promotion is attempted on ineligible items.
- [x] 5.5 Add eligibility check: require at least 2 useful (active non-size-guide) images. Show block reason "insufficient useful images" in UI.

## Phase 6: Integration — wire promotion to catalog tables

- [x] 6.1 Update `lib/imports/promotion.ts` to write promoted products to `products` and `product_images` catalog tables with full variant manifest after R2 upload completes.
- [ ] 6.2 Update `app/api/admin/imports/route.ts` to handle POST promotion request with eligibility check and deferred media generation.
- [ ] 6.3 Add integration tests for full promotion flow: staging → review → promote → R2 upload → catalog write.

## Phase 7: Cleanup — remove old assumptions and dead code

- [x] 7.1 Remove any code in `lib/imports/ingestion.ts` that triggers R2 upload during staging.
- [x] 7.2 Remove unused preview-generation logic from staging phase.
- [x] 7.3 Verify all old "pre-uploaded preview asset" references in UI are replaced with direct URL rendering.
- [x] 7.4 Run full test suite to confirm no regressions.
- [x] 7.5 Add safe staging-only cleanup: implement delete-only cleanup for staging tables that only removes staged imports WITHOUT touching promoted catalog items. Add confirmation dialog in UI to prevent accidental deletion of in-progress work.
- [x] 7.6 Add "clear imports queue" action to `/admin/imports` that allows operators to batch-delete all staged items in one operation with explicit confirmation dialog.

## Phase 8: Verification — final regression testing

- [ ] 8.1 Run full test suite to confirm no regressions across all phases.
- [ ] 8.2 Manual verification: import a Yupoo URL and confirm preview loads without 404s.
- [ ] 8.3 Verify staging cleanup does not affect promoted products in catalog.

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 3 | Schema + price validation |
| 2 | 6 | Staging with direct URLs only |
| 2.5 | 4 | Duplicate detection against catalog + staging queue |
| 3 | 6 | Review UI uses direct URLs + preview URLs + 404 handling |
| 4 | 4 | Promotion → R2 + variants |
| 5 | 4 | Eligibility + block reasons |
| 6 | 3 | Catalog integration |
| 7 | 6 | Cleanup + verification |
| 8 | 3 | Final regression testing |
| **Total** | **37** | |

## Implementation Order

- Phase 1 first: new schema fields are required by everything else
- Phase 2 second: core ingestion logic without R2
- Phase 2.5 third: duplicate detection before any staging insert (against catalog and staging queue)
- Phase 4 fourth: promotion with R2 upload only happens after curation
- Phases 5-6: eligibility and catalog write build on promotion
- Phase 7 last: cleanup after everything works

This revised model inverts the original design: no R2 during staging → review uses direct URLs → R2 upload + variant generation only happens on promotion.
