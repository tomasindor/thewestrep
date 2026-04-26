# Specification: Encargue Combo Products

## Overview

This specification defines the implementation requirements for **Encargue Combo Products** — a feature that enables automatic combo pricing for eligible product pairs (top + bottom) in the encargue catalog, with centralized pricing logic, merchandising surfaces, and consistent behavior across cart, checkout, payments, and order persistence.

## Goals

1. **Pricing Consistency**: Ensure cart, checkout, Mercado Pago, and order persistence display identical combo pricing with auditable snapshots
2. **Automated Inference**: Enable importer to infer combo groups from product metadata with confidence gating
3. **Merchandising Integration**: Surface combo opportunities in PDP, listings, and homepage without breaking existing encargue flows
4. **Clean Architecture**: Maintain server-only boundaries for pricing logic; no drift between UI calculation and persisted state

---

## Requirements

### REQ-1: Product Metadata & Eligibility

**REQ-1.1: Combo Metadata Schema**
The `products` table MUST be extended with the following optional columns:

| Column | Type | Description |
|--------|------|-------------|
| `combo_eligible` | `boolean` | Whether product participates in combos |
| `combo_group` | `text` | Group identifier (e.g., "look-2026-01", "winter-drop") |
| `combo_priority` | `integer` | Priority for matching (lower = higher priority) |
| `combo_source_key` | `text` | Source of combo definition (e.g., "importer-look", "manual-curation") |

**REQ-1.2: Import Items Combo Metadata**
The `import_items` table MUST support combo metadata in `product_data` JSONB:

```typescript
interface ComboProductData {
  comboEligible?: boolean;
  comboGroup?: string;
  comboPriority?: number;
  comboSourceKey?: string;
  comboScore?: number; // Inference confidence 0-1
}
```

**REQ-1.3: Eligibility Rules**
A product is combo-eligible if:
- `combo_eligible = true` AND
- `combo_group` is non-empty AND
- Product `type = 'encargue'` AND
- Product `state = 'published'`

**REQ-1.4: Type Safety**
The `Product` interface in `lib/catalog/types.ts` MUST be extended:

```typescript
export interface Product {
  // ... existing fields
  comboEligible?: boolean;
  comboGroup?: string;
  comboPriority?: number;
  comboSourceKey?: string;
  comboScore?: number; // Inference confidence
}
```

---

### REQ-2: Centralized Pricing Engine

**REQ-2.1: Pricing Module Location**
Create `lib/pricing/encargue-combos.ts` as a **server-only** module.

**REQ-2.2: Pairing Algorithm**
The engine MUST implement the following matching logic:

1. **Group by `combo_group`**: Only products with matching `combo_group` can pair
2. **Separate tops from bottoms**: Use category heuristics:
   - Tops: "remeras", "camisas", "buzos", "hoodies", "camperas", "tops"
   - Bottoms: "pantalones", "shorts", "pants", "trousers", "jeans"
3. **Sort by price ascending**: Within each group, sort tops and bottoms by `price_ars` ascending
4. **Pair by rank**: Pair top[i] with bottom[i] (rank 0 with rank 0, etc.)
5. **Apply discount**: 30% off the **lower-priced item** in each pair

**REQ-2.3: Pricing Function Signature**
```typescript
interface ComboPricingResult {
  originalTotal: number;
  comboDiscount: number;
  finalTotal: number;
  appliedToProductId: string; // Which product got the discount
  appliedToProductName: string;
  discountAmount: number;
  pairingReason: string; // Human-readable explanation
}

function calculateComboPricing(
  cartItems: Array<{
    productId: string;
    productSlug: string;
    priceArs: number;
    comboGroup?: string;
    comboPriority?: number;
  }>
): ComboPricingResult | null;
```

**REQ-2.4: Purity Requirement**
The pricing engine MUST be a **pure function** (no side effects, no external dependencies) to ensure consistent results across cart, checkout, and order persistence.

**REQ-2.5: Snapshot Persistence**
When an order is created, the `order_items.item_snapshot` MUST include:

```typescript
interface OrderItemSnapshot {
  // ... existing fields
  comboDiscount?: {
    amountArs: number;
    reason: string;
    pairedWithProductId?: string;
    pairedWithProductName?: string;
  };
}
```

---

### REQ-3: Importer/Scraper Inference

