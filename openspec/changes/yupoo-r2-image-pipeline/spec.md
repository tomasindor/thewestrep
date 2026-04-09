# Specification: Yupoo R2 Image Pipeline

## Overview
This specification defines the requirements and scenarios for the Yupoo R2 Image Pipeline, which unifies single and bulk Yupoo imports into a managed pipeline that downloads, processes, and stores images in Cloudflare R2, with admin curation and promotion to the live catalog.

## Requirements

### R1: Unified Import Pipeline
- The system MUST provide a single ingestion service that handles both bulk and single-item Yupoo imports
- The ingestion service MUST reuse existing Yupoo parsing and size-guide heuristics
- The ingestion service MUST download each source image exactly once and store it in Cloudflare R2

### R2: Image Storage & Variants
- The system MUST store original images in Cloudflare R2 with predictable key generation
- The system MUST generate and persist six fixed variants per imported image:
  - thumb (for small previews)
  - cart-thumb (for cart displays)
  - card (for product cards)
  - detail (for product detail pages)
  - lightbox (for full-size viewing)
  - admin-preview (for admin interface)
- The system MUST store variant metadata in a JSONB manifest alongside each image record

### R3: Image Metadata & Preservation
- The system MUST persist the following metadata for each imported image:
  - Source URL (original Yupoo URL)
  - Variant references (R2 keys for all generated variants)
  - Order/position (for display sequencing)
  - Review state (pending, approved, rejected, restored, promoted)
  - Size-guide flag (boolean indicating if image is a size guide)
  - Similarity metadata (for future similar-image suggestions)
- The system MUST preserve size-guide images and keep them out of accidental deletion flows
- The system MUST maintain size-guide images in a hidden state in the storefront gallery

### R4: Admin Curation Workflow
- The system MUST provide a fast admin curation interface with:
  - Visible state indicators for each image (pending, approved, rejected)
  - One-click discard (reject) and restore actions
  - Keyboard navigation for rapid review
  - Ctrl+Z undo for the last discard action
- The system MUST implement automatic cover selection where the first approved/active image becomes the cover
- The system MUST reflow the cover when the current cover is rejected

### R5: Catalog Delivery
- The system MUST deliver images from owned Cloudflare-hosted assets instead of runtime Yupoo URLs
- The system MUST maintain backward compatibility with existing catalog reads until promoted assets exist

### R6: Similar Image Assistance
- The system MUST provide similar-image suggestions as admin assistance only
- The system MUST NOT automatically delete similar images
- The system MUST store similarity metadata for future use

### R7: Non-Goals
- The system MUST NOT include OCR/translation capabilities
- The system MUST NOT include manual cover editing features
- The system MUST NOT generalize image ingestion for non-Yupoo sources in this change

## Scenarios

### S1: Single Item Import
**Given** an admin user is importing a single Yupoo product
**When** they submit a Yupoo URL through the admin interface
**Then** the system should:
1. Parse the Yupoo URL and extract all image URLs
2. Download each unique image exactly once
3. Store the original in Cloudflare R2
4. Generate and store all six variants in R2
5. Create staging records for the import job and items
6. Persist all required metadata
7. Make the images available for admin review

### S2: Bulk Import
**Given** a user is running the bulk import script
**When** they execute the import-yupoo script with album URLs
**Then** the system should:
1. Parse each Yupoo album/URL
2. Extract all product and image data
3. For each unique image, download it exactly once
4. Store originals and generate variants in R2
5. Create staging records for all imported items
6. Make all imported items available for admin review

### S3: Admin Curation
**Given** an admin user is reviewing imported images
**When** they navigate the curation queue
**Then** the system should:
1. Display images with clear state indicators
2. Allow one-click approve/reject actions
3. Support keyboard navigation between images
4. Provide Ctrl+Z undo for the last action
5. Automatically set the first approved image as cover
6. Update the cover if the current cover is rejected

