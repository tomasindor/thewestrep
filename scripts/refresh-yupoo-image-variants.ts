/**
 * Refresca variantes de imágenes Yupoo ya importadas en product_images.
 *
 * Uso:
 *   npx tsx scripts/refresh-yupoo-image-variants.ts
 *   npx tsx scripts/refresh-yupoo-image-variants.ts --apply
 *   npx tsx scripts/refresh-yupoo-image-variants.ts --product=product_123
 *   npx tsx scripts/refresh-yupoo-image-variants.ts --limit=25 --apply
 */

import { loadCliEnv } from "@/lib/env/load-cli";
import { getDbSql } from "@/lib/db/core";
import {
  extractYupooImages,
  getYupooCanonicalKey,
  getYupooVariantRank,
} from "@/lib/yupoo-core";

interface ProductImageRow {
  productId: string;
  productName: string;
  productSourceUrl: string;
  imageId: string;
  url: string;
  sourceUrl: string | null;
  position: number;
}

interface PlannedUpdate {
  productId: string;
  productName: string;
  productSourceUrl: string;
  imageId: string;
  position: number;
  currentUrl: string;
  nextUrl: string;
  currentRank: number;
  nextRank: number;
}

interface ProductImagesSchemaCompatibility {
  hasSourceUrl: boolean;
  hasProvider: boolean;
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

function parseArgs() {
  const args = process.argv.slice(2);

  return {
    apply: args.includes("--apply"),
    productId: args.find((arg) => arg.startsWith("--product="))?.split("=")[1]?.trim() || undefined,
    limit: Number.parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "", 10) || undefined,
  };
}

function isDirectYupooPhoto(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).hostname === "photo.yupoo.com";
  } catch {
    return false;
  }
}

function summarizeUpgrade(update: PlannedUpdate) {
  return [
    `product=${update.productId}`,
    `position=${update.position}`,
    `rank ${update.currentRank} → ${update.nextRank}`,
    `${update.currentUrl} -> ${update.nextUrl}`,
  ].join(" | ");
}

async function selectYupooImageRows(limit?: number, productId?: string) {
  const sql = getDbSql();
  const compatibility = await getProductImagesSchemaCompatibility();

  if (!sql) {
    throw new Error("DATABASE_URL is required to refresh Yupoo image variants.");
  }

  const sourceUrlSelection = compatibility.hasSourceUrl ? 'i.source_url' : 'i.url';
  const providerSelection = compatibility.hasProvider ? 'i.provider' : 'null::text';
  const params: Array<string | number> = [];
  const whereClauses = [
    "p.source_url is not null",
    "p.source_url ilike '%yupoo%'",
    "i.source = 'yupoo'",
    `${providerSelection} is null`,
    `coalesce(${sourceUrlSelection}, i.url) like 'https://photo.yupoo.com/%'`,
  ];

  if (productId) {
    params.push(productId);
    whereClauses.push(`p.id = $${params.length}`);
  }

  let limitClause = "";

  if (limit) {
    params.push(limit);
    limitClause = `limit $${params.length}`;
  }

  const result = await sql.query(
    `
      select
        p.id as "productId",
        p.name as "productName",
        p.source_url as "productSourceUrl",
        i.id as "imageId",
        i.url as "url",
        ${sourceUrlSelection} as "sourceUrl",
        i.position as "position"
      from product_images i
      inner join products p on p.id = i.product_id
      where ${whereClauses.join(" and ")}
      order by p.id asc, i.position asc
      ${limitClause}
    `,
    params,
  );

  return {
    rows: normalizeSqlRows<ProductImageRow>(result),
    compatibility,
    sql,
  };
}

