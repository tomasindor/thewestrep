# Design: Login Register Auth

## Technical Approach

We will migrate customer authentication to a **Custom Server Architecture** using database-backed sessions, while retaining NextAuth v4 strictly for admin login. This provides total isolation between admin and customer privileges, enables individual session revocation, and supports a robust email verification gate before checkout.

## Architecture Decisions

### Decision: Auth Strategy

**Choice**: Custom database sessions for customers, retain NextAuth v4 for admin.
**Alternatives considered**:
- Evolve within NextAuth v4: Rejected due to shared `authOptions` coupling and JWT's inability to individually revoke sessions.
- Migrate to Auth.js (v5): Rejected due to high migration risk for ecommerce and breaking API changes.
**Rationale**: Database sessions (`httpOnly` cookies + Postgres table) allow session revocation (critical for ecommerce on password reset), explicit email verification gating, and completely isolate the public customer attack surface from the admin area.

### Decision: Rate Limiting

**Choice**: Database-backed rate limiting table via Drizzle.
**Alternatives considered**: Redis / Upstash / In-memory.
**Rationale**: In-memory fails on serverless. Assuming we want to minimize new infrastructural dependencies, a `rate_limits` table with an expiration timestamp provides reliable cross-instance limits for auth endpoints without adding Redis.

### Decision: Redirect Context

**Choice**: Query parameter `?returnUrl` passed through auth flows.
**Alternatives considered**: Cookie-based intent tracking.
**Rationale**: `returnUrl` is stateless, shareable, and simpler to implement. It must be validated to ensure it starts with `/` to prevent open redirect vulnerabilities.

## Data Flow

```text
Client (Login/Register) ──→ API Route (Custom) ──→ Drizzle (customerAccounts + customerSessions)
         │                         │
         └─?returnUrl=/checkout    └─→ Set-Cookie: customer_session (httpOnly, secure)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/auth.ts` | Modify | Remove customer NextAuth providers/callbacks. |
| `lib/auth/customer-session.ts` | Create | Logic to create, validate, and revoke custom DB sessions. |
| `lib/db/schema.ts` | Modify | Add `customerSessions`, `rateLimits` tables. Add `emailVerified`, `verificationToken`, consent fields to `customerAccounts`. |
| `app/api/customer/login/route.ts` | Create | Custom login handler returning session cookie. |
| `app/api/customer/register/route.ts` | Modify | Update to generate verification token and send email. |
| `app/api/customer/verify/route.ts` | Create | Verifies email token and updates account. |
| `app/login/page.tsx` | Modify | Handle `returnUrl`, update UI to hit new custom routes. |
| `components/cart/checkout-access-gate.tsx` | Modify | Pass `?returnUrl=/checkout` to login links. |
| `hooks/use-checkout-controller.ts` | Modify | Block account-mode if `emailVerified` is null. |

## Interfaces / Contracts

```typescript
// New schema additions
export const customerSessions = pgTable("customer_sessions", {
  id: text("id").primaryKey(), // secure random token
  customerId: text("customer_id").notNull().references(() => customerAccounts.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  points: integer("points").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Added to customerAccounts
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at", { withTimezone: true }),
  privacyConsentAcceptedAt: timestamp("privacy_consent_accepted_at", { withTimezone: true }),
  privacyConsentVersion: text("privacy_consent_version"),
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Session logic, Rate limits | `node:test` mocking DB calls to verify expiration and token validation. |
| Integration | Verification flow | `node:test` covering token generation -> email verification logic. |
| E2E | Auth + Checkout | Playwright: Register -> Blocked Checkout -> Verify -> Checkout succeeds. Admin login isolation. |

## Migration / Rollout

1. **Schema**: Deploy schema changes (tables and nullable columns) first.
2. **Rollout**: Swap NextAuth customer flow with custom auth. Existing customers' NextAuth cookies will be ignored; they will need to log in again (which creates a DB session). Their passwords remain valid.
3. **Rollback**: Guest checkout remains active throughout. If custom auth fails, revert `login` page and `authOptions` to NextAuth v4.

## Open Questions

- None.

## Future Path: Google OAuth
Google OAuth will be implemented later via a custom route (`/api/customer/oauth/google`) using a library like `arctic` or raw OAuth2 fetch. It will match/create a `customerAccounts` record and issue a standard `customer_session`, bypassing NextAuth entirely.
