import type { IngestionDependencies } from "@/lib/imports/ingestion";
import { createR2StorageFromEnv } from "@/lib/media/r2-storage-adapter";

export interface CreateBulkIngestionDependenciesOptions {
  createStorage?: () => Pick<ReturnType<typeof createR2StorageFromEnv>, "putObject">;
}

export function createBulkIngestionDependencies(
  db: IngestionDependencies["db"],
  options: CreateBulkIngestionDependenciesOptions = {},
): IngestionDependencies {
  const storage = (options.createStorage ?? createR2StorageFromEnv)();

  return {
    db,
    storeInR2: async (write) => {
      await storage.putObject({
        key: write.key,
        body: write.body,
        contentType: write.contentType,
        cacheControl: write.cacheControl,
        metadata: write.metadata,
      });
    },
  };
}
