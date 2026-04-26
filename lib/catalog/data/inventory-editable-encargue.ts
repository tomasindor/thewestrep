import type { EditableInventoryProduct } from "@/lib/catalog/types";

// Inventario para productos por pedido. Si un producto está en este archivo,
// availability DEBE ser "encargue".
// Mantené los mismos campos base del inventario editable y sumá leadTime
// cuando sirva para dejar claro el plazo estimado.
// Reglas prácticas:
// - coverImage debe apuntar a un asset existente en /public (ej: "/producto.jpg").
// - brand y category deben usar IDs ya definidos en brands.ts y categories.ts.
// - slug y sku deben ser únicos en stock + encargue.
export const editableEncargueProducts = [] satisfies readonly EditableInventoryProduct[];
