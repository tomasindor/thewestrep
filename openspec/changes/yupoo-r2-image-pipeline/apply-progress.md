# Implementation Progress

**Change**: yupoo-r2-image-pipeline  
**Batch**: Phase 1 + Phase 2 + Phase 3 (core ingestion foundation + promotion/admin single-item follow-up) cumulative state  
**Mode**: Strict TDD

## Completed Tasks
- [x] 1.1 Add R2 credentials plumbing to `lib/env/shared.ts` (`getR2Config`, `isR2Configured`) and re-export through `lib/env.ts`
- [x] 1.2 Create `lib/media/storage.ts` with R2 storage abstraction (put/get/delete/list with pagination)
- [x] 1.3 Create `lib/media/variants.ts` with six fixed Sharp variants (thumb, cart-thumb, card, detail, lightbox, admin-preview)
- [x] 1.4 Define `ImageVariantsManifest` in `lib/types/media.ts`
- [x] 2.1 Add `import_jobs` table and enum foundation in `lib/db/schema.ts`
- [x] 2.2 Add `import_items` table with status + product payload in `lib/db/schema.ts`
- [x] 2.3 Add `import_images` table with source URL, R2 key, variants manifest, review state, ordering, size-guide flag, similarity metadata
- [x] 2.4 Add `variants_manifest` JSONB column support on `product_images` plus compatibility/repository read support
- [x] 2.5 Run migration command to apply Phase 2 staging schema changes
- [x] 3.1 Create `lib/imports/ingestion.ts` shared ingestion service with parse/download/variant/write/staging primitives
- [x] 3.2 Create `lib/imports/promotion.ts` minimal promotion foundation to move approved staged data into catalog draft tables safely
- [x] 3.3 Modify `scripts/import-yupoo.ts` to route bulk imports through the shared ingestion service instead of direct catalog writes
- [x] 3.4 Add minimal admin single-item import endpoint that triggers shared ingestion for one Yupoo URL

