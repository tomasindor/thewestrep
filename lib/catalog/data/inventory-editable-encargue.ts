import type { EditableInventoryProduct } from "@/lib/catalog/types";

// Inventario para productos por pedido. Si un producto está en este archivo,
// availability DEBE ser "encargue".
// Mantené los mismos campos base del inventario editable y sumá leadTime
// cuando sirva para dejar claro el plazo estimado.
// Reglas prácticas:
// - coverImage debe apuntar a un asset existente en /public (ej: "/producto.jpg").
// - brand y category deben usar IDs ya definidos en brands.ts y categories.ts.
// - slug y sku deben ser únicos en stock + encargue.
export const editableEncargueProducts = [
  {
    slug: "bape-college-hoodie",
    sku: "TWR-BAP-HOOD-004",
    name: "Bape College Hoodie",
    brand: "bape",
    category: "hoodies",
    availability: "encargue",
    priceUsd: 165,
    detail: "Modelo por encargue con confirmación de talle antes de comprar.",
    note: "Arribo estimado 40-60 días",
    availabilitySummary: "Arribo estimado 40-60 días",
    leadTime: "40-60 días",
    stockNote: "Confirmación de talle y color antes de cerrar.",
    coverImage: "/demo-hoodie.svg",
    coverAlt: "Hoodie Bape de muestra",
    sizes: ["M", "L", "XL"],
    badgeLabel: "A pedido",
    featuredOnHomepage: true,
  },
  {
    slug: "corteiz-shell-jacket",
    sku: "TWR-CRT-OUT-003",
    name: "Corteiz Shell Jacket",
    brand: "corteiz",
    category: "outerwear",
    availability: "encargue",
    priceUsd: 210,
    detail: "Campera técnica para búsqueda puntual por encargue.",
    note: "Ideal para búsqueda puntual",
    availabilitySummary: "Búsqueda puntual con validación de variante.",
    leadTime: "40-60 días",
    stockNote: "Confirmación de color y talle antes de pagar.",
    coverImage: "/cover-corteiz.jpg",
    coverAlt: "Campera Corteiz de muestra",
    sizes: ["M", "L", "XL"],
    badgeLabel: "Capsule",
    featuredOnHomepage: true,
  },
  {
    slug: "carhartt-detroit-jacket",
    sku: "TWR-CHW-OUT-008",
    name: "Carhartt Detroit Jacket",
    brand: "carhartt-wip",
    category: "outerwear",
    availability: "encargue",
    priceUsd: 238,
    detail: "Chaqueta icónica disponible bajo pedido con búsqueda por color.",
    note: "Arribo estimado 40-60 días",
    availabilitySummary: "Arribo estimado 40-60 días",
    leadTime: "40-60 días",
    stockNote: "Se valida color final según disponibilidad del proveedor.",
    coverImage: "/Corteiz.webp",
    coverAlt: "Campera Carhartt de muestra",
    sizes: ["M", "L", "XL"],
    badgeLabel: "Destacado",
    featuredOnHomepage: true,
  },
] satisfies readonly EditableInventoryProduct[];
