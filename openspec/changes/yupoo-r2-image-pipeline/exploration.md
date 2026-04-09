## Exploration: yupoo-r2-image-pipeline

### Current State
The repo already has two relevant image paths, but they are split. The admin product form extracts Yupoo URLs through `app/api/admin/yupoo-extract/route.ts`, canonicalizes duplicate Yupoo variants in `lib/yupoo-core.ts`, reorders likely size-guide images with `lib/catalog/size-guides.ts`, and persists selected product images through `lib/catalog/repository.ts` + `lib/media/product-image-persistence.ts`. That persistence layer currently supports **Cloudinary or local files only**, stores one persisted image per logical photo, and derives delivery transforms at request time via `lib/media/product-images.ts` (`admin-preview`, `card`, `detail`, `lightbox`) instead of pre-generating stored variants.

Bulk import exists separately in `scripts/import-yupoo.ts`, but it bypasses the managed image pipeline: it scrapes album listings/pages, infers brand/category/sizes/variants, and inserts `products`, `product_images`, `product_sizes`, and `product_variants` directly with remote Yupoo URLs. Size-guide handling is already partially modeled: likely guide images are pushed to the end, `product_size_guides.source_image_url` preserves the source image reference, and storefront/admin helpers can hide that guide from the regular gallery. There is **no dedicated admin curation queue** today—only product-level draft/published/paused state and checkbox selection inside the single-product form.

The requested PDR was not present in the prompt or repository, so this exploration is based on the requested scope plus verified codebase structure.

### Affected Areas
- `scripts/import-yupoo.ts` — strongest scraper/foundation reuse for bulk and album parsing, but currently writes raw DB rows and skips managed storage.
- `lib/yupoo-core.ts` — reusable canonicalization/extraction core for single-product and bulk ingest normalization.
- `lib/catalog/size-guides.ts` — existing heuristics to preserve size-guide images and keep them out of the storefront gallery.
- `components/admin/product-form.tsx` — current single-product extraction/review UX; likely reuse point for fast per-product approval, but not enough for a queue-based curator UI.
- `app/admin/(protected)/products/page.tsx` — current admin list/state controls; likely extension point or reference for a new curation surface.
- `app/admin/actions.ts` — current product save/update entrypoint; useful for final product promotion, not for pre-product staging.
- `lib/catalog/repository.ts` — current product persistence and cleanup lifecycle; important reuse point, but today it deletes/reinserts images on edit and only knows `manual|yupoo` source plus `cloudinary|local` providers.
- `lib/media/product-image-persistence.ts` — current managed-image lifecycle; needs abstraction/generalization for R2 masters + pre-generated variants.
- `lib/media/product-images.ts` — current delivery-context mapping; useful source of target dimensions for six fixed variants.
- `lib/db/schema.ts` — current product/image schema lacks staging, review decisions, variant manifests, similarity metadata, and R2-specific storage fields.
- `lib/env/shared.ts`, `.env.example`, `.env.production.template` — current config patterns exist for Cloudinary only; no Cloudflare/R2 config pattern is present.
- `app/api/image-proxy/route.ts`, `lib/media/remote-image-proxy.ts` — current Yupoo preview/proxy path can still support admin curation before assets are copied into owned storage.

### Approaches
1. **Extend the existing product save flow directly** — Make `upsertProduct()` and `persistManagedProductImage()` write to R2, add variant generation there, and bolt approve/reject fields onto product images.
   - Pros: Reuses the current product form/save path heavily; quickest route for single-product import.
   - Cons: Poor fit for bulk curation. The current model assumes images already belong to a product, edits delete/reinsert image rows, and there is no staging layer for queue review, restore history, or future similarity suggestions.
   - Effort: Medium

2. **Introduce an ingestion/staging domain, then promote approved assets to catalog products** — Reuse Yupoo extraction/canonicalization and size-guide heuristics, but add import-job/import-item/image-candidate records, copy originals to R2, pre-generate six variants, and only sync approved selections into `products` / `product_images`.
   - Pros: Fits both bulk and single-product flows, supports approve/reject/restore cleanly, preserves auditability, and leaves room for future similar-image suggestions without polluting live catalog tables.
   - Cons: More schema and admin UI work up front; requires a promotion boundary between staging and catalog persistence.
   - Effort: High