## Files Changed (Phase 3 batch)
| File | Action | What Was Done |
|------|--------|---------------|
| `tests/unit/import-ingestion.test.ts` | Created | Added strict-TDD unit coverage for URL parsing, candidate canonicalization/dedupe, staging row creation, R2 write planning, scraper fallback, and bulk-script payload mapping |
| `lib/imports/ingestion.ts` | Created | Implemented shared ingestion service for bulk/single flows with reusable Yupoo extraction/canonicalization + size-guide heuristics, image download, variant generation, R2 write preparation, and staging inserts |
| `scripts/import-yupoo.ts` | Modified | Rewired bulk album processing to call `ingestYupooSource` via `buildBulkIngestionInput` and persist import staging payloads instead of writing `products/product_images` directly |
| `tests/unit/import-promotion.test.ts` | Created | Added strict-TDD unit coverage for promotion behavior: approved-only guardrails, draft-only upsert policy, image insertion with owned asset pointers, and size-guide metadata preservation |
| `tests/unit/admin-single-import-route.test.ts` | Created | Added strict-TDD unit coverage for minimal admin single-item entrypoint behavior (validation, successful ingestion response, ingestion failure response) |
| `lib/imports/promotion.ts` | Created | Implemented promotion foundation service (`promoteImportItem`, `copyToProducts`, `createProductImages`, `preserveSizeGuides`, `updateProductImageUrls`) with DB adapter and conservative draft-only update semantics |
| `app/api/admin/imports/single/route.ts` | Created | Implemented admin-scoped single-item import route handler that validates URL, enforces admin session, calls shared ingestion service, and returns actionable JSON payload |
| `openspec/changes/yupoo-r2-image-pipeline/tasks.md` | Modified | Marked 3.1/3.3/3.2/3.4 as complete across cumulative Phase 3 progress |
| `openspec/changes/yupoo-r2-image-pipeline/apply-progress.md` | Modified | Merged prior cumulative progress with new Phase 3 strict-TDD evidence |

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/unit/env-r2-config.test.ts` | Unit | ✅ `tests/unit/mercadopago-checkout.test.ts` 2/2 | ✅ Written | ✅ Passed | ✅ 2 cases | ✅ Clean |
| 1.2 | `tests/unit/media-storage.test.ts` | Unit | N/A (new file) | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.3 | `tests/unit/media-variants.test.ts` | Unit | N/A (new file) | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.4 | `tests/unit/media-variants.test.ts` | Unit | N/A (new file) | ✅ Written | ✅ Passed | ✅ 2 cases | ➖ None needed |
| 2.1 | `tests/unit/import-schema-foundation.test.ts` | Unit | ➖ No pre-existing targeted tests for schema-only area | ✅ Written (missing exports) | ✅ Passed | ✅ Covers jobs/items/images staging table paths | ➖ None needed |
| 2.2 | `tests/unit/import-schema-foundation.test.ts` | Unit | ➖ No pre-existing targeted tests for schema-only area | ✅ Written (missing exports) | ✅ Passed | ✅ Status + payload cases covered via enum/table assertions | ➖ None needed |
| 2.3 | `tests/unit/import-schema-foundation.test.ts` | Unit | ➖ No pre-existing targeted tests for schema-only area | ✅ Written (missing exports) | ✅ Passed | ✅ Metadata columns (yupoo source, ordering, review, size-guide, similarity) asserted | ➖ None needed |
| 2.4 | `tests/unit/import-schema-foundation.test.ts` | Unit | ➖ No pre-existing targeted tests for schema-only area | ✅ Written (`hasVariantsManifest` contract absent) | ✅ Passed | ✅ 2 cases (warning when missing, no warning when present) | ➖ None needed |
| 2.5 | N/A (migration command) | Infra | N/A | ➖ Structural task | ✅ `npx drizzle-kit push --force` applied | Triangulation skipped: migration execution task (single command path) | ➖ None needed |
| 3.1 | `tests/unit/import-ingestion.test.ts` | Unit | N/A (new file) | ✅ Written (module + exports initially missing) | ✅ Passed | ✅ 4 cases (parse guardrails, dedupe/order + staging persistence, scraper fallback, bulk payload mapping) | ✅ Clean |
| 3.2 | `tests/unit/import-promotion.test.ts` | Unit | N/A (new file) | ✅ Written (promotion module missing) | ✅ Passed | ✅ 2 scenarios (create path + draft update/non-draft rejection) | ✅ Clean |
| 3.3 | `tests/unit/import-ingestion.test.ts` | Unit | ➖ No pre-existing targeted tests for legacy script bridge | ✅ Written (`buildBulkIngestionInput` export missing) | ✅ Passed | ✅ 2 paths (bulk payload mapping + bulk ingestion execution path) | ✅ Clean |
| 3.4 | `tests/unit/admin-single-import-route.test.ts` | Unit | N/A (new file) | ✅ Written (route module missing) | ✅ Passed | ✅ 2 scenarios (validation/success + error handling) | ✅ Clean |

## Test Summary (Phase 3 batch)
- **RED commands**:
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/import-ingestion.test.ts"` (failed: missing `lib/imports/ingestion`)
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/import-ingestion.test.ts"` (failed: missing `buildBulkIngestionInput` export)
- **GREEN command**:
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/import-ingestion.test.ts"`
- **Result**: 4 passed / 0 failed
- **Layers used**: Unit

## Test Summary (Phase 3 follow-up batch)
- **RED commands**:
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/import-promotion.test.ts"` (failed: missing `lib/imports/promotion`)
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/admin-single-import-route.test.ts"` (failed: missing `app/api/admin/imports/single/route`)
- **GREEN commands**:
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/import-promotion.test.ts"`
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/admin-single-import-route.test.ts"`
  - `node --import ./tests/node-test-register.mjs --test "tests/unit/import-promotion.test.ts" "tests/unit/admin-single-import-route.test.ts"`
- **Result**: 4 passed / 0 failed
- **Layers used**: Unit

## Issues / Deviations
- `design.md` still references stale variant naming (`square/small/...`) while implementation/schema use fixed variant names from the active spec.
- `scripts/import-yupoo.ts` now writes to staging via shared ingestion; this follow-up adds a minimal promotion foundation service but does not yet wire full admin promotion UI/actions.
- No concrete R2 SDK client has been introduced in this batch; shared ingestion persists prepared R2 writes through dependency injection and currently relies on caller-provided `storeInR2` when actual upload is required.

## Remaining
- [ ] Phase 4: admin curation UI
- [ ] Phase 5: promotion logic and backward compatibility in runtime reads
- [ ] Phase 6: similarity assistance plumbing
- [ ] Phase 7: integration/E2E verification

**Status**: 13/34 tasks complete cumulatively. Phase 3 ingestion slice baseline (`3.1-3.4`) is implemented and ready for verify, with broader UI/promotion UX phases still pending.
