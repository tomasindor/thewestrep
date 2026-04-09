import "server-only";

import { cache } from "react";

import { getDbSql } from "@/lib/db/core";

export interface ProductImagesSchemaCompatibility {
  hasSourceUrl: boolean;
  hasProvider: boolean;
  hasAssetKey: boolean;
  hasCloudName: boolean;
  hasVariantsManifest: boolean;
}

function normalizeSqlRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }

  return [];
}

export const getProductImagesSchemaCompatibility = cache(
  async function getProductImagesSchemaCompatibility(): Promise<ProductImagesSchemaCompatibility> {
    const sql = getDbSql();

    if (!sql) {
      return {
        hasSourceUrl: true,
        hasProvider: true,
        hasAssetKey: true,
        hasCloudName: true,
        hasVariantsManifest: true,
      };
    }

    const result = await sql.query(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'product_images'",
    );
    const rows = normalizeSqlRows<{ column_name: string }>(result);
    const columns = new Set(rows.map((row) => row.column_name));

    return {
      hasSourceUrl: columns.has("source_url"),
      hasProvider: columns.has("provider"),
      hasAssetKey: columns.has("asset_key"),
      hasCloudName: columns.has("cloud_name"),
      hasVariantsManifest: columns.has("variants_manifest"),
    };
  },
);

export function getProductImagesSchemaCompatibilityWarning(compatibility: ProductImagesSchemaCompatibility) {
  const missingColumns = [
    compatibility.hasSourceUrl ? null : "source_url",
    compatibility.hasProvider ? null : "provider",
    compatibility.hasAssetKey ? null : "asset_key",
    compatibility.hasCloudName ? null : "cloud_name",
    compatibility.hasVariantsManifest ? null : "variants_manifest",
  ].filter((column): column is string => Boolean(column));

  if (missingColumns.length === 0) {
    return undefined;
  }

  return `La base de datos de product_images sigue con un schema viejo (${missingColumns.join(", ")}). Dejamos compatibilidad temporal con url para no romper el sitio, pero corré npm run db:push para completar la migración.`;
}
