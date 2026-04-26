# Design: Encargue Combo Products

## Technical Approach

Implement a centralized, pure pricing engine for combos that processes cart/order items and returns the adjusted totals, applying a 30% discount to the cheapest item of each eligible top/bottom pair. This engine will be the single source of truth used by the cart UI, checkout logic, order persistence, and Mercado Pago preference generation. We will extend the `products` schema to store combo metadata (e.g., `comboGroup`, `comboSourceKey`) and rely on heuristics during the import phase to infer this data.

## Architecture Decisions

### Decision: Centralized Pure Pricing Engine
**Choice**: Create a pure function module `lib/pricing/encargue-combos.ts` that takes an array of items and returns a detailed pricing breakdown.
**Alternatives considered**: Computing discounts directly within the cart state or mutating line item prices in the DB.
**Rationale**: Eliminates drift between the storefront UI, backend checkout validation, and payment gateway (Mercado Pago). Ensures testability via simple unit tests.

### Decision: Combo Metadata Storage
**Choice**: Add specific columns or a `comboData` JSONB field in `products` and `importItems` to hold `comboEligible`, `comboGroup` (top/bottom), `comboPriority`, and `comboSourceKey`.
**Alternatives considered**: Creating a new relational `combos` table mapping product IDs.
**Rationale**: Combos are loosely coupled pairings inferred from the source (e.g., same Yupoo album). Storing metadata directly on the product simplifies the schema and catalog queries, keeping read operations fast for merchandising.

### Decision: Auditable Order Snapshots
**Choice**: Add `comboDiscountAmountArs` to the `pricingSnapshot` in the `orders` table, and avoid mutating the `unitPriceAmountArs` of individual `orderItems`.
**Alternatives considered**: Reducing the `unitPriceAmountArs` of the discounted item.
**Rationale**: Preserves the original unit price for historical accuracy and clear receipt generation, aligning with standard accounting practices.

## Data Flow

```text
[Yupoo Import] ──→ Infer combo via heuristics ──→ Store in importItems.productData
                                                            │
[Admin Review] ──→ Validates/Gating ────────────────────────┘
                                                            │ (Promotion)
                                                            ▼
[Product Catalog] ◀── Store metadata (comboGroup, sourceKey)
       │
       ▼
[Cart / Checkout] ──→ calls `lib/pricing/encargue-combos.ts`
       │
       ▼
[Orders & MPago] ◀── Engine output ensures matching totals & snapshots
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/db/schema.ts` | Modify | Add combo properties to `products` and `comboDiscountAmountArs` to `orders.pricingSnapshot`. |
| `lib/pricing/encargue-combos.ts` | Create | Pure engine to pair items, compute the 30% discount on the cheapest of the pair, and return totals. |
| `lib/orders/checkout.shared.ts` | Modify | Update `buildOrderPricingSummary` to consume the new pricing engine. |
| `lib/payments/mercadopago-preference.ts` | Modify | Add the combo discount as a global discount or negative line item in the preference body. |
| `lib/imports/heuristics.ts` | Modify | Add inference logic for `comboEligible` and `comboGroup` based on import source. |
| `components/catalog/catalog-listing-page.tsx` | Modify | Consume combo selector to display paired "Look" suggestions. |
| `components/admin/imports-review-client.tsx` | Modify | Expose confidence gating for combo inference in the admin UI. |

## Interfaces / Contracts

```typescript
export interface ComboMetadata {
  comboEligible: boolean;
  comboGroup?: "top" | "bottom";
  comboSourceKey?: string;
  comboPriority?: number;
}

export interface PricingEngineResult {
  subtotalAmountArs: number; // Sum of original prices
  comboDiscountAmountArs: number; // Total discount applied
  shippingAmountArs: number;
  assistedFeeAmountArs: number;
  totalAmountArs: number; // Final payable amount
  pairedItems: Array<{ topId: string; bottomId: string; discountArs: number }>;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `lib/pricing/encargue-combos.ts` | Test pairing logic: 1 top + 1 bot, 2 tops + 1 bot, odd items, equal prices. |
| Unit | `lib/imports/heuristics.ts` | Test combo inference and confidence gating from mock Yupoo URLs/titles. |
| Integration | Checkout Validation | Assert `totalAmountArs` matches the engine's output and is persisted correctly. |

## Migration / Rollout

No complex data migration required. Existing products will default to `comboEligible: false`. New metadata columns/JSONB paths will be ignored until the new pricing engine is actively consumed.

## Open Questions

- [ ] Does Mercado Pago prefer the combo discount as a global `discount` object, or as a negative line item in `items`?
