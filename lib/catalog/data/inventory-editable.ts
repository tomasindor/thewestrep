import type { EditableCatalogInventorySource } from "@/lib/catalog/types";

import { editableEncargueProducts } from "@/lib/catalog/data/inventory-editable-encargue";
import { editableStockProducts } from "@/lib/catalog/data/inventory-editable-stock";

export const editableCatalogInventorySource = {
  updatedAt: "2026-03-26",
  currency: "USD",
  products: [...editableStockProducts, ...editableEncargueProducts],
} satisfies EditableCatalogInventorySource;