**REQ-3.1: Inference Heuristics**
The importer MUST infer combo groups from Yupoo album titles and product data using these rules:

1. **Album-based grouping**: Products from the same Yupoo album with "look", "outfit", "set", or "combo" in title → same `combo_group`
2. **Explicit markers**: Product data containing `combo_group`, `look_id`, or `set_id` → use as `combo_group`
3. **Brand + Season**: If no explicit group, infer from brand + season keywords (e.g., "winter-2026", "ss26")

**REQ-3.2: Confidence Scoring**
Each inferred combo MUST have a confidence score (0.0 - 1.0):

| Score Range | Confidence Level | Action |
|-------------|------------------|--------|
| 0.8 - 1.0 | High | Auto-promote as combo |
| 0.5 - 0.79 | Medium | Flag for review |
| 0.0 - 0.49 | Low | Do not merchandise as combo |

**REQ-3.3: Confidence Factors**
```typescript
function calculateComboConfidence(factors: {
  hasExplicitGroup: boolean;       // +0.5
  albumTitleMatch: boolean;        // +0.3
  brandConsistency: boolean;       // +0.1
  priceRangeConsistency: boolean;  // +0.1
  hasMultipleProducts: boolean;    // +0.2
}): number
```

**REQ-3.4: Low Confidence Fallback**
Products with `comboScore < 0.5`:
- MUST NOT be automatically merchandised as combo
- MUST be visible in admin imports review with `comboScore` displayed
- CAN be manually promoted by setting `combo_eligible = true` and `combo_group` explicitly

---

### REQ-4: PDP Promo Messaging & "Completá el look"

**REQ-4.1: PDP Rail Component**
On PDP pages for combo-eligible products, display a **"Completá el look"** rail showing:
- Paired products from the same `combo_group`
- Original price vs combo price
- "Agregar ambos al carrito" CTA

**REQ-4.2: Component Location**
Create `components/catalog/combo-rail.tsx` (Server Component):

```typescript
interface ComboRailProps {
  product: Product;
  comboGroup: string;
  availability: 'encargue' | 'stock';
}
```

**REQ-4.3: Messaging Rules**
- If product has a combo pair: "✨ Este producto forma parte de un look. Ahorrá 30% en la prenda más barata."
- If product is in cart with combo pair: "🎉 ¡Tenés un combo! Descuento aplicado en el carrito."
- If product combo score is low: No combo messaging shown

**REQ-4.4: Cart Integration**
When both products of a combo are in cart:
- Display line item: "Combo: [Top Name] + [Bottom Name]"
- Show original total and discounted total
- Apply discount to lower-priced item

---

### REQ-5: Listing/Home/Landing Merchandising

**REQ-5.1: Listing Card Badge**
Product cards for combo-eligible products MUST show:
- Small badge: "Combo disponible" if `combo_eligible = true`
- Tooltip on hover: "Ahorrá 30% combinando con [other product name]"

**REQ-5.2: Homepage Hero Section**
If there are active combo groups:
- Display featured combo pairs in homepage hero
- Show both products side-by-side
- CTA: "Ver look completo"

**REQ-5.3: Landing Page Support**
Create `app/encargue/combos/page.tsx` (optional landing page):
- Lists all active combo groups
- Filterable by brand, season, price range
- Each combo shows top + bottom with discount highlighted

**REQ-5.4: SEO Considerations**
- Combo products should retain individual product URLs
- Landing page should have meta title: "Combos Encargue | TheWestRep"

---

### REQ-6: Cart, Checkout & Mercado Pago Consistency

**REQ-6.1: Cart Pricing Display**
The cart MUST:
- Show combo discount as a separate line item: `Descuento combo: -$X.XXX`
- Display which products triggered the discount
- Update in real-time when combo items are added/removed

**REQ-6.2: Checkout Payload Extension**
Extend `CheckoutOrderItemSchema` in `lib/orders/checkout.shared.ts`:

```typescript
export const checkoutOrderItemSchema = z.object({
  // ... existing fields
  comboDiscount?: z.object({
    amountArs: z.number(),
    reason: z.string(),
    pairedWithProductId: z.string(),
  }),
});
```

**REQ-6.3: Mercado Pago Preference**
The Mercado Pago preference body MUST include:
- `items`: Individual line items with original prices
- `discounts`: Separate discount line for combo discount
- `external_reference`: Order reference (unchanged)

