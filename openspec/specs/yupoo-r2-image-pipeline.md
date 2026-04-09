# Specification: Yupoo R2 Image Pipeline

## Overview
This specification defines the requirements and scenarios for implementing a unified Yupoo image import pipeline with Cloudflare R2 storage, staging workflow, and admin curation capabilities.

## Requirements

### 1. Unified Import Pipeline
- **R1.1**: The system MUST provide a single ingestion service that handles both single-item and bulk Yupoo imports
- **R1.2**: The pipeline MUST reuse existing Yupoo parsing logic from `lib/yupoo-core.ts`
- **R1.3**: The pipeline MUST support staging imports before catalog promotion
- **R1.4**: The pipeline MUST replace the current direct database writes in `scripts/import-yupoo.ts`

### 2. R2 Storage Integration
- **R2.1**: Original images MUST be stored in Cloudflare R2
- **R2.2**: The system MUST generate and store exactly six fixed variants per image:
  - `small`, `medium`, `big`, `original`, `square`, `raw`
- **R2.3**: The storage layer MUST provide an abstraction in `lib/media/` for R2 operations
- **R2.4**: All image URLs in the catalog MUST point to owned Cloudflare R2 assets, not Yupoo URLs
- **R2.5**: The system MUST maintain backward compatibility with existing catalog reads until promotion

### 3. Image Metadata & Source Tracking
- **R3.1**: Each image MUST have metadata tracking its source (Yupoo URL, import job, etc.)
- **R3.2**: The system MUST preserve original Yupoo URLs for reference
- **R3.3**: Image metadata MUST include variant manifests and R2 storage paths
- **R3.4**: The system MUST extend the `productImages` table to include staging state and R2 metadata

### 4. Size Guide Preservation
- **R4.1**: Size guide images MUST be automatically detected using existing heuristics from `lib/catalog/size-guides.ts`
- **R4.2**: Size guide images MUST NOT appear in normal product gallery views
- **R4.3**: Size guide images MUST be preserved separately and hidden from normal rendering
- **R4.4**: The system MUST reuse the `isLikelySizeGuideImageUrl` function for detection

### 5. Image Review States
- **R5.1**: Images MUST have clear states: `pending`, `approved`, `rejected`, `active`
- **R5.2**: State transitions MUST follow rules:
  - `pending` → `approved` or `rejected`
  - `approved` → `active` (when promoted to catalog)
  - `rejected` → `pending` (when restored)
  - `active` → remains `active` (immutable after promotion)
- **R5.3**: The system MUST add a new `imageReviewState` enum to the database schema
- **R5.4**: The system MUST add a `staging_product_images` table for review workflow

### 6. Admin Curation Workflow
- **R6.1**: The admin interface MUST provide one-click discard/restore functionality
- **R6.2**: The interface MUST support keyboard navigation for fast curation
- **R6.3**: The interface MUST provide undo functionality for the last removal operation
- **R6.4**: The curation queue MUST be lightweight and fast to operate
- **R6.5**: The system MUST add API endpoints in `app/api/admin/` for curation operations
- **R6.6**: The system MUST add React components in `components/admin/` for the curation UI

### 7. Automatic Cover Behavior
- **R7.1**: The first approved/active image MUST automatically become the product cover
- **R7.2**: Cover selection MUST update automatically when the first image's state changes
- **R7.3**: The system MUST implement cover selection logic in the promotion service

### 8. Delivery Rules
- **R8.1**: Catalog frontend MUST use owned Cloudflare R2 assets for all image delivery
- **R8.2**: Runtime MUST NOT depend on Yupoo URLs for image display
- **R8.3**: Existing catalog reads MUST continue working until promoted assets exist
- **R8.4**: The system MUST implement a fallback mechanism to use existing URLs until R2 assets are available

### 9. Scope Boundaries
- **R9.1**: OCR/translation features MUST remain out of scope for this change
- **R9.2**: Manual cover editing MUST remain out of scope
- **R9.3**: Similar-image suggestions MUST be admin-facing assistance only, with no auto-deletion
- **R9.4**: The system MUST NOT implement embedding-based similarity workflows in this version

## Scenarios

### Scenario 1: Single Item Import
**Given** an admin user wants to import a single Yupoo product
**When** they use the single-item import flow
**Then** the image goes through the staging pipeline
**And** appears in the curation queue for review
**And** the system creates entries in `staging_product_images` table

### Scenario 2: Bulk Import
**Given** an admin runs the bulk import script
**When** the script processes Yupoo URLs
**Then** all images follow the same staging pipeline as single imports
**And** appear in the curation queue for review
**And** the system creates entries in `staging_product_images` table

