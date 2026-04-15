# Design: Yupoo R2 Image Pipeline

## Technical Approach

We will drastically simplify the ingestion pipeline by deferring all media processing until the operator actually approves a product. 
During the initial scraping/ingestion phase, we will completely eliminate R2 uploads and variant generation. The `import_images` staging table will store both the original Yupoo source URLs and their real preview URLs (extracted during scraping, instead of blindly guessing `*_small.jpg`), and the `/admin/imports` curation UI will render these preview URLs directly via proxy to save bandwidth.

Furthermore, products that lack a price will be dropped immediately before reaching the staging area to prevent unpriceable junk from cluttering the queue. 

After an operator finishes curating and clicks "Promote", the promotion pipeline will download only the active, non-rejected original images, upload them to R2, and generate the required owned variants (`thumb`, `cart-thumb`, `card`, `detail`, `lightbox`, `admin-preview`) exactly once. 

We will also introduce a safe "Clear All Imports" action for operators. Since staging now avoids R2 writes, we can safely and cleanly truncate staging state by deleting `import_jobs` without risking orphaned cloud media.

## Architecture Decisions

### Decision: Zero-Media Ingestion
**Choice**: No R2 uploads or variant generation during `import_items` ingestion.
**Alternatives considered**: Continue generating `admin-preview` and `original` at ingestion time.
**Rationale**: Processing media for products that might be rejected wastes bandwidth and R2 storage. Deferring all R2 work until promotion ensures we only pay for what we keep.

### Decision: Missing-Price Pre-Rejection
**Choice**: Immediately drop products missing a price before inserting into `import_items`.
**Alternatives considered**: Stage them and flag them with an error in the curation UI.
**Rationale**: Products without prices cannot be sold. Dropping them early keeps the curation queue focused on actionable items.

### Decision: Minimum Image Requirement
**Choice**: Require at least 2 active (useful) images for promotion eligibility.
**Alternatives considered**: Allow single-image products.
**Rationale**: A catalog listing requires multiple angles to be effective. Pre-filtering guarantees products have a sufficient gallery.

### Decision: Explicit Preview URLs from Scraping
**Choice**: Extract and store the real Yupoo preview URL (`preview_url`) during scraping alongside the original `source_url`, rather than guessing paths via regex (`_small.jpg`).
**Alternatives considered**: Mutate the `source_url` at proxy time.
**Rationale**: Yupoo's URL structure can change. Capturing the real preview URL from the DOM (e.g., from `src` vs `data-origin-src`) ensures accurate curation rendering without brittle path manipulation.

### Decision: Full Variant Generation at Promotion
**Choice**: During promotion, we download the original source URL, upload the `original` to R2, and generate all catalog variants.
**Alternatives considered**: Generate some variants at the edge.
**Rationale**: Generating all variants at promotion time guarantees the catalog has everything it needs to serve traffic quickly.

### Decision: Safe Clear Imports Action
**Choice**: Implement a bulk "Clear All Imports" action that issues a SQL `DELETE FROM import_jobs` (which cascades to `import_items` and `import_images`).
**Alternatives considered**: Soft-deleting or tracking orphaned objects.
**Rationale**: Because the new pipeline strictly avoids R2 uploads during staging, clearing imports is natively safe. Deleting from DB staging tables cleanly wipes the queue without leaving any external artifacts.

## Data Flow

    [Ingestion Service] ─── (Scrape Yupoo: Extract BOTH original & preview URLs)
           │
           ├─▶ (Missing price? Drop product)
           ├─▶ (Apply heuristics/dedupe, drop junk images)
           │
           ▼
    [Staging Tables] (import_images stores source_url AND preview_url)
           │
           ▼
    [Admin Curation UI] (Renders proxy URLs mapped to stored preview_url)
           │ (Handles single-item or bulk promote, tracks carousel position)
           │ (Allows Operator to "Clear All" -> safely deletes import_jobs)
           ▼
    [Promotion Service] ── (Download active original images) ──▶ [Cloudflare R2]
           │               (Generate all variants)
           ▼
    [Catalog Tables] (products, product_images with full R2 manifest)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/db/schema.ts` | Modify | Add `previewUrl` to `import_images` table schema. |
| `lib/yupoo-core.ts` | Modify | Update `extractYupooImages` to return an object with both `url` (original) and `previewUrl` instead of just an array of strings. |
| `lib/imports/ingestion.ts` | Modify | Update ingestion to persist the extracted `previewUrl`. Add check to drop products missing a price. |
| `lib/imports/promotion.ts` | Modify | Download source Yupoo image, upload `original` to R2, generate all variants. Enforce 2-image minimum. |
| `components/admin/imports-review-client.tsx` | Modify | Add single-item promote button and "Clear All Imports" button. Add current-position indicator to carousel. Ensure queue-state stability when last image is rejected (index fallback). |
| `app/api/admin/imports/proxy/route.ts` | Modify | Remove regex path mutation; proxy the stored `previewUrl` directly. |
| `app/api/admin/imports/clear/route.ts` | Create | New route handler to safely `DELETE FROM import_jobs` based on user action. |

## Interfaces / Contracts

```typescript
export interface ImportImageCandidate {
  url: string;        // The original high-res image URL
  previewUrl: string; // The smaller preview image URL from Yupoo
}

export interface ImportItemMetadata {
  name: string;
  price?: number; // Must be present to reach staging
  brand?: string;
  activeCount: number; // Must be >= 2 for promotion
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Ingestion | Verify missing-price products are discarded before DB insert. Verify `previewUrl` is stored. |
| Unit | Promotion | Verify promotion downloads source, uploads to R2, generates variants, and enforces 2-image minimum. |
| E2E | Curation UI | Verify carousel handles last-image rejection without crashing and renders single promote action. Verify "Clear All" correctly purges the queue. |
| Integration | Admin API | Verify `/api/admin/imports/clear` safely removes staging records. |

## Migration / Rollout

No immediate data migration required. Old staged items with existing previews can still be processed (they might lack `previewUrl`, so we fallback to original or derived for backwards compatibility if needed during rollout).

## Open Questions

- None