# Design: Split Checkout Runtime Boundaries

## Technical Approach

We will resolve the Next.js 16.2.1 `node:crypto` client-side build error by separating checkout logic into explicit runtime boundaries. We will deprecate `lib/orders/checkout.ts` and replace it with two targeted files: `lib/orders/checkout.shared.ts` (isomorphic, safe for client and server) and `lib/orders/checkout.server.ts` (strictly for server execution). Consumers will be updated to import from the appropriate new location.

## Architecture Decisions

### Decision: Boundary Split

**Choice**: Split `checkout.ts` into `checkout.shared.ts` (schemas, formatters, domain logic) and `checkout.server.ts` (reference generation relying on Node internals).
**Alternatives considered**: Mock `node:crypto` in webpack/Next.js config or remove the dependency entirely in favor of a client-safe UUID.
**Rationale**: Mocking bundlers is brittle and anti-pattern in modern Next.js. `crypto.randomUUID()` is preferred in Node.js environments for performance and security. A physical boundary guarantees the client bundle will never try to resolve `node:crypto`.

### Decision: Import Path Updates (Migration Strategy)

**Choice**: Directly update consumers (`use-checkout-controller.ts`, `route.ts`, `repository.ts`) to point to the new files instead of creating a facade.
**Alternatives considered**: Keep `checkout.ts` as a barrel file re-exporting shared and server logic.
**Rationale**: A barrel file containing server-only exports would re-introduce the same `node:crypto` bundle error for client components. Explicit imports per runtime avoid bundler bleeding.

## Data Flow

    [Client Components] ─── imports from ────→ [checkout.shared.ts]
                                                    │
    [Server API/Actions] ── imports from ────→ [checkout.shared.ts] (Schemas/Payloads)
           │
           └─────────────── imports from ────→ [checkout.server.ts] (buildOrderReference)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/orders/checkout.shared.ts` | Create | Contains all Zod schemas, types, pricing logic, formatting tools. |
| `lib/orders/checkout.server.ts` | Create | Contains `import "server-only"` and `buildOrderReference` logic. |
| `lib/orders/checkout.ts` | Delete | Removed completely to eliminate the mixed boundary. |
| `hooks/use-checkout-controller.ts` | Modify | Update imports to point to `checkout.shared.ts`. |
| `app/api/orders/route.ts` | Modify | Update imports to point to `checkout.shared.ts`. |
| `lib/orders/repository.ts` | Modify | Update imports for shared types and `checkout.server.ts` for reference logic. |

## Interfaces / Contracts / Compatibility Constraints

No changes to external interfaces. `CheckoutOrderPayload` and `OrderPricingSummary` are moved intact to `checkout.shared.ts`.

Compatibility Constraints:
- `checkout.server.ts` MUST NOT be imported by any file in `components/`, `hooks/`, or any other client-side file.
- `checkout.shared.ts` MUST NOT import any Node.js built-ins (`node:crypto`, `fs`, `path`, etc.).

```typescript
// checkout.server.ts
import "server-only";
export function buildOrderReference(now?: Date): string;

// checkout.shared.ts
export const checkoutOrderPayloadSchema: z.ZodObject<...>;
export type CheckoutOrderPayload = z.infer<typeof checkoutOrderPayloadSchema>;
export function buildOrderPricingSummary(payload: CheckoutOrderPayload): OrderPricingSummary;
// ... (other pure utilities)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Imports and bundle boundaries | Rely on Next.js build validation and TS compiler to verify client builds succeed without `node:crypto`. |
| Integration | Order submission flow | Ensure `POST /api/orders` still creates an order successfully using the new split module. |
| Unit | Pure utilities | Verify schemas and `buildOrderPricingSummary` logic still passes in `checkout.shared.ts`. |

## Migration / Rollout

No data migration required. The split is purely structural and transparent to the database and existing user data.

## Open Questions

- [ ] None.