# Proposal: Checkout V2 Two-Step Simplification

## Intent

Redesign V1 checkout (`openspec/changes/prd-checkout-v1`) into a smaller two-step flow: create a `pending_payment` order first, then pay via Mercado Pago or WhatsApp. This replaces V1 complexity; it is not an additive checkout variant.

## Scope

### In Scope
- Two-step customer flow: order form → post-order payment screen.
- Simplified form: name, phone, email, street address, province dropdown, city dropdown, recipient, optional notes.
- Order states only: `pending_payment` → `paid`.
- Post-order screen with reference, amount, pending-payment status, MP button, WhatsApp button.
- Georef API province/city integration using server-side cached fetches; no npm package.

### Out of Scope
- CUIL, purchase-type selector, delivery coordination copy, long explanatory text.
- V1 separate payment status entity, 24h expiry rules, admin audit/approval flows.
- Fulfillment states, shipment automation, refunds, fiscal invoicing, order history.
- V3: manual admin payment capture, richer fulfillment, more granular localidades/CP validation.

## Capabilities

### New Capabilities
- `georef-location-selection`: Argentine province/city dropdown behavior and fallback/error handling.

### Modified Capabilities
- `checkout-ordering`: Replace V1 form/state requirements with minimal order-before-payment flow.
- `hybrid-payments`: Keep MP/WhatsApp options, but require an existing pending order and collapse states to paid/unpaid.
- `admin-order-operations`: Limit V2 admin visibility to `pending_payment`/`paid`, filtering, and read-only details.
- `order-notifications`: Defer V1 confirmation email unless specs decide minimal notification remains required.

## Approach

Follow strict TDD. Specs should supersede V1 checkout requirements where they conflict. Fetch provinces in Server Components or server utilities with Next.js cache/revalidate; fetch dependent cities/departments by province through a server route/action to avoid client coupling to Georef. Persist Georef IDs + labels on the order to keep historical addresses stable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(public)/checkout/` | Modified | Two-step checkout and post-order screen. |
| `app/api/orders/`, `lib/orders/` | Modified | Minimal order creation and states. |
| `lib/payments/`, MP routes | Modified | Pay only after order reference exists. |
| `lib/checkout/georef*` | New | Cached Georef fetching/mapping. |
| `app/admin/(protected)/`, `lib/db/schema.ts` | Modified | State simplification and address fields. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| V1/V2 requirement conflict | High | Specs explicitly mark V1 behavior replaced/deferred. |
| Georef API latency/outage | Med | Server caching, graceful retry, fallback validation message. |
| Address taxonomy mismatch | Med | Store IDs + labels; allow notes for clarifications. |
| Payment webhook/state race | Med | Idempotent transition: only `pending_payment` can become `paid`. |

## Rollback Plan

Keep V1 artifacts as reference. If V2 fails, revert checkout routes/lib/schema changes and temporarily route checkout to existing WhatsApp-assisted flow while MP order creation is disabled.

## Dependencies

- V1 proposal/specs in `openspec/changes/prd-checkout-v1`.
- Engram PRD topics `checkout/prd-v2` (#1239) and `checkout/prd-v2/georef` (#1240).
- Georef API (`apis.datos.gob.ar`), Mercado Pago config, WhatsApp channel, product totals source.

## Success Criteria

- [ ] Specs/tests cover order creation before payment and MP/WhatsApp paths.
- [ ] Users submit the minimal form without CUIL or purchase-type friction.
- [ ] Province → city dropdown works with cached Georef data and failure handling.
- [ ] Pending orders survive MP failure and can still use WhatsApp.
- [ ] Admin sees/filter orders only by `pending_payment` or `paid`.
