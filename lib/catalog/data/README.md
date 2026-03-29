# Catalog data quick guide

Use `inventory-editable-stock.ts` for immediate delivery and `inventory-editable-encargue.ts` for by-order products. The mapper joins both files automatically in `inventory-editable.ts`.

## Edit only these rules

- **Required per product**: `slug`, `sku`, `name`, `brand`, `category`, `availability`, `priceUsd`, `detail`, `note`, `availabilitySummary`, `coverImage`, `coverAlt`.
- **Stock vs encargue**: keep `availability: "stock"` inside the stock file and `availability: "encargue"` inside the encargue file.
- **Images**: use paths that exist under `/public`, for example `"/producto.jpg"`.
- **Brand/category consistency**: `brand` must match an `id` from `brands.ts`; `category` must match an `id` from `categories.ts`.
- **Unique IDs**: `slug` and `sku` must stay unique across BOTH editable files.
- **Sizes**: stock products usually carry `{ label, quantity }`; encargue can stay with simple labels like `"M"`, `"L"`.

If a product breaks one of these rules, `lib/catalog/data/inventory.ts` will fail fast during validation.