**REQ-6.4: Order Persistence**
When persisting orders:
- `order_items.line_total_amount_ar` MUST reflect post-discount price
- `order_items.item_snapshot.comboDiscount` MUST include discount metadata
- `orders.pricing_snapshot` MUST include combo discount breakdown

**REQ-6.5: No Drift Guarantee**
The same `calculateComboPricing` function MUST be used in:
- Cart pricing calculation
- Checkout validation
- Mercado Pago preference generation
- Order persistence

---

### REQ-7: Auditing & Internal Visibility

**REQ-7.1: Admin Combo Review**
In `app/admin/(protected)/imports/page.tsx`:
- Show `comboScore` for each import item
- Allow manual override of `combo_eligible` and `combo_group`
- Show confidence breakdown (why score is X)

**REQ-7.2: Order Admin View**
In order detail admin view:
- Show combo discount breakdown per item
- Link to paired product
- Show original vs discounted price

**REQ-7.3: Analytics Events**
Track these events (if analytics is implemented):
- `combo_view`: User viewed combo rail on PDP
- `combo_add_to_cart`: User added both combo items to cart
- `combo_discount_applied`: Combo discount applied in checkout

---

## Technical Design

### Database Migrations

```sql
-- Add combo metadata to products
ALTER TABLE products ADD COLUMN combo_eligible BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN combo_group TEXT;
ALTER TABLE products ADD COLUMN combo_priority INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN combo_source_key TEXT;

-- Add combo_score to import_items (stored in product_data JSONB, no schema change needed)
-- product_data->>'comboScore'::numeric
```

### Module Structure

```
lib/
├── pricing/
│   └── encargue-combos.ts         # REQ-2: Centralized pricing engine
├── catalog/
│   ├── combo-selectors.ts         # Combo product queries
│   └── combo-inference.ts         # Importer inference logic
├── orders/
│   └── combo-snapshots.ts         # Order item snapshot helpers
└── payments/
    └── combo-mercadopago.ts       # MP preference with combo discounts

components/
├── catalog/
│   ├── combo-rail.tsx             # PDP combo rail
│   └── combo-badge.tsx            # Listing card badge
├── marketing/
│   ├── combo-hero.tsx             # Homepage hero
│   └── combos-landing.tsx         # Landing page
└── admin/
    └── combo-review-client.tsx    # Admin review UI
```

### Pricing Engine Implementation Sketch

```typescript
// lib/pricing/encargue-combos.ts
import "server-only";

const TOP_CATEGORIES = ["remeras", "camisas", "buzos", "hoodies", "camperas", "tops"];
const BOTTOM_CATEGORIES = ["pantalones", "shorts", "pants", "trousers", "jeans"];
const COMBO_DISCOUNT_RATE = 0.30;

interface ComboProduct {
  productId: string;
  productSlug: string;
  priceArs: number;
  comboGroup: string;
  categorySlug: string;
  name: string;
}

export function calculateComboPricing(items: ComboProduct[]): ComboPricingResult | null {
  // 1. Group by combo_group
  const byGroup = groupBy(items, 'comboGroup');
  
  let totalDiscount = 0;
  let appliedDiscount: { productId: string; amount: number } | null = null;
  
  for (const [group, products] of Object.entries(byGroup)) {
    if (products.length < 2) continue;
    
    // 2. Separate tops and bottoms
    const tops = products.filter(p => isTopCategory(p.categorySlug));
    const bottoms = products.filter(p => isBottomCategory(p.categorySlug));
    
    if (tops.length === 0 || bottoms.length === 0) continue;
    
    // 3. Sort by price ascending
    tops.sort((a, b) => a.priceArs - b.priceArs);
    bottoms.sort((a, b) => a.priceArs - b.priceArs);
    
    // 4. Pair by rank (top[0] with bottom[0])
    const minLen = Math.min(tops.length, bottoms.length);
    for (let i = 0; i < minLen; i++) {
      const top = tops[i];
      const bottom = bottoms[i];
      
      // 5. Apply 30% off lower-priced item
      const lowerPrice = Math.min(top.priceArs, bottom.priceArs);
      const discount = Math.round(lowerPrice * COMBO_DISCOUNT_RATE);
      
      totalDiscount += discount;
      appliedDiscount = {
        productId: lowerPrice === top.priceArs ? top.productId : bottom.productId,
        amount: discount,
      };
    }
  }
  
  if (totalDiscount === 0) return null;
  
  return {
    originalTotal: items.reduce((sum, item) => sum + item.priceArs, 0),
    comboDiscount: totalDiscount,
    finalTotal: items.reduce((sum, item) => sum + item.priceArs, 0) - totalDiscount,
    appliedToProductId: appliedDiscount!.productId,
    appliedToProductName: items.find(i => i.productId === appliedDiscount!.productId)!.name,
    discountAmount: appliedDiscount!.amount,
    pairingReason: `Combo: ${tops.length} tops + ${bottoms.length} bottoms del mismo grupo`,
  };
}
```

