# Design: Yupoo R2 Image Pipeline

## Technical Approach

We will introduce a "Staging Area" (Import Jobs & Items) to decouple Yupoo ingestion from the live catalog. Instead of directly writing to `products` and `productImages`, imports will create `import_items` and download Yupoo images to our owned Cloudflare R2 bucket. Images will be processed into an original and 6 variants. A fast admin curation UI will allow reviewing these staged items, approving or rejecting them. Approved items are then promoted to the live catalog, preserving size guide metadata, while Yupoo delivery at runtime is completely eliminated.

## Architecture Decisions

### Decision: Staging Schema vs Direct Draft Insertion

**Choice**: Introduce dedicated `import_jobs`, `import_items`, and `import_images` staging tables.
**Alternatives considered**: Continue inserting directly into `products` with `state='draft'`, and add flags for "needs review".
**Rationale**: Direct insertion pollutes the live catalog with poorly formatted or rejected scraped data. A dedicated staging schema allows us to store raw scraped payloads, handle brittle image processing asynchronously, and provide a focused, lightning-fast curation queue without bloating product tables with transient state.

### Decision: R2 Variant Storage & Access

**Choice**: Predictable key generation with a metadata manifest stored in a new JSONB column on the image tables.
**Alternatives considered**: On-the-fly variant generation at the edge (Cloudflare Image Resizing).
**Rationale**: The proposal requires "fixed variants in R2". Storing a `variants_manifest` JSONB column alongside the asset key allows us to pre-generate sizes at ingestion time, keeping delivery costs flat and decoupling from edge-resizing quotas. We will add a `variants_manifest` JSONB column to both `import_images` and `product_images`.

### Decision: Unified Ingestion Pipeline

**Choice**: Refactor `scripts/import-yupoo.ts` and the Admin single-import endpoint to use a shared `lib/imports/ingestion.ts` service.
**Alternatives considered**: Maintain two separate import paths.
**Rationale**: Having a single pipeline ensures both bulk CLI and admin UI imports follow the exact same scraping, R2 upload, and staging logic. The CLI script becomes just a runner that loops and calls the service.

## Data Flow

    [CLI Bulk] or [Admin Single] 
           │
           ▼
    [Ingestion Service] ─── (Scrape Yupoo) ───▶ [Yupoo]
           │
           ▼
    [R2 Storage Service] ── (Download & Resize) ──▶ [Cloudflare R2]
           │                                          (Original + Variants)
           ▼
    [Staging Tables] (import_jobs, import_items, import_images)
           │
           ▼
    [Admin Curation UI] (Approve/Reject/Restore)
           │
           ▼ (If Approved)
    [Promotion Service] ──▶ [Catalog Tables] (products, product_images, size_guides)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/db/schema.ts` | Modify | Add `import_jobs`, `import_items`, `import_images` tables. Add `variants_manifest` JSONB to `product_images`. |
| `lib/media/storage.ts` | Create | S3 client wrapper for Cloudflare R2 operations (put, get, delete). |
| `lib/media/variants.ts` | Create | Image processing logic (via `sharp` or similar) to generate the variants. |
| `lib/imports/ingestion.ts` | Create | Shared pipeline: scrape → download → process → insert to staging. |
| `lib/imports/promotion.ts` | Create | Logic to map an approved `import_item` to catalog tables. |
| `scripts/import-yupoo.ts` | Modify | Strip DB writes; call `lib/imports/ingestion.ts` instead. |
| `app/admin/(protected)/imports/page.tsx` | Create | Admin queue UI for reviewing staging items. |
| `app/api/admin/imports/route.ts` | Create | API for queue actions (approve, reject). |
| `lib/env/shared.ts` | Modify | Add R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`). |

## Interfaces / Contracts

```typescript
export type ImportJobStatus = "running" | "completed" | "failed";
export type ImportItemStatus = "pending" | "approved" | "rejected" | "restored" | "promoted";

// New JSONB manifest for images
export interface ImageVariantsManifest {
  original: string; // r2 key
  variants: {
    square?: string;
    small?: string;
    medium?: string;
    large?: string;
    xlarge?: string;
    blurhash?: string;
  };
  width: number;
  height: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Variant Generation | Mock R2, ensure variants are generated correctly for a sample image buffer. |
| Integration | Ingestion Pipeline | Run ingestion service with mocked fetch against a sample Yupoo HTML fixture, verify staging rows are created. |
| Integration | Promotion Logic | Promote a mock `import_item` and verify it correctly inserts into `products` and creates size guides. |
| E2E | Curation Queue | Admin approves an item -> verify item status changes to `promoted` and catalog receives data. |

## Migration / Rollout

1. **Schema Migration**: Add staging tables and new R2 columns to image tables.
2. **Env Setup**: Provision Cloudflare R2 bucket and add secrets to `.env`.
3. **Pipeline Deployment**: Ship the new ingestion service and admin queue. Hide behind an admin flag if necessary.
4. **Transition**: Existing catalog images (remote Yupoo URLs) continue to work because `product_images.source` and `url` remain intact. New images will use `provider: 'r2'` and rely on the manifest. No immediate data migration required for old images.

## Open Questions

- [ ] What specific dimensions are required for the 6 variants mentioned in the proposal?
- [ ] Should we backfill old Yupoo images to R2 in this phase, or leave it for a future slice? (Assuming future slice based on "Rollout: keep existing catalog reads working until promoted assets exist").
