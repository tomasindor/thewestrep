/**
 * Script para crear marcas y categorías iniciales
 */

import { getDb } from "@/lib/db/core";
import { brands, categories } from "@/lib/db/schema";
import { createId, slugify } from "@/lib/utils";
import { loadCliEnv } from "@/lib/env/load-cli";

// Marcas del proveedor Yupoo (con nombres reales)
const BRANDS_TO_CREATE = [
  // Marcas principales de lujo
  "Gucci",
  "Nike",
  "Dior",
  "Prada",
  "Louis Vuitton",
  "Dolce & Gabbana",
  "Burberry",
  "Ralph Lauren",
  "Chrome Hearts",
  "Hugo Boss",
  "Adidas",
  "Calvin Klein",
  "Balenciaga",
  "Alexander Wang",
  "Descente",
  "Ermenegildo Zegna",
  "Karl Lagerfeld",
  "Acne Studios",
  "Ami Paris",
  "We11done",
  "Valley",
  "Moncler",
  "Hermes",
  "Dershutze",
  "Saint Vanity",
  "Saint Laurent",
  "Versace",
  "Fendi",
  "Bottega Veneta",
  "Givenchy",
  "Maison Margiela",
  "Off-White",
  "Palm Angels",
  "Stone Island",
  "Canada Goose",
  
  // Streetwear
  "Vetements",
  "Hellstar",
  "Stussy",
  "Rhude",
  "Diesel",
  "Sp5der",
  "Lululemon",
  "Bape",
  "Travis Scott",
  "Fear of God",
  "Gallery Department",
  "Corteiz",
  "Casablanca",
  "Drew",
  "Denim Tears",
  "Essentials",
  "Human Made",
  "Carhartt",
  "Comme des Garcons",
  "Dsquared2",
  "Miu Miu",
  "Jacquemus",
  "Marni",
  "Loewe",
  "Rick Owens",
  "Yohji Yamamoto",
  "Sacai",
  "Undercover",
  "Neighborhood",
  "Wtaps",
  " fragment design",
  "AMBUSH",
  "MM6 Maison Margiela",
  
  // Otras
  "Tom Ford",
  "Balmain",
  "Kenzo",
  "Moschino",
  "Valentino",
  "Lanvin",
  "Thom Browne",
  "Paul Smith",
  "Ted Baker",
  "Tommy Hilfiger",
  "Polo Ralph Lauren",
];

// Categorías de prenda
const CATEGORIES_TO_CREATE = [
  { name: "Remeras", description: "T-shirts y remeras de manga corta y larga" },
  { name: "Polos", description: "Camisas de cuello con botones" },
  { name: "Buzos", description: "Hoodies, sudaderas y buzos con capucha" },
  { name: "Camperas", description: "Chaquetas, jackets y camperas de invierno/primavera" },
  { name: "Pantalones", description: "Jeans, trousers y pantalones de vestir" },
  { name: "Shorts", description: "Bermudas y shorts deportivos/casuales" },
  { name: "Gorros", description: "Gorras, beanies y accesorios para cabeza" },
  { name: "Camisas", description: "Shirts de manga corta y larga" },
  { name: "Ropa Interior", description: "Boxers, trunks y ropa interior" },
  { name: "Bags & Accesorios", description: "Bolsos, cinturones y accesorios varios" },
  
  { name: "Sets", description: "Conjuntos y trajes de dos piezas" },
  { name: "Varios", description: "Productos que no entran en otras categorías" },
];

async function main() {
  const { activeEnvFile } = loadCliEnv();
  const db = getDb();

  if (!db) {
    throw new Error(
      `[env] DATABASE_URL is required. Put it in ${activeEnvFile ?? ".env.local"} or export in your shell.`,
    );
  }

  console.log("🏷️  Creando marcas...\n");

  let brandsCreated = 0;
  let brandsSkipped = 0;

  for (const brandName of BRANDS_TO_CREATE) {
    const trimmedName = brandName.trim();
    const slug = slugify(trimmedName);

    // Verificar si ya existe
    const existing = await db.select({ id: brands.id }).from(brands).where(
      // @ts-ignore - drizzle eq issue
      brands.slug === slug
    ).limit(1);

    if (existing.length > 0) {
      console.log(`   ⏭️  ${trimmedName} (ya existe)`);
      brandsSkipped++;
      continue;
    }

    await db.insert(brands).values({
      id: createId("brand"),
      name: trimmedName,
      slug,
      imageAlt: "",
    });

    console.log(`   ✅ ${trimmedName}`);
    brandsCreated++;
  }

  console.log(`\n📊 Marcas: ${brandsCreated} creadas, ${brandsSkipped} existentes\n`);

  console.log("📁 Creando categorías de prenda...\n");

  let categoriesCreated = 0;
  let categoriesSkipped = 0;

  for (const cat of CATEGORIES_TO_CREATE) {
    const slug = slugify(cat.name);

    // Verificar si ya existe
    const existing = await db.select({ id: categories.id }).from(categories).where(
      // @ts-ignore - drizzle eq issue
      categories.slug === slug
    ).limit(1);

    if (existing.length > 0) {
      console.log(`   ⏭️  ${cat.name} (ya existe)`);
      categoriesSkipped++;
      continue;
    }

    await db.insert(categories).values({
      id: createId("category"),
      name: cat.name,
      slug,
      description: cat.description,
      imageAlt: "",
    });

    console.log(`   ✅ ${cat.name}`);
    categoriesCreated++;
  }

  console.log(`\n📊 Categorías: ${categoriesCreated} creadas, ${categoriesSkipped} existentes\n`);

  // Mostrar resumen
  console.log("=".repeat(50));
  console.log("✅ SETUP COMPLETO");
  console.log("=".repeat(50));
  console.log(`\nAhora podés ejecutar la importación:`);
  console.log(`  npm run db:import-yupoo\n`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
