import type { EditableInventoryProduct } from "@/lib/catalog/types";

// Inventario para entrega inmediata. Si un producto está en este archivo,
// availability DEBE ser "stock".
// Campos base para editar sin romper el mapper: slug, sku, name, brand,
// category, availability, priceUsd, detail, note, availabilitySummary,
// coverImage y coverAlt.
// Reglas prácticas:
// - coverImage debe apuntar a un asset existente en /public (ej: "/producto.jpg").
// - brand y category deben usar IDs ya definidos en brands.ts y categories.ts.
// - slug y sku deben ser únicos en stock + encargue.
export const editableStockProducts = [
  {
    slug: "essentials-core-hoodie",
    sku: "TWR-ESS-HOOD-001",
    name: "Essentials Core Hoodie",
    brand: "essentials",
    category: "hoodies",
    availability: "stock",
    priceUsd: 148,
    detail: "Hoodie de algodón pesado con fit relajado.",
    note: "Entrega coordinada en 24/48 hs",
    availabilitySummary: "Entrega coordinada en 24/48 hs",
    stockNote: "Quedan pocas unidades en talles centrales.",
    coverImage: "/bape.jpg",
    coverAlt: "Hoodie Essentials de muestra",
    sizes: [
      { label: "M", quantity: 1 },
      { label: "L", availability: "low-stock", quantity: 1 },
      { label: "XL", quantity: 2 },
    ],
    badgeLabel: "Nuevo",
    featuredOnHomepage: true,
  },
  {
    slug: "stussy-basic-tee",
    sku: "TWR-STU-TEE-002",
    name: "Stüssy Basic Tee",
    brand: "stussy",
    category: "tees",
    availability: "stock",
    priceUsd: 78,
    detail: "Remera regular fit en variantes blanco y negro.",
    note: "Talles S al XL",
    availabilitySummary: "Talles S al XL",
    stockNote: "Reposición rápida en blanco y negro.",
    coverImage: "/demo-tee.svg",
    coverAlt: "Remera Stüssy de muestra",
    sizes: [
      { label: "S", quantity: 1 },
      { label: "M", quantity: 2 },
      { label: "L", availability: "low-stock", quantity: 1 },
      { label: "XL", quantity: 1 },
    ],
    badgeLabel: "Más pedido",
    featuredOnHomepage: true,
  },
  {
    slug: "new-era-59fifty",
    sku: "TWR-NE-HAT-006",
    name: "New Era 59FIFTY",
    brand: "new-era",
    category: "accesorios",
    availability: "stock",
    priceUsd: 62,
    detail: "Gorra fitted con combinaciones seleccionadas.",
    note: "Modelos seleccionados en stock",
    availabilitySummary: "Modelos seleccionados en stock",
    stockNote: "Talles 7 1/4 a 7 1/2 con unidades limitadas.",
    coverImage: "/demo-cap.svg",
    coverAlt: "Gorra New Era de muestra",
    sizes: [
      { label: "7 1/4", availability: "low-stock", quantity: 1 },
      { label: "7 3/8", quantity: 2 },
      { label: "7 1/2", quantity: 1 },
    ],
    badgeLabel: "Reposición",
    featuredOnHomepage: true,
  },
] satisfies readonly EditableInventoryProduct[];
