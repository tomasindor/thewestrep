# Specification: Yupoo R2 Image Pipeline

## Purpose
Define a staged Yupoo import pipeline that keeps only curated product media, uses direct source URLs during review, and promotes eligible imports into the catalog with clear operator feedback. The system MUST NOT upload anything to Cloudflare R2 during staging/review, and MUST only upload to R2 after curation when the operator has removed unwanted images.

## Requirements

### Requirement: Two-stage staged ingestion with delayed R2 upload
The system MUST route admin single-item imports and bulk Yupoo imports through one staged ingestion pipeline. Accepted unique product images MUST persist only metadata and source references during import, with NO R2 uploads during staging/review. The import flow MUST NOT generate any image variants before promotion, and images rejected by dedupe or pre-import heuristics MUST be dropped before persistence.

#### Scenario: Single-item import enters staging with source references only
- GIVEN an admin submits one Yupoo product URL
- WHEN ingestion completes successfully
- THEN the product is staged for review with only metadata and source image references
- AND no images are uploaded to R2
- AND no catalog/runtime variants are generated yet

#### Scenario: Pre-import rejection is dropped early
- GIVEN ingestion detects a duplicate image or an auto-excluded non-product image
- WHEN the import pipeline evaluates that candidate
- THEN the candidate is discarded before any staging record is created

### Requirement: Hybrid heuristic image filtering
The system MUST apply pre-import heuristics for obvious brand, showcase, and sample images. Obvious non-product candidates MUST be auto-excluded, while uncertain candidates SHOULD remain in staging for manual curation instead of being silently dropped.

#### Scenario: Obvious showcase image is auto-excluded
- GIVEN a scraped image clearly matches brand-banner or sample-only heuristics
- WHEN ingestion classifies the candidate
- THEN the image is excluded automatically and never reaches staging

#### Scenario: Uncertain candidate remains reviewable
- GIVEN a scraped image matches heuristics weakly or ambiguously
- WHEN ingestion cannot classify it as obviously non-product
- THEN the image remains available in the review workflow for operator decision

### Requirement: Minimum useful image threshold
After filtering, a product MUST be skipped entirely if it ends up with fewer than 2 useful images. This ensures only products with sufficient visual representation enter the review queue.

#### Scenario: Product with insufficient images is skipped
- GIVEN a product has fewer than 2 active images after heuristic filtering
- WHEN the import pipeline completes processing
- THEN the product is skipped entirely and does not enter staging

### Requirement: Review queue uses direct source URLs
The system MUST persist source URL, display order, image activity state, and `isSizeGuide` metadata for each staged image. Imported images MUST be active by default unless explicitly rejected. `/admin/imports` MUST show each item's final name, final price, brand, and active-image count. The review flow MUST use direct source URLs from Yupoo during review, and the lower image strip in product review MUST show only active images.

#### Scenario: Queue surfaces final product metadata
- GIVEN staged products are listed in `/admin/imports`
- WHEN the operator reviews the queue
- THEN each row shows final name, final price, brand, and the count of currently active images

#### Scenario: Review strip hides inactive images and uses source URLs
- GIVEN a staged product has active and inactive images
- WHEN the operator views the lower image strip in review
- THEN only active images appear in that strip
- AND the review UI uses direct source URLs from Yupoo without waiting for R2 uploads

### Requirement: Safe image rejection in review
Deleting or rejecting the currently visible image in review MUST NOT collapse or wipe the entire imports queue incorrectly. The system MUST handle image rejection gracefully without breaking the review flow.

#### Scenario: Rejecting visible image preserves queue integrity
- GIVEN the operator is reviewing a product and the currently visible image is rejected
- WHEN the operator deletes or rejects the currently visible image
- THEN the review queue remains intact
- AND the next image in the product is shown (or the product is marked as needing attention if no images remain)

### Requirement: Bulk and per-product promotion with R2 upload and feedback
The `/admin/imports` page MUST support both bulk promotion and per-product promotion. Operators MUST be able to promote individual products or entire batches as needed. Bulk promotion MUST upload active curated images to R2, generate deferred catalog variants, and promote every eligible item. Ineligible items MUST remain blocked and MUST expose understandable operator-facing reasons.

#### Scenario: Operator promotes a single product
- GIVEN a staged product is ready for promotion
- WHEN the operator selects per-product promotion
- THEN only that product is promoted with its active curated images uploaded to R2

#### Scenario: Operator promotes an entire batch
- GIVEN multiple staged products are ready for promotion
- WHEN the operator selects bulk promotion
- THEN all eligible products in the batch are promoted with their active curated images uploaded to R2

#### Scenario: Ineligible items stay blocked with reasons
- GIVEN a bulk promotion batch contains products missing an active non-size-guide gallery image or other required promotion data
- WHEN the operator promotes the batch
- THEN those products are not promoted
- AND the result explains why each blocked product is ineligible

### Requirement: Price resolution is mandatory for import
The system MUST reject any product that cannot resolve a valid price during scraping. Products without a resolvable price MUST be skipped entirely and MUST NOT enter the staging area.

#### Scenario: Product with unresolvable price is skipped
- GIVEN a Yupoo product cannot have its price resolved during scraping
- WHEN the import pipeline processes the product
- THEN the product is skipped entirely and does not enter staging

### Requirement: Review carousel position indicator
The review carousel MUST show the current image position/total clearly on hover or in an overlay. This helps operators understand their progress through the review queue.

#### Scenario: Carousel shows position indicator
- GIVEN the operator is reviewing images in the carousel
- WHEN the operator hovers over the carousel or an overlay is present
- THEN the current image position and total count are clearly displayed (e.g., "3/12")

