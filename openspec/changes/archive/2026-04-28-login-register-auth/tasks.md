# Tasks: login-register-auth

## Phase 1: Data Model & Migrations

- [x] 1.1 Add `customerSessions` table to `lib/db/schema.ts` (id, customerId→customerAccounts, expiresAt, createdAt, updatedAt)
- [x] 1.2 Add `rateLimits` table to `lib/db/schema.ts` (key, points, expiresAt)
- [x] 1.3 Add to `customerAccounts`: `emailVerified` (timestamp nullable), `verificationToken` (text), `verificationTokenExpiresAt` (timestamp), `privacyConsentAcceptedAt` (timestamp), `privacyConsentVersion` (text)
- [x] 1.4 Update `customerAccountRelations` in `lib/db/schema.ts` to add `sessions` relation
- [x] 1.5 Write and run Drizzle migration for all new tables and columns (executed manually by user in interactive TTY: `npm run db:push`)

## Phase 2: Customer Auth Primitives

- [x] 2.1 Create `lib/auth/customer-session.ts` with `createCustomerSession(customerId)`, `validateCustomerSession(token)`, `revokeCustomerSession(token)`, `revokeAllCustomerSessions(customerId)` — all server-only
- [x] 2.2 Create `app/api/customer/login/route.ts` — rate-limit by IP, validate email+password against customerAccounts, issue `customer_session` httpOnly cookie, returnUrl redirect
- [x] 2.3 Create `app/api/customer/logout/route.ts` — revoke session, clear cookie, redirect
- [x] 2.4 Create `app/api/customer/session/route.ts` — read `customer_session` cookie, return session data or 401
- [x] 2.5 Modify `lib/auth.ts` — remove customer credentials and Google providers from NextAuth config; keep only `adminCredentialsProvider`; set admin pages to `/admin`
- [x] 2.6 Update `lib/auth/session.ts` (`getCustomerSession`) — hybrid: try custom `customer_session` cookie first, then fall back to NextAuth for admin only
- [x] 2.7 Create `lib/auth/customer-credentials.ts` — password hashing (bcrypt) and verification for customer accounts (not admin)

## Phase 3: Email Verification

- [x] 3.1 Create `app/api/customer/verify/route.ts` — accept token from URL, validate expiry, set `emailVerified`, redirect to login or prior context
- [x] 3.2 Create `app/api/customer/resend-verification/route.ts` — rate-limited, generate new token, send email
- [x] 3.3 Modify `app/api/customer/register/route.ts` — generate `verificationToken` + `verificationTokenExpiresAt` (24h), send verification email via Resend, return verification-pending state
- [x] 3.4 Create `app/verify-email/page.tsx` — displays pending verification message with resend option
- [x] 3.5 Add verification email template in `lib/email/resend.ts` — `sendVerificationEmail(to, token, returnUrl?)`

## Phase 4: Rate Limiting / Abuse Prevention

- [x] 4.1 Create `lib/security/db-rate-limiter.ts` — DB-backed rate limiter using the `rateLimits` table (upsert points, delete expired on check)
- [x] 4.2 Apply db-rate-limiter to `app/api/customer/login/route.ts` (5 attempts / 15 min window)
- [x] 4.3 Apply db-rate-limiter to `app/api/customer/register/route.ts` (3 attempts / 15 min window)
- [x] 4.4 Apply db-rate-limiter to `app/api/customer/verify/route.ts` (5 attempts / 15 min)
- [x] 4.5 Apply db-rate-limiter to `app/api/customer/resend-verification/route.ts` (2 attempts / 30 min)
- [x] 4.6 Replace in-memory `lib/security/rate-limiter.ts` with DB-backed implementation for serverless-safe behavior (keep class for test mocking)

## Phase 5: Admin / Customer Separation

- [x] 5.1 Verify admin auth uses separate NextAuth config and `admin-session` cookie name in `lib/auth.ts`
- [x] 5.2 Create/update admin middleware at `app/admin/(protected)/layout.tsx` — check admin NextAuth session, block customer session access
- [x] 5.3 Ensure customer `customer_session` cookie has distinct name and path restrictions (path: `/`, not forwarded to `/admin`)
- [x] 5.4 Add guard at `app/admin/(auth)/login/page.tsx` — if already has customer session, don't allow admin login with customer credentials

## Phase 6: Login / Register UX and Contextual Redirects

