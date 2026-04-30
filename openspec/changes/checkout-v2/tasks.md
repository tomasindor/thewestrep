# Tasks: Checkout V2 Two-Step Simplification

## Phase 1: Address/Georef Infrastructure

- [x] 1.1 Create `lib/address/georef.ts` — export `fetchProvinces()` (force-cache, 24h revalidate) and `fetchDepartamentos(provinceId: string)` — throw on failure
- [x] 1.2 Create `components/checkout/address-form.tsx` — province `<select>` (server-fetched options), city `<select>` (reactive to province, fetched via server action), address fields, recipient, notes
- [x] 1.3 Add Zod validation in `lib/orders/checkout.shared.ts` — required fields: name, phone, email, provinceId, cityId, address, recipient; optional: notes
- [ ] 1.4 Write unit tests for `lib/address/georef.ts` — mock fetch, verify cache tags and revalidate tags

## Phase 2: Simplified Checkout Schema

- [x] 2.1 Update `lib/db/schema.ts` — collapse `orders.status` to `pending_payment | paid` enum; add `provinceId`, `provinceName`, `cityId`, `cityName` nullable text fields
- [x] 2.2 Update `lib/orders/checkout.shared.ts` — remove CUIL and purchaseType; add `provinceId`, `provinceName`, `cityId`, `cityName` to `CheckoutOrderPayload`
- [x] 2.3 Update `lib/orders/repository.ts` — `createOrder()` sets `status: 'pending_payment'`; update status transition to idempotent `pending_payment → paid` only
- [x] 2.4 Update `lib/orders/history.ts` — simplify `OrderHistoryStatus` to `pending_payment | paid`
- [x] 2.5 Write unit tests for schema simplification — verify only `pending_payment` and `paid` are valid statuses

## Phase 3: Two-Step Order Creation

- [x] 3.1 Modify `POST /api/orders` — create order with `pending_payment`, return `{ orderId, reference }`, NO MP preference creation
- [x] 3.2 Create `app/(public)/checkout/[reference]/pending/page.tsx` — server component, fetch order by reference, show: reference, total, "Pendiente de pago" badge, "Pagar con Mercado Pago" button, "Coordinar por WhatsApp" button
- [x] 3.3 Modify `app/(public)/checkout/page.tsx` — on form submit, redirect to `/checkout/[reference]/pending`
- [x] 3.4 Add route guard in `app/(public)/checkout/[reference]/pending/page.tsx` — if order already `paid`, redirect to payment confirmation

## Phase 4: Payment Initiation

- [x] 4.1 Create `POST /api/orders/[id]/pay` — body: `{ method: 'mercadopago' | 'whatsapp' }`; if MP, call `lib/payments/mercadopago.ts` to create preference, return `{ checkoutUrl }`; if WA, return `{ whatsappUrl: 'https://wa.me/...'?text=...' }`
- [x] 4.2 Modify `lib/payments/mercadopago.ts` — adapt `createPreference()` to accept existing order (reference, total), return checkout URL
- [x] 4.3 Handle MP webhook: `POST /api/webhooks/mercadopago` — verify signature, update order status to `paid` (idempotent)
- [x] 4.4 Update `components/checkout/address-form.tsx` — wire MP button to `POST /api/orders/[id]/pay` with method `mercadopago`; WA button with method `whatsapp`

## Phase 5: Admin Simplified

- [x] 5.1 Modify `GET /api/admin/orders` — support `?status=pending_payment|paid` filter; return `{ reference, customerName, total, status }` per order
- [x] 5.2 Update `app/admin/(protected)/orders/page.tsx` — show orders table (reference, name, total, status badge); status filter tabs (All | Pending | Paid)
- [x] 5.3 Remove dual-status display logic in admin order detail — single `status` badge only (page does not exist, skipped)

## Phase 6: Testing

- [ ] 6.1 Write unit tests for `lib/address/georef.ts` — mock `fetch`, verify caching headers, verify `fetchDepartamentos` throws on invalid provinceId
- [ ] 6.2 Write unit tests for `lib/orders/checkout.shared.ts` — verify Zod schema rejects missing required fields, accepts valid payload
- [ ] 6.3 Write unit tests for `lib/orders/repository.ts` — `createOrder()` returns `pending_payment`; `updateStatus()` ignores transition from `paid`
- [ ] 6.4 Write integration tests for `POST /api/orders` — order created with `pending_payment`, no MP call, reference returned
- [ ] 6.5 Write integration tests for `POST /api/orders/[id]/pay` — MP returns checkout URL, WhatsApp returns wa.me URL
- [ ] 6.6 E2E: submit checkout form → redirected to pending page → click WhatsApp → wa.me opens with pre-filled message

---

## File Impact Table

| File | Action | Description |
|------|--------|-------------|
| `lib/address/georef.ts` | Create | Georef API client with Next.js cache |
| `components/checkout/address-form.tsx` | Create | Address form with province/city dropdowns |
| `lib/db/schema.ts` | Modify | Collapse status enum, add province/city fields |
| `lib/orders/checkout.shared.ts` | Modify | Remove CUIL/purchaseType, add provinceId/cityId |
| `lib/orders/repository.ts` | Modify | Single status field, idempotent paid transition |
| `lib/orders/history.ts` | Modify | Simplify OrderHistoryStatus |
| `lib/payments/mercadopago.ts` | Modify | Accept existing order, return checkout URL |
| `app/(public)/checkout/page.tsx` | Modify | Submit → redirect to pending screen |
| `app/(public)/checkout/[reference]/pending/page.tsx` | Create | Pending payment screen |
| `app/api/orders/route.ts` | Modify | Create pending_payment order, no MP |
| `app/api/orders/[id]/pay/route.ts` | Create | Payment initiation endpoint |
| `app/api/webhooks/mercadopago/route.ts` | Modify | Idempotent paid update |
| `GET /api/admin/orders/route.ts` | Modify | Status filter only |
| `app/admin/(protected)/orders/page.tsx` | Modify | Simplified order list |