async function getProductImagesSchemaCompatibility(): Promise<ProductImagesSchemaCompatibility> {
  const sql = getDbSql();

  if (!sql) {
    return {
      hasSourceUrl: true,
      hasProvider: true,
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
  };
}

async function planUpdates(rows: ProductImageRow[]) {
  const updates: PlannedUpdate[] = [];
  const groups = new Map<string, ProductImageRow[]>();

  for (const row of rows) {
    const productRows = groups.get(row.productId) ?? [];
    productRows.push(row);
    groups.set(row.productId, productRows);
  }

  for (const productRows of groups.values()) {
    const productSourceUrl = productRows[0]?.productSourceUrl;

    if (!productSourceUrl) {
      continue;
    }

    try {
      const refreshed = await extractYupooImages(productSourceUrl, { maxImages: Number.MAX_SAFE_INTEGER });
      const bestImageByCanonicalKey = new Map<string, string>();

      for (const candidate of refreshed.images) {
        if (!isDirectYupooPhoto(candidate)) {
          continue;
        }

        bestImageByCanonicalKey.set(getYupooCanonicalKey(candidate), candidate);
      }

      for (const row of productRows) {
        const currentUrl = row.sourceUrl ?? row.url;

        if (!isDirectYupooPhoto(currentUrl)) {
          continue;
        }

        const nextUrl = bestImageByCanonicalKey.get(getYupooCanonicalKey(currentUrl));

        if (!nextUrl || nextUrl === currentUrl) {
          continue;
        }

        const currentRank = getYupooVariantRank(currentUrl);
        const nextRank = getYupooVariantRank(nextUrl);

        if (nextRank <= currentRank) {
          continue;
        }

        updates.push({
          productId: row.productId,
          productName: row.productName,
          productSourceUrl,
          imageId: row.imageId,
          position: row.position,
          currentUrl,
          nextUrl,
          currentRank,
          nextRank,
        });
      }
    } catch (error) {
      console.warn(
        `⚠️  No pude refrescar ${productRows[0]?.productId} (${productRows[0]?.productName}):`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return updates;
}

async function applyUpdates(
  updates: PlannedUpdate[],
  options: { hasSourceUrl: boolean; sql: NonNullable<ReturnType<typeof getDbSql>> },
) {
  for (const update of updates) {
    if (options.hasSourceUrl) {
      await options.sql.query(
        `update product_images set url = $1, source_url = $2 where id = $3`,
        [update.nextUrl, update.nextUrl, update.imageId],
      );
      continue;
    }

    await options.sql.query(`update product_images set url = $1 where id = $2`, [update.nextUrl, update.imageId]);
  }
}

async function main() {
  const { activeEnvFile } = loadCliEnv();
  const args = parseArgs();

  console.log("🖼️  Refresh Yupoo image variants\n");
  console.log(`ENV: ${activeEnvFile ?? ".env.local"}`);
  console.log(`Mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`Product filter: ${args.productId ?? "all"}`);
  console.log(`Row limit: ${args.limit ?? "none"}\n`);

  const { rows, compatibility, sql } = await selectYupooImageRows(args.limit, args.productId);

  console.log(`Candidate rows: ${rows.length}`);

  if (rows.length === 0) {
    console.log("Nothing to refresh.");
    return;
  }

  const updates = await planUpdates(rows);
  const examples = updates.slice(0, 10);

  console.log(`Planned upgrades: ${updates.length}`);

  if (examples.length > 0) {
    console.log("\nExamples:");

    for (const example of examples) {
      console.log(`- ${summarizeUpgrade(example)}`);
    }
  }

  if (!args.apply) {
    console.log("\nDry-run complete. Re-run with --apply to persist changes.");
    return;
  }

  if (updates.length === 0) {
    console.log("\nNo upgrades to apply.");
    return;
  }

  await applyUpdates(updates, { hasSourceUrl: compatibility.hasSourceUrl, sql });
  console.log(`\n✅ Applied ${updates.length} updates.`);
}

main().catch((error) => {
  console.error("❌ Failed to refresh Yupoo image variants:", error);
  process.exitCode = 1;
});
