# Proposal: Yupoo R2 Image Pipeline

## Intent
Replace Yupoo runtime image dependency with owned Cloudflare R2 assets plus pre-generated variants, while preserving size-guide behavior and unifying single-item + bulk Yupoo import into one curator-friendly pipeline.

## Problem
- Catalog/admin still depend on remote Yupoo URLs and Cloudinary/local-only persistence.
- Bulk import bypasses managed media flow and writes directly to catalog tables.
- There is no staging queue for fast approve/reject/restore before catalog promotion.

## Goals
- Own originals and fixed variants in R2.
- Reuse existing Yupoo parsing, size-guide heuristics, and catalog persistence boundaries.
- Support one shared ingestion path for individual and bulk import.
- Ship a minimal, very fast admin curation flow.

## Non-Goals
- Rebuilding full catalog/product editing UX.
- Solving advanced similar-image ranking in V1.
- Generalizing image ingestion for non-Yupoo sources in this change.

## Scope
### In Scope
- R2 storage abstraction for original + six stored variants.
- Staging/import-review domain for jobs, items, image candidates, and decisions.
- Promotion flow into existing catalog tables, including size-guide preservation.
- Shared import service used by admin single import and `scripts/import-yupoo.ts`.
- Lightweight curation queue with approve/reject/restore.

### Out of Scope
- Embedding-based similarity workflows.
- Storefront redesign beyond switching delivery to owned assets.

## Capabilities
### New Capabilities
- `yupoo-ingestion-pipeline`: stage, review, and promote Yupoo imports across bulk and single-item flows.
- `owned-product-media`: persist originals and fixed image variants in Cloudflare R2.
- `admin-image-curation`: fast queue-based approval workflow for imported image candidates.

### Modified Capabilities
- None.

## Approach
Use a staging boundary, not direct product writes. Reuse `lib/yupoo-core.ts`, `lib/catalog/size-guides.ts`, admin proxy preview, and `lib/catalog/repository.ts`; add a media storage layer that writes R2 originals/variants, keep live catalog tables as publish targets, and defer similar-image assistance to a non-blocking later slice.

## Phases / Slices
1. Storage + env support for R2 originals/variants.
2. Staging schema + promotion contract.
3. Single-item admin import through staging.
4. Bulk importer migration onto shared pipeline.
5. Fast curation queue.
6. Optional similarity assistance.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `lib/media/`, `lib/catalog/` | Modified | R2 persistence, variant manifests, promotion reuse |
| `lib/db/schema.ts` | Modified | staging/review + owned-media metadata |
| `app/api/admin/`, `components/admin/`, `app/admin/(protected)/` | Modified | single import + curation UI |
| `scripts/import-yupoo.ts` | Modified | bulk import onto shared pipeline |
| `lib/env/shared.ts`, `.env*` | Modified | Cloudflare/R2 config |

## Rollout / Rollback
Roll out in slices behind admin-only entrypoints; keep existing catalog reads working until promoted assets exist. Roll back by disabling new import/curation flows and retaining current catalog delivery paths while leaving staged data unused.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schema/workflow scope expands | Med | Strict phased delivery; similarity non-blocking |
| R2 migration breaks image URLs | Med | Keep existing reads until promotion path is verified |
| Yupoo scraping changes | High | Isolate scraper behind shared ingestion service |

## Success Criteria
- [ ] New imports no longer depend on Yupoo delivery at runtime.
- [ ] Single and bulk import share one ingestion pipeline.
- [ ] Size-guide images remain preserved and hidden from normal gallery rendering.
- [ ] Admin can approve/reject/restore candidates quickly before catalog promotion.
