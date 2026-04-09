import "server-only";

import { cache } from "react";

import { getDbSql } from "@/lib/db/core";

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

export interface ProductSizeGuidesSchemaCompatibility {
  hasTable: boolean;
}

export const getProductSizeGuidesSchemaCompatibility = cache(
  async function getProductSizeGuidesSchemaCompatibility(): Promise<ProductSizeGuidesSchemaCompatibility> {
    const sql = getDbSql();

    if (!sql) {
      return { hasTable: true };
    }

    const result = await sql.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name = 'product_size_guides'",
    );
    const rows = normalizeSqlRows<{ table_name: string }>(result);

    return {
      hasTable: rows.some((row) => row.table_name === "product_size_guides"),
    };
  },
);

export function getProductSizeGuidesSchemaCompatibilityWarning(compatibility: ProductSizeGuidesSchemaCompatibility) {
  if (compatibility.hasTable) {
    return undefined;
  }

  return "La base todavía no tiene product_size_guides. Dejamos compatibilidad para no romper el sitio, pero corré npm run db:push antes de cargar tablas de talles estructuradas.";
}