### S4: Image Promotion
**Given** an admin user has approved an import item
**When** they confirm the promotion
**Then** the system should:
1. Copy the approved data to the live catalog tables
2. Preserve size-guide metadata appropriately
3. Update product records to use R2-hosted image URLs
4. Maintain backward compatibility for existing products

### S5: Size Guide Preservation
**Given** an import contains size-guide images
**When** the images are processed and reviewed
**Then** the system should:
1. Flag size-guide images appropriately
2. Keep size-guide images out of normal deletion flows
3. Hide size-guide images from the regular storefront gallery
4. Preserve the original source reference for size guides

### S6: Similar Image Handling
**Given** the system detects similar images during import
**When** displaying suggestions to the admin
**Then** the system should:
1. Show similarity suggestions as assistance only
2. NOT automatically delete similar images
3. Store similarity metadata for future reference

## Data Model

### ImportJob
```typescript
interface ImportJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  source: 'admin' | 'bulk';
  sourceReference?: string; // Yupoo URL or album ID
}
```

### ImportItem
```typescript
interface ImportItem {
  id: string;
  importJobId: string;
  status: 'pending' | 'approved' | 'rejected' | 'restored' | 'promoted';
  productData: any; // Raw scraped product data
  createdAt: Date;
  updatedAt: Date;
}
```

### ImportImage
```typescript
interface ImportImage {
  id: string;
  importItemId: string;
  originalUrl: string; // Source Yupoo URL
  r2Key: string; // R2 storage key for original
  variantsManifest: ImageVariantsManifest;
  order: number; // Display order
  reviewState: 'pending' | 'approved' | 'rejected' | 'restored' | 'promoted';
  isSizeGuide: boolean;
  similarityMetadata?: any; // For future use
  createdAt: Date;
  updatedAt: Date;
}

interface ImageVariantsManifest {
  original: string; // R2 key
  variants: {
    thumb?: string;
    cartThumb?: string;
    card?: string;
    detail?: string;
    lightbox?: string;
    adminPreview?: string;
  };
  width: number;
  height: number;
}
```

## Test Cases

### TC1: Image Download & Storage
- Verify that each Yupoo image is downloaded exactly once
- Verify that originals are stored in R2 with correct keys
- Verify that all six variants are generated and stored

### TC2: Metadata Persistence
- Verify that all required metadata is persisted for each image
- Verify that size-guide images are properly flagged
- Verify that variant references are correctly stored

### TC3: Admin Curation Flow
- Verify that admin can navigate through images quickly
- Verify that approve/reject actions work correctly
- Verify that Ctrl+Z undo works for the last action
- Verify that cover image is automatically set and updated

### TC4: Promotion to Catalog
- Verify that approved items are correctly promoted to live catalog
- Verify that product records use R2-hosted URLs
- Verify that size-guide metadata is preserved

### TC5: Backward Compatibility
- Verify that existing catalog reads continue to work
- Verify that old Yupoo URLs are maintained until promotion

## Acceptance Criteria

1. ✅ New imports no longer depend on Yupoo delivery at runtime
2. ✅ Single and bulk import share one ingestion pipeline
3. ✅ Size-guide images remain preserved and hidden from normal gallery rendering
4. ✅ Admin can approve/reject/restore candidates quickly before catalog promotion
5. ✅ All six variants are pre-generated and stored in R2
6. ✅ All required metadata is persisted for each image
7. ✅ Similar image suggestions are provided as assistance only

## Implementation Phases

1. **Storage Layer**: Implement R2 storage abstraction and variant generation
2. **Schema Layer**: Create staging tables and extend image metadata
3. **Ingestion Service**: Build shared pipeline for both bulk and single imports
4. **Admin Curation UI**: Implement fast review interface
5. **Promotion Logic**: Add approval boundary to catalog tables
6. **Testing & Validation**: Verify all requirements and scenarios