---

## Testing Strategy

### Unit Tests
- **Pricing engine**: Test pairing algorithm with various product combinations
- **Confidence scoring**: Test inference heuristics with mock product data
- **Snapshot generation**: Test order item snapshot serialization

### Integration Tests
- **Cart → Checkout flow**: Verify combo discount persists through checkout
- **Mercado Pago preference**: Validate discount appears correctly in MP
- **Order persistence**: Verify snapshot is queryable and auditable

### E2E Tests (Playwright)
- User adds top + bottom from same combo group → sees discount in cart
- User proceeds to checkout → discount persists
- User completes payment → order shows combo discount
- Admin views order → can see combo breakdown

---

## Rollback Plan

If issues arise:

1. **Disable surfaces**: Set feature flag to hide combo rail, badges, and landing page
2. **Disable discount**: Return `null` from `calculateComboPricing` to skip discount application
3. **Revert pricing**: Orders already placed retain snapshots; new orders use standard pricing
4. **Data cleanup**: Run migration to set `combo_eligible = false` on all products

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Combo attach rate | >15% of encargue orders | % orders with combo discount |
| AOV lift | +10% for combo orders | Avg order value comparison |
| Checkout completion | No degradation | Compare to baseline |
| Admin review time | <5min per batch | Time to review low-confidence combos |

---

## Dependencies

- [ ] Drizzle migration for `products.combo_*` columns
- [ ] Unit tests for pricing engine (`lib/pricing/encargue-combos.test.ts`)
- [ ] E2E tests for cart → checkout → order flow
- [ ] Admin UI updates for combo review
- [ ] PDP and listing component updates

---

## Open Questions

1. **Combo stacking**: Can a product belong to multiple combo groups? (Currently: No, single `combo_group`)
2. **Quantity handling**: If user adds 2x top + 1x bottom, does discount apply twice? (Currently: No, 1:1 pairing only)
3. **Manual override**: Can admins manually create combo groups in admin UI? (Currently: Out of scope, only via import inference)

---

## Appendix A: Example Combo Scenario

**Scenario**: Customer browses encargue catalog

1. **PDP View**: Customer views "Buzo Nike Gris" (combo_group: "winter-2026", price: $50.000)
2. **Combo Rail**: Shows "Pantalón Nike Gris" (combo_group: "winter-2026", price: $40.000) with message: "Comprá juntos y ahorrá 30% en el más barato"
3. **Add to Cart**: Customer clicks "Agregar ambos" → cart now has both items
4. **Cart View**: 
   - Buzo Nike Gris: $50.000
   - Pantalón Nike Gris: $40.000
   - Descuento combo: -$12.000 (30% of $40.000)
   - **Total: $78.000**
5. **Checkout**: Discount persists, Mercado Pago shows $78.000
6. **Order**: Snapshot includes `comboDiscount: { amountArs: 12000, pairedWithProductId: "buzo-nike-gris-id" }`

---

## Appendix B: Confidence Score Calculation Examples

| Scenario | Explicit Group | Album Match | Brand Match | Price Range | Score | Action |
|----------|---------------|-------------|-------------|-------------|-------|--------|
| Yupoo album "Winter Look 2026" with 4 products | Yes (+0.5) | Yes (+0.3) | Yes (+0.1) | Yes (+0.1) | 1.0 | Auto-promote |
| Import with `combo_group: "look-001"` in metadata | Yes (+0.5) | No | Yes (+0.1) | Yes (+0.1) | 0.7 | Flag for review |
| Random encargue products, same brand | No | No | Yes (+0.1) | Yes (+0.1) | 0.2 | No combo |