### Requirement: Performance-optimized review assets
Review performance MUST use the real preview URL provided by Yupoo album data, not a guessed filename convention like `*_small.jpg`. The staging/import pipeline MUST persist whatever real preview/source URL pairing is needed so `/admin/imports` can load previews without 404s.

#### Scenario: Review uses real Yupoo preview URLs
- GIVEN the review interface is loading product images
- WHEN images are rendered in the review carousel
- THEN the system uses the real preview URL provided by Yupoo album data
- AND the staging pipeline has persisted the correct preview/source URL pairing
- AND the review proxy uses the persisted preview URL, not a guessed convention

#### Scenario: Preview URL persistence ensures no 404s
- GIVEN a product is staged for review
- WHEN the operator loads the review interface
- THEN all preview images load successfully without 404 errors
- AND the system has persisted the correct preview URL from Yupoo's response

### Requirement: Explicit imports queue clearing (staging only)
The `/admin/imports` page MUST provide an explicit operator action to clear the entire imports queue. Clearing imports MUST affect staging records only and MUST NOT touch brands, categories, schema, or existing catalog products. This ensures operators can reset the import workflow without risking production data.

#### Scenario: Operator clears entire imports queue (staging only)
- GIVEN the operator is on the `/admin/imports` page
- WHEN the operator selects the "Clear entire queue" action
- THEN all queued staging items are removed from the staging tables
- AND the import queue is emptied
- AND brands, categories, schema, and catalog products remain completely unaffected

#### Scenario: Clearing imports isolates staging from catalog
- GIVEN the imports queue contains multiple staged items and catalog has existing products
- WHEN the operator clears the queue
- THEN only import staging records are deleted
- AND catalog products, brands, categories, and all non-staging data remain intact
- AND the system remains in a consistent state with zero risk to production data

### Requirement: Post-curation media failures are explicit
The system MUST represent failures in deferred variant generation cleanly. A product or image with post-curation media work that fails MUST expose a distinct non-success state for operators or downstream processes, and MUST NOT silently appear catalog-ready until required variants complete successfully.

#### Scenario: Deferred variant generation fails after promotion starts
- GIVEN an active curated image is selected for promotion
- WHEN one or more deferred catalog variants fail to generate
- THEN the system records a clear failure state for that promoted media work
- AND the affected image or product is not treated as fully catalog-ready

### Requirement: Imports queue uses compact navigation model
The imports queue MUST avoid becoming an infinitely tall scrolling list when many items exist. The review interface MUST support a compact navigation model (e.g., paginated list, master-detail view, or segmented batches) that keeps the review workflow focused and fast.

#### Scenario: Queue displays items in a compact, navigable format
- GIVEN the imports queue contains many staged products (e.g., 50+ items)
- WHEN the operator views `/admin/imports`
- THEN the queue is presented in a compact, segmented format (not an infinitely scrolling list)
- AND the operator can navigate between items efficiently without excessive scrolling

#### Scenario: Master-detail or paginated navigation
- GIVEN the operator needs to review multiple products
- WHEN navigating the queue
- THEN the UI provides clear navigation controls (pagination, next/prev, or master-detail selection)
- AND the current position in the queue is always visible
- AND the operator can jump to specific items or batches quickly

### Requirement: Optimistic removal on promotion
When an item is promoted, it MUST disappear from the queue immediately (optimistic removal) rather than waiting for all variant generation to finish. This keeps the queue focused on pending work and prevents re-reviewing already-promoted items.

#### Scenario: Promoted item vanishes from queue immediately
- GIVEN the operator initiates promotion for a staged product
- WHEN the promotion request is accepted by the server
- THEN the item is immediately removed from the visible queue
- AND the queue UI updates without waiting for background variant generation to complete
- AND the operator can continue reviewing remaining items without delay

### Requirement: Background promotion flow
Promotion MUST continue in the background or asynchronous flow after optimistic removal. The system MUST handle all R2 uploads and variant generation asynchronously while the operator continues working through the queue.

#### Scenario: Promotion proceeds asynchronously
- GIVEN an item has been optimistically removed from the queue
- WHEN the promotion pipeline processes the item
- THEN all R2 uploads and variant generation occur in the background
- AND the operator can continue reviewing other items without blocking
- AND the system tracks promotion progress independently of the review UI

### Requirement: Failed promotion returns item to queue with error
If promotion ultimately fails, the item MUST return to the queue with a visible operator-facing error state and reason. This ensures no promoted items are lost and operators can retry or fix issues.

#### Scenario: Failed promotion re-queues item with error
- GIVEN a promoted item's background processing fails (e.g., R2 upload error, variant generation failure)
- WHEN the failure is detected
- THEN the item reappears in the imports queue
- AND the item is marked with a visible error state (e.g., "Promotion failed")
- AND a clear, operator-readable reason is displayed (e.g., "R2 upload failed: timeout", "Variant generation error: unsupported format")
- AND the operator can retry promotion or take corrective action

### Requirement: Promotion-in-progress state is distinct
The UI MUST communicate promotion-in-progress state separately from ordinary queued items. Items being promoted MUST be visually distinguished from items awaiting review or promotion.

#### Scenario: In-progress items show distinct visual state
- GIVEN an item is currently undergoing background promotion
- WHEN the item appears in the queue (before optimistic removal) or returns after failure
- THEN it displays a distinct visual indicator (e.g., spinner, progress bar, or status badge)
- AND the state is clearly labeled as "Promoting..." or similar
- AND the item is visually distinct from items awaiting promotion or review

#### Scenario: Queue differentiates states clearly
- GIVEN the queue contains items in various states (pending review, promoting, failed promotion)
- WHEN the operator views the queue
- THEN each state has a distinct visual representation
- AND the operator can quickly identify which items need attention vs. which are processing