### Scenario 3: Image Approval
**Given** an image is in `pending` state
**When** admin approves it
**Then** its state changes to `approved`
**And** it becomes eligible for catalog promotion
**And** the system updates the state in `staging_product_images`

### Scenario 4: Image Rejection
**Given** an image is in `pending` state
**When** admin rejects it
**Then** its state changes to `rejected`
**And** it can be restored later
**And** the system updates the state in `staging_product_images`

### Scenario 5: Image Restoration
**Given** an image is in `rejected` state
**When** admin restores it
**Then** its state changes back to `pending`
**And** it reappears in the curation queue
**And** the system updates the state in `staging_product_images`

### Scenario 6: Fast Curation Workflow
**Given** admin is reviewing images in the curation queue
**When** they use keyboard shortcuts
**Then** they can quickly navigate and approve/reject images
**And** undo their last action if needed
**And** the system provides API endpoints for these operations

### Scenario 7: Size Guide Handling
**Given** a product has size guide images
**When** images are imported
**Then** size guide images are automatically detected using `isLikelySizeGuideImageUrl`
**And** preserved separately from gallery images
**And** hidden from normal product views
**And** the system marks these images with a special flag in metadata

### Scenario 8: Catalog Promotion
**Given** approved images exist for a product
**When** the promotion process runs
**Then** images are moved to active state
**And** their state changes to `active`
**And** they become available in the catalog
**And** the system moves records from `staging_product_images` to `product_images`

### Scenario 9: Cover Image Selection
**Given** a product has no cover image
**When** the first image is approved
**Then** it automatically becomes the cover image
**And** when a different image is approved first
**Then** the cover updates to that image
**And** the system sets the `role: 'cover'` flag on the appropriate image

### Scenario 10: Image Delivery
**Given** a product is displayed in the catalog
**When** images are loaded
**Then** all image URLs point to Cloudflare R2 assets
**And** no runtime dependencies on Yupoo exist
**And** the system falls back to existing URLs if R2 assets are not yet available

## Implementation Constraints
- Must reuse existing Yupoo parsing and size-guide detection logic
- Must maintain backward compatibility with existing catalog reads
- Must implement staging boundary before catalog promotion
- Must support both single and bulk import through the same pipeline
- Must extend existing database schema without breaking changes
- Must implement R2 storage abstraction in the media library

## Database Schema Changes

### New Tables
```sql
CREATE TYPE image_review_state AS ENUM ('pending', 'approved', 'rejected', 'active');

CREATE TABLE staging_product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_url TEXT,
  provider TEXT,
  asset_key TEXT,
  cloud_name TEXT,
  alt TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  source product_image_source NOT NULL DEFAULT 'yupoo',
  review_state image_review_state NOT NULL DEFAULT 'pending',
  is_size_guide BOOLEAN NOT NULL DEFAULT FALSE,
  r2_original_path TEXT,
  r2_variants JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Modified Tables
```sql
ALTER TABLE product_images
ADD COLUMN review_state image_review_state NOT NULL DEFAULT 'active',
ADD COLUMN r2_original_path TEXT,
ADD COLUMN r2_variants JSONB;
```

## Test Cases

### TC1: Pipeline Unification
- Verify single-item import uses the same pipeline as bulk import
- Confirm both flows result in staged images for review
- Check that records are created in `staging_product_images` table

### TC2: R2 Storage Verification
- Confirm originals and six variants are stored in R2
- Verify image URLs in catalog point to R2 assets
- Check that R2 paths are stored in database metadata

### TC3: State Transition Validation
- Test all valid state transitions (pending→approved, pending→rejected, etc.)
- Verify invalid transitions are blocked
- Check that state changes are reflected in the database

### TC4: Size Guide Preservation
- Import products with size guides
- Verify size guides are detected using existing heuristics
- Confirm size guides are hidden from gallery views
- Check that size guide flag is set in metadata

### TC5: Admin Workflow Efficiency
- Measure time to curate 100 images using keyboard navigation
- Verify undo functionality works correctly
- Test API endpoints for curation operations

### TC6: Delivery Compliance
- Check all catalog image requests go to R2
- Verify fallback to existing URLs works when R2 assets are unavailable
- Confirm no runtime Yupoo dependencies exist

### TC7: Database Schema Validation
- Verify new tables and columns are created correctly
- Check that existing functionality still works with schema changes
- Test that foreign key constraints are properly enforced

## Non-Goals Verification
- Confirm OCR/translation features are not implemented
- Verify manual cover editing is not available
- Check similar-image suggestions don't auto-delete images
- Ensure embedding-based similarity workflows are not implemented