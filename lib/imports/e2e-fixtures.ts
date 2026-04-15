import type { CurationQueuePayload } from "@/lib/imports/curation";

export function buildPlaywrightImportsQueueFixture(): CurationQueuePayload {
  return {
    items: [
      {
        id: "pw-item-1",
        status: "approved",
        mediaStatus: "pending",
        sourceReference: "https://deateath.x.yupoo.com/albums/fixture-e2e?uid=1",
        finalName: "Producto importado de prueba E2E",
        finalPrice: 89990,
        brand: "Brand Fixture",
        activeImageCount: 1,
        productName: "Producto importado de prueba E2E",
        coverImageId: "pw-image-1",
        promotionEligible: true,
        promotionBlockedReason: null,
        images: [
          {
            id: "pw-image-1",
            importItemId: "pw-item-1",
            sourceUrl: "https://picsum.photos/id/1011/1200/900",
            previewUrl: "https://picsum.photos/id/1011/480/360",
            reviewState: "approved",
            isSizeGuide: false,
            order: 0,
          },
          {
            id: "pw-image-2",
            importItemId: "pw-item-1",
            sourceUrl: "https://picsum.photos/id/1025/1200/900",
            previewUrl: "https://picsum.photos/id/1025/480/360",
            reviewState: "rejected",
            isSizeGuide: false,
            order: 1,
          },
        ],
      },
      {
        id: "pw-item-2",
        status: "approved",
        mediaStatus: "pending",
        sourceReference: "https://deateath.x.yupoo.com/albums/fixture-e2e-2?uid=1",
        finalName: "Producto importado bloqueado E2E",
        finalPrice: 109990,
        brand: "Brand Fixture",
        activeImageCount: 2,
        productName: "Producto importado bloqueado E2E",
        coverImageId: "pw-image-3",
        promotionEligible: false,
        promotionBlockedReason: "insufficient useful images",
        images: [
          {
            id: "pw-image-3",
            importItemId: "pw-item-2",
            sourceUrl: "https://picsum.photos/id/1027/1200/900",
            previewUrl: "https://picsum.photos/id/1027/480/360",
            reviewState: "approved",
            isSizeGuide: true,
            order: 0,
          },
          {
            id: "pw-image-4",
            importItemId: "pw-item-2",
            sourceUrl: "https://picsum.photos/id/1035/1200/900",
            previewUrl: "https://picsum.photos/id/1035/480/360",
            reviewState: "approved",
            isSizeGuide: true,
            order: 1,
          },
        ],
      },
    ],
  };
}

export function resolveImportsQueueForRender(input: {
  isPlaywrightRuntime: boolean;
  liveQueue: CurationQueuePayload;
}): CurationQueuePayload {
  if (input.isPlaywrightRuntime) {
    return buildPlaywrightImportsQueueFixture();
  }

  return input.liveQueue;
}