- [x] 6.1 Modify `app/login/page.tsx` — accept `returnUrl` search param; pass to login API; update CustomerLoginExperience props to surface contextual redirect
- [x] 6.2 Modify `components/auth/customer-login-experience.tsx` — wire form to POST `/api/customer/login` with returnUrl; handle 429 rate limit UI
- [x] 6.3 Modify `components/cart/checkout-access-gate.tsx` — pass `?returnUrl=/checkout` on login and register links; add prominent "continue as guest" CTA
- [x] 6.4 Modify `app/register/page.tsx` (or create if not exists) — handle `returnUrl` param; after registration redirect to `/verify-email?returnUrl=<context>`
- [x] 6.5 Add `returnUrl` validation (must start with `/`) in all auth API routes to prevent open-redirect

## Phase 7: Guest Checkout Preservation and Verification Gating

- [x] 7.1 Modify `hooks/use-checkout-controller.ts` or equivalent — block `account` mode checkout when `emailVerified` is null; show "verify email" prompt with resend option
- [x] 7.2 Ensure guest checkout path (`checkoutMode: 'guest'`) in `lib/orders/checkout.server.ts` never triggers email verification check
- [x] 7.3 Create `app/checkout/page.tsx` server component — read session, if account-mode + unverified redirect to `/verify-email?returnUrl=/checkout`
- [x] 7.4 Verify guest orders still create without requiring any session or account

## Phase 8: Password Reset Compatibility / Hardening

- [x] 8.1 Update `lib/email/resend.ts` — add `sendVerificationEmail`, refactor `sendPasswordResetEmail` to use new template
- [x] 8.2 Modify `app/api/customer/forgot-password/route.ts` — enumeration-safe response, generate `passwordResetToken` + `passwordResetExpiresAt` (1h), send email
- [x] 8.3 Create `app/api/customer/reset-password/route.ts` — accept token + new password, validate expiry, update `passwordHash`, revoke all `customerSessions` for that account
- [x] 8.4 Modify `app/reset-password/page.tsx` — handle token param, POST to `/api/customer/reset-password`
- [x] 8.5 Add session revocation on password change — `revokeAllCustomerSessions(customerId)` called in reset-password handler

## Phase 9: Privacy / Consent

- [x] 9.1 Add privacy consent checkbox to registration form (`components/auth/customer-login-experience.tsx` or new register form)
- [x] 9.2 Pass `privacyConsentAcceptedAt` (now) and `privacyConsentVersion` (e.g. "1.0") on registration API
- [x] 9.3 Store consent fields in `customerAccounts` when creating account
- [x] 9.4 Create `app/privacy-policy/page.tsx` if not exists — static privacy policy page referenced in consent text

## Phase 10: Tests

- [x] 10.1 Unit test `lib/auth/customer-session.ts` — create, validate, revoke, expiry scenarios (mock DB)
- [x] 10.2 Unit test `lib/security/db-rate-limiter.ts` — points accumulation, window expiry, key cleanup
- [x] 10.3 Unit test `lib/auth/customer-credentials.ts` — password hash/verify, strength validation
- [x] 10.4 Integration test `app/api/customer/register/route.ts` — happy path, duplicate email (enum-safe), missing consent, password strength
- [x] 10.5 Integration test `app/api/customer/login/route.ts` — success, wrong credentials, unverified account, rate limit
- [x] 10.6 Integration test `app/api/customer/verify/route.ts` — valid token, expired token, invalid token
- [x] 10.7 Integration test `app/api/customer/reset-password/route.ts` — valid token reset, expired token, session revocation
- [x] 10.8 E2E (Playwright) — register → try checkout (blocked, verify email) → verify email → checkout succeeds
- [x] 10.9 E2E (Playwright) — guest checkout completes without account or verification
- [x] 10.10 E2E (Playwright) — returnUrl: login from product page → post-login returns to product page
- [x] 10.11 E2E (Playwright) — admin login isolated; customer cannot access `/admin`

## Phase 11: Rollback / Migration Safety

- [x] 11.1 Test that reverting `lib/auth.ts` to previous config restores NextAuth customer login (rollback validation)
- [x] 11.2 Verify guest checkout works throughout all phases (never blocked by auth changes)
- [x] 11.3 Ensure existing customer accounts with NextAuth sessions can still log in after migration (existing passwords remain valid; new DB session created on login)
- [x] 11.4 Migration script: backfill `emailVerified` = now for all existing verified customers (those without `passwordResetToken` or Google subject implies verified)
- [x] 11.5 Document rollback steps in `openspec/changes/login-register-auth/ROLLBACK.md` — how to revert to NextAuth customer flow if needed
