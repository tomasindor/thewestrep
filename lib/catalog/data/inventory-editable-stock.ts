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
export const editableStockProducts = [] satisfies readonly EditableInventoryProduct[];
