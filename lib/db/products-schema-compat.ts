import "server-only";

import { cache } from "react";

import { getDbSql } from "@/lib/db/core";

export interface ProductsSchemaCompatibility {
  hasComboEligible: boolean;
  hasComboGroup: boolean;
  hasComboPriority: boolean;
  hasComboSourceKey: boolean;
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

export const getProductsSchemaCompatibility = cache(async function getProductsSchemaCompatibility(): Promise<ProductsSchemaCompatibility> {
  const sql = getDbSql();

  if (!sql) {
    return {
      hasComboEligible: true,
      hasComboGroup: true,
      hasComboPriority: true,
      hasComboSourceKey: true,
    };
  }

  const result = await sql.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'products'");
  const rows = normalizeSqlRows<{ column_name: string }>(result);
  const columns = new Set(rows.map((row) => row.column_name));

  return {
    hasComboEligible: columns.has("combo_eligible"),
    hasComboGroup: columns.has("combo_group"),
    hasComboPriority: columns.has("combo_priority"),
    hasComboSourceKey: columns.has("combo_source_key"),
  };
});

export function getProductsSchemaCompatibilityWarning(compatibility: ProductsSchemaCompatibility) {
  const missingColumns = [
    compatibility.hasComboEligible ? null : "combo_eligible",
    compatibility.hasComboGroup ? null : "combo_group",
    compatibility.hasComboPriority ? null : "combo_priority",
    compatibility.hasComboSourceKey ? null : "combo_source_key",
  ].filter((column): column is string => Boolean(column));

  if (missingColumns.length === 0) {
    return undefined;
  }

  return `La base de datos de products sigue con un schema viejo (${missingColumns.join(", ")}). Dejamos compatibilidad temporal para combos, pero corré npm run db:push para completar la migración.`;
}
