import "server-only";

import { cache } from "react";

import { getDbSql } from "@/lib/db/core";

export interface BrandSchemaCompatibility {
  hasImageSourceUrl: boolean;
  hasImageProvider: boolean;
  hasImageAssetKey: boolean;
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

export const getBrandSchemaCompatibility = cache(async function getBrandSchemaCompatibility(): Promise<BrandSchemaCompatibility> {
  const sql = getDbSql();

  if (!sql) {
    return {
      hasImageSourceUrl: true,
      hasImageProvider: true,
      hasImageAssetKey: true,
    };
  }

  const result = await sql.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'brands'");
  const rows = normalizeSqlRows<{ column_name: string }>(result);
  const columns = new Set(rows.map((row) => row.column_name));

  return {
    hasImageSourceUrl: columns.has("image_source_url"),
    hasImageProvider: columns.has("image_provider"),
    hasImageAssetKey: columns.has("image_asset_key"),
  };
});

export function getBrandSchemaCompatibilityWarning(compatibility: BrandSchemaCompatibility) {
  const missingColumns = [
    compatibility.hasImageSourceUrl ? null : "image_source_url",
    compatibility.hasImageProvider ? null : "image_provider",
    compatibility.hasImageAssetKey ? null : "image_asset_key",
  ].filter((column): column is string => Boolean(column));

  if (missingColumns.length === 0) {
    return undefined;
  }

  return `La base de datos de marcas sigue con un schema viejo (${missingColumns.join(", ")}). Dejamos compatibilidad temporal con image_url para no romper el sitio, pero corré npm run db:push para completar la migración.`;
}