3. **Keep current catalog tables as source of truth, add a lightweight image review table only** — Import directly into products as drafts, but track image-level review decisions in side tables.
   - Pros: Less invasive than full staging; keeps existing product CRUD largely intact.
   - Cons: Still mixes “candidate import” state with real catalog products, makes bulk retries/rollback messy, and leaves product edits coupled to image curation.
   - Effort: Medium

### Recommendation
Recommend **Approach 2: add a staging ingestion pipeline and promote approved assets into the catalog**.

Why:
- The current architecture already gives strong reuse at the edges: Yupoo extraction/canonicalization (`lib/yupoo-core.ts`), size-guide detection/preservation (`lib/catalog/size-guides.ts`), admin preview/proxying, and final catalog persistence (`lib/catalog/repository.ts`).
- The biggest missing capability is NOT scraping—it is **ownership + workflow**: R2 masters/variants, bulk queues, image review state, restore history, and future similarity signals do not fit the current `product_images` table or the current product form lifecycle.
- A staging boundary lets the team support **both** bulk and single-product import with the same import core while keeping catalog publish semantics simple.

Recommended implementation slices:
1. **Infrastructure slice** — introduce a storage abstraction that can write an original plus six fixed variants to R2; keep current delivery helpers but point them at stored variants/manifests instead of Cloudinary runtime transforms.
2. **Schema slice** — add staging tables for import jobs/items/image candidates + review decision state; extend live product image metadata only as needed for owned R2 assets and variant manifests.
3. **Single-product slice** — refactor the current Yupoo admin form flow to create/import one staging item and approve it into a product, preserving existing manual editing.
4. **Bulk slice** — move `scripts/import-yupoo.ts` onto the same shared import service instead of direct DB inserts.
5. **Curation slice** — add a very fast admin review UI focused on keyboard/mouse-efficient approve/reject/restore.
6. **Similarity slice (later)** — add perceptual hash/embedding metadata after the core import-review-storage pipeline is stable.

Key decisions to settle before implementation:
- **Storage contract**: store one original + six concrete variants in R2 vs. original-only plus on-demand transforms somewhere else. The request says pre-generate, so schema/URLs should assume concrete stored variants.
- **Schema shape**: variants as JSON manifest on each image row vs. normalized `product_image_variants` table. JSON is faster to ship initially; a child table is cleaner if querying/reporting by variant is needed.
- **Approval boundary**: whether approved images promote into existing `products` rows or create products from staging only after review.
- **Size-guide ownership**: whether guide images also live in R2 as a distinct role or remain only as preserved source references. I recommend storing them in R2 too, but marking them with a dedicated role so storefront filtering stays explicit.
- **Similarity strategy**: perceptual hash first (cheap, deterministic) vs. embeddings later (better semantics, more infra).

### Risks
- No verified PDR artifact was available, so acceptance details like exact variant dimensions, naming, retention, and curator UX shortcuts still need confirmation.
- The current product edit flow deletes and recreates `product_images`, which is risky for any future review history unless staging/promotion clearly owns lifecycle boundaries.
- Existing media helpers and types only recognize `cloudinary|local`; switching to R2 touches schema, env config, URL building, cleanup logic, and potentially admin/storefront rendering assumptions.
- Bulk importing directly from Yupoo remains brittle because scraping is HTML-best-effort and hotlinking behavior can change.
- Similar-image suggestions can easily balloon scope if attempted before the ingestion/review/storage model is stable.

### Ready for Proposal
Yes — propose an incremental change centered on: (1) storage abstraction for R2 originals + six variants, (2) staging/import-review schema, (3) shared Yupoo import service used by both `scripts/import-yupoo.ts` and admin single-product import, and (4) a dedicated admin curation UI. Defer similarity suggestions to a later slice unless the PDR makes them mandatory in V1.

### Concise Findings
- **Current architecture reuse opportunities**: strong reuse exists in `lib/yupoo-core.ts`, `scripts/import-yupoo.ts` parsing logic, size-guide helpers, admin Yupoo preview/proxying, and final catalog persistence.
- **Missing capabilities / gaps**: no R2 support, no pre-generated stored variants, no staging/review data model, no approve/reject/restore workflow, no similarity metadata, and bulk import bypasses the managed image pipeline.
- **Implementation phasing**: do infrastructure/storage first, then schema, then single-product staging approval, then bulk import unification, then fast curation UI, then similarity suggestions.
- **Decisions to settle**: exact six variant dimensions/names, staging-vs-live schema boundary, where variant manifests live, whether size-guide images get first-class asset roles in R2, and what “similar images” means technically for V1 vs later.
