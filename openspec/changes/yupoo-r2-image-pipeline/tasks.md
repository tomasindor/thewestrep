# Tasks: Yupoo R2 Image Pipeline

## Phase 1: Infrastructure / Foundation
- [ ] 1.1 Add R2 credentials to `lib/env/shared.ts`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- [ ] 1.2 Create `lib/media/storage.ts` with R2 client wrapper (put, get, delete, list operations)
- [ ] 1.3 Create `lib/media/variants.ts` with variant generation using sharp (thumb, cart-thumb, card, detail, lightbox, admin-preview)
- [ ] 1.4 Define `ImageVariantsManifest` interface in `lib/types/media.ts`

## Phase 2: Schema / Data Layer
- [ ] 2.1 Add `import_jobs` table to `lib/db/schema.ts` (id, status, source, sourceReference, createdAt, updatedAt)
- [ ] 2.2 Add `import_items` table to `lib/db/schema.ts` (id, importJobId, status, productData, createdAt, updatedAt)
- [ ] 2.3 Add `import_images` table to `lib/db/schema.ts` (id, importItemId, originalUrl, r2Key, variantsManifest JSONB, order, reviewState, isSizeGuide, similarityMetadata, createdAt, updatedAt)
- [ ] 2.4 Add `variants_manifest` JSONB column to `product_images` table for catalog images
- [ ] 2.5 Run database migration to create staging tables

## Phase 3: Core Implementation - Ingestion
- [ ] 3.1 Create `lib/imports/ingestion.ts` shared service with: parseYupooUrl, downloadImage, generateVariants, storeInR2, createStagingRecords
- [ ] 3.2 Create `lib/imports/promotion.ts` with: promoteImportItem, copyToProducts, createProductImages, preserveSizeGuides, updateProductImageUrls
- [ ] 3.3 Modify `scripts/import-yupoo.ts` to call `lib/imports/ingestion.ts` instead of direct DB writes
- [ ] 3.4 Add single-item import endpoint in admin that calls `lib/imports/ingestion.ts`

## Phase 4: Admin Curation UI
- [ ] 4.1 Create `app/admin/(protected)/imports/page.tsx` with: image grid, state indicators (pending/approved/rejected), approve/reject buttons
- [ ] 4.2 Add keyboard navigation (arrow keys) for rapid image review
- [ ] 4.3 Implement Ctrl+Z undo for last discard action (store action history in React state)
- [ ] 4.4 Create `app/api/admin/imports/route.ts` with POST handler for approve/reject/restore actions
- [ ] 4.5 Implement automatic cover selection: first approved image becomes product cover
- [ ] 4.6 Add cover reflow when current cover is rejected

## Phase 5: Promotion Logic
- [ ] 5.1 Add promotion action to admin UI (button to promote approved items to catalog)
- [ ] 5.2 Implement backward compatibility: maintain existing catalog reads until promoted
- [ ] 5.3 Add provider field to distinguish R2 vs Yupoo source images
- [ ] 5.4 Ensure size-guide metadata preserved during promotion (hidden from storefront gallery)

## Phase 6: Similar Image Metadata (Plumbing)
- [ ] 6.1 Add similarity detection hook during import (perceptual hash or exact match on dimensions)
- [ ] 6.2 Store similarity metadata in import_images.similarityMetadata JSONB
- [ ] 6.3 Create admin-only similar-image suggestions panel (non-blocking, advisory only)
- [ ] 6.4 Prevent automatic deletion of similar images

## Phase 7: Testing & Verification
- [ ] 7.1 Write unit tests for `lib/media/storage.ts` (mock R2, verify put/get/delete)
- [ ] 7.2 Write unit tests for `lib/media/variants.ts` (verify 6 variants generated from buffer)
- [ ] 7.3 Write integration tests for `lib/imports/ingestion.ts` (mock fetch to Yupoo fixture, verify staging rows)
- [ ] 7.4 Write integration tests for `lib/imports/promotion.ts` (verify correct inserts to products/product_images)
- [ ] 7.5 Write E2E test: admin approves item -> verify promoted to catalog with R2 URLs
- [ ] 7.6 Write test: size-guide images hidden from storefront but visible in admin
- [ ] 7.7 Verify backward compatibility: existing catalog images still work after migration