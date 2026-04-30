# Design: Checkout V2 Two-Step Simplification

## Technical Approach

Replace the current single-step checkout form + immediate payment intent with a decoupled two-step process: First create an order in `pending_payment` state, then redirect to a post-order screen where the customer initiates payment (Mercado Pago or WhatsApp). Address selection will be enhanced with a server-cached Georef integration to enforce valid Argentina locations while keeping fallback paths.

## Architecture Decisions

### Decision: Order State Model Simplification

**Choice**: Use a single `status` field (`pending_payment` | `paid`) on the `orders` table, effectively ignoring the separate `paymentStatus` and `orderStatus` complexities for V2.
**Alternatives considered**: Keeping `paymentStatus` and `orderStatus` separate.
**Rationale**: The business requirement collapses states. Only two states matter right now: unpaid and paid. Separating them adds unnecessary UI and webhook complexity.

### Decision: Georef API Integration Strategy

**Choice**: Implement `lib/address/georef.ts` with Next.js `fetch` `force-cache` and `revalidate` (e.g. 24h) for provinces, and Server Actions for cities dependent on province. Store both IDs and names on the order (`provinceId`, `provinceName`, `cityId`, `cityName`).
**Alternatives considered**: Client-side fetch directly to Georef, or npm package.
**Rationale**: Client-side fetching exposes the user's browser to direct Georef outages. Server actions/caching insulate the client and avoid CORS/npm bloat. Storing names guarantees history won't break if Georef updates IDs.

### Decision: Two-Step Payment Initiation

**Choice**: `POST /api/orders` creates the order. A new endpoint `POST /api/orders/[id]/pay` will be called from the new `/checkout/[reference]/pending` screen to actually hit Mercado Pago or generate the WhatsApp message.
**Alternatives considered**: MP preference generation inside `POST /api/orders`.
**Rationale**: V1 created the preference immediately, coupling order validation with MP availability. By separating them, order creation is fast and guaranteed, while MP can fail independently without losing the order intent.

## Data Flow

    [Checkout Form] ──(POST /api/orders)──→ [DB: Create pending_payment order]
           │                                          │
           ▼                                          ▼
    [Redirect to /checkout/[ref]/pending] ←───────────┘
           │
           ├─(MP Button)──(POST /api/orders/[id]/pay)──→ [Mercado Pago API]
           │
           └─(WA Button)──(POST /api/orders/[id]/pay)──→ [WhatsApp URL Redirect]

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/(public)/checkout/[reference]/pending/page.tsx` | Create | Post-order pending payment screen |
| `app/api/orders/[id]/pay/route.ts` | Create | Initiates MP checkout or WA link from existing order |
| `lib/address/georef.ts` | Create | Georef API client with Next.js cache |
| `components/checkout/address-form.tsx` | Create | Form fields with province/city dropdowns |
| `lib/db/schema.ts` | Modify | Collapse statuses, add province/city fields to `orders` |
| `lib/orders/checkout.shared.ts` | Modify | Simplify form schema (remove CUIL, keep province/city) |
| `lib/orders/repository.ts` | Modify | Update order creation to use single status |
| `app/api/orders/route.ts` | Modify | Remove MP preference generation |
| `lib/payments/mercadopago.ts` | Modify | Adapt preference creation to accept existing order |
| `app/admin/(protected)/orders/page.tsx` | Modify | Simplify order list to only `pending_payment`/`paid` |

## Interfaces / Contracts

```typescript
// Georef API Cache
export interface GeorefLocation {
  id: string;
  name: string;
}

// Order Form
export interface CheckoutOrderPayload {
  customer: {
    name: string;
    phone: string;
    email: string;
    provinceId: string;
    provinceName: string;
    cityId: string;
    cityName: string;
    address: string;
    recipient: string;
    notes?: string;
  };
  items: CheckoutOrderItem[];
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Georef cache functions | Mock `fetch` and verify cache tags/revalidation |
| Unit | Checkout schema validation | Test missing fields, verify CUIL is not required |
| Integration | `POST /api/orders` | Verify order is created as `pending_payment` without MP call |
| Integration | `POST /api/orders/[id]/pay` | Verify MP preference is generated and returned |
| E2E | Checkout form flow | Submit form → redirect to pending → click WhatsApp |

## Migration / Rollout

No migration required for V1 orders. Existing orders will retain their string statuses, but the schema update will require a Drizzle migration to collapse the enum if V1 states are removed from the DB constraint, or we just map V1 states to `paid`/`pending_payment` on read. For safety, we will leave existing enum values in the database but strictly use `pending_payment` and `paid` for V2.

## Open Questions

- [ ] Will we eventually drop V1 order enum values from the DB or just ignore them?