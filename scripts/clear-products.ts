/**
 * Script para limpiar todos los productos antes de reimportar
 */
import { getDb } from "@/lib/db/core";
import { productImages, productSizes, productVariants, products } from "@/lib/db/schema";
import { loadCliEnv } from "@/lib/env/load-cli";

async function main() {
  const { activeEnvFile } = loadCliEnv();
  const db = getDb();

  if (!db) {
    throw new Error(`DATABASE_URL is required. Put it in ${activeEnvFile ?? ".env.local"}`);
  }

  console.log("🗑️  Eliminando productos existentes...\n");

  // Delete in correct order (respect foreign keys)
  await db.delete(productImages);
  console.log("   ✅ Imágenes eliminadas");
  
  await db.delete(productSizes);
  console.log("   ✅ Talles eliminados");
  
  await db.delete(productVariants);
  console.log("   ✅ Variantes eliminadas");
  
  await db.delete(products);
  console.log("   ✅ Productos eliminados");

  console.log("\n✅ Base de datos limpia - listo para reimportar");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
