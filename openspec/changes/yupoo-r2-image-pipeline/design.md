# Design: Yupoo R2 Image Pipeline

## Technical Approach

We will drastically simplify the ingestion pipeline by deferring all media processing until the operator actually approves a product. 
During the initial scraping/ingestion phase, we will completely eliminate R2 uploads and variant generation. The `import_images` staging table will store both the original Yupoo source URLs and their real preview URLs (extracted during scraping, instead of blindly guessing `*_small.jpg`), and the `/admin/imports` curation UI will render these preview URLs directly via proxy to save bandwidth.

Products that lack a price will be dropped immediately before reaching the staging area to prevent unpriceable junk from cluttering the queue. Before processing any Yupoo source URL, the pipeline will canonicalize it to form a stable Yupoo identity (stripping tracking or display query parameters and hashes). It will then skip the item entirely if this identity already exists as a catalog product or an active staged import.

**UX/Behavior Update**: The imports queue will use a compact navigation model (pagination or bounded batches) to handle large queues without infinite scrolling. When an item is promoted, it will be optimistically removed from the active queue immediately, with promotion continuing asynchronously in the background. If promotion fails, the item returns to the queue with a visible `media_failed` error state. Items being promoted will use a distinct `promoting` state to prevent double-promotion and track progress.

After an operator finishes curating and clicks "Promote", the asynchronous promotion pipeline will download only the active, non-rejected original images, upload them to R2, and generate the required owned variants (`thumb`, `cart-thumb`, `card`, `detail`, `lightbox`, `admin-preview`) exactly once.

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

### Decision: Duplicate Avoidance via Stable Yupoo Identity
**Choice**: Canonicalize the `sourceUrl` during ingestion to check against `products.sourceUrl` and `importJobs.sourceReference`, skipping ingestion if a match is found.
**Alternatives considered**: Allowing duplicates in staging and flagging them in the UI; or attempting to merge updates immediately.
**Rationale**: Silently skipping duplicates saves DB/processing overhead and prevents operators from wasting time curating already-imported items. We defer the complexity of a "modified item" feature, focusing strictly on skip-existing behavior for now.

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

### Decision: Compact Queue Navigation
**Choice**: Implement a paginated or bounded batch navigation model for the imports queue instead of an infinite scroll list.
**Alternatives considered**: Infinite scrolling with virtual scrolling; fixed-height scrollable container.
**Rationale**: Keeps the UI focused and fast for large queues. Infinite scrolling becomes unwieldy with 50+ items and makes it hard to track review progress. A compact model ensures operators can navigate efficiently without losing context.

### Decision: Optimistic Removal and Background Promotion
**Choice**: Remove items from the UI queue optimistically upon promotion. The backend transitions the item to `promoting` and spawns an async background task to handle R2/variants.
**Alternatives considered**: Wait for all variants to generate before removing from UI.
**Rationale**: Keeps the queue focused on work that needs attention and prevents HTTP timeouts on large image variants. Operators can blast through curation instantly.

### Decision: Error Recovery (Return-to-Queue)
**Choice**: If the background task fails, the item's state transitions to `media_failed`. The UI will fetch and display these items in the queue with a clear error indication.
**Alternatives considered**: Move failed items to a separate "failed" dashboard.
**Rationale**: Returning to the queue keeps all staging work in one place and provides a straightforward way for the operator to retry or reject the item without context switching.

## Data Flow

    [Ingestion Service] ─── (Canonicalize Yupoo source URL)
           │
           ├─▶ (Already exists in catalog/staging? Skip product)
           ├─▶ (Scrape Yupoo: Extract BOTH original & preview URLs)
           ├─▶ (Missing price? Drop product)
           ├─▶ (Apply heuristics/dedupe, drop junk images)
           │
           ▼
    [Staging Tables] (import_images stores source_url AND preview_url)
           │
           ▼
    [Admin Curation UI] (Renders proxy URLs, uses compact queue navigation)
           │ (Operator clicks "Promote")
           ├─▶ [UI State] (Optimistically removes item from active view)
           ▼
    [Promotion API] ──▶ (Sets item status to `promoting`, returns 200 OK)
           │
           ▼
    [Background Promotion Worker]
           │ 
           ├─▶ [Success] ──▶ (Download source, R2, Variants) ──▶ (Set `promoted`, create Catalog Tables)
           │
           └─▶ [Failure] ──▶ (Set item status to `media_failed`) ──▶ (Item reappears in UI Queue with error)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/db/schema.ts` | Modify | Add `promoting` to `import_item_status` enum. |
| `lib/yupoo-core.ts` | Modify | Update `extractYupooImages` to return `previewUrl`. Add `canonicalizeYupooSourceUrl` function for stable identity. |
| `lib/imports/ingestion.ts` | Modify | Check existing `products` and `importJobs` early using canonical identity; return `already-exists` skip reason. Persist `previewUrl`. Add check for missing price. |
| `lib/imports/promotion.ts` | Modify | Move R2 upload and variant generation to a background task. Update item state to `promoting` immediately, and `promoted` or `media_failed` upon completion. Enforce 2-image minimum. |
| `components/admin/imports-review-client.tsx` | Modify | Implement compact navigation (bounded list/pagination). Add optimistic removal on promotion. Add distinct visual state and retry actions for items with `media_failed`. |
| `app/api/admin/imports/proxy/route.ts` | Modify | Remove regex path mutation; proxy the stored `previewUrl` directly. |
| `app/api/admin/imports/clear/route.ts` | Create | New route handler to safely `DELETE FROM import_jobs` based on user action. |
| `app/api/admin/imports/route.ts` | Modify | Update POST to accept promotion requests, trigger async promotion, and return immediately for optimistic UI updates. |

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

// Added to existing interfaces
export interface YupooIngestionResult {
  // ... existing fields ...
  skipReason?: "missing-price" | "insufficient-useful-images" | "already-exists";
}

// Queue Status Enum update
// 'promoting' is added for the background state
// 'media_failed' is already present but will now trigger UI queue return
export type ImportItemStatus = "pending" | "approved" | "rejected" | "promoting" | "promoted" | "media_failed";
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Ingestion | Verify already-existing products (catalog/staging) are skipped. Verify missing-price products are discarded before DB insert. Verify `previewUrl` is stored. |
| Unit | Promotion | Verify promotion API returns immediately. Verify background worker transitions state `promoting` -> `promoted` or `media_failed`. Verify variant generation and R2 upload logic. |
| Unit | Promotion Error Handling | Verify network failures during R2 upload transition item to `media_failed`. Verify error messages are operator-readable. |
| E2E | Curation UI | Verify optimistic removal of promoted items. Verify items with `media_failed` return to queue with visible errors and retry action. Verify carousel handles last-image rejection without crashing and renders single promote action. Verify "Clear All" correctly purges the queue. |
| E2E | Compact Navigation | Verify pagination or batch navigation works with 50+ items. Verify operator can navigate efficiently without infinite scroll. |
| E2E | Promotion States | Verify distinct visual states for `pending`, `promoting`, `promoted`, and `media_failed` items. Verify error messages and retry functionality. |
| Integration | Admin API | Verify `/api/admin/imports/clear` safely removes staging records. Verify promotion API returns 200 OK immediately before background completion. Verify failed promotions update item status correctly. |

## Migration / Rollout

A database migration is required to add `promoting` to the `import_item_status` enum.
Existing staging items can be processed seamlessly.

## Open Questions

- None