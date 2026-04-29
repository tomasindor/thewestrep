## Exploration: login-register-auth

### Current State

The project uses **NextAuth v4.24.13** with a **JWT session strategy** for both admin and customer authentication through a single shared handler at `/api/auth/[...nextauth]/route.ts`.

**Admin auth:**
- Simple credentials provider (`admin-credentials`) comparing against `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars.
- Protected by `requireAdminSession()` in `app/admin/(protected)/layout.tsx`.
- Playwright bypass header exists for E2E testing.

**Customer auth:**
- Credentials provider (`customer-credentials`) for email/password.
- Optional Google OAuth provider (`google`) configured via env vars.
- Registration via standalone POST `/api/customer-auth/register`, then auto-login via `signIn("customer-credentials")` on the client.
- Forgot/reset password via `/api/customer-auth/forgot-password` and `/api/customer-auth/reset-password`.
- Profile page at `/profile` with full shipping address, phone, CUIL, etc.
- Guest checkout is fully supported; checkout mode stored in client cart state.
- Login page at `/login` doubles as the checkout access gate.

**Password security:**
- scrypt hashing with 64-byte key length, random 16-byte salt, timing-safe comparison.
- Zod validation: min 8 chars, at least one letter, at least one number.

**Rate limiting:**
- In-memory `Map`-based rate limiter (`lib/security/rate-limiter.ts`) with per-IP tracking.
- Applied to login (5 req / 5 min), register (3 / 5 min), forgot-password (3 / 5 min), reset-password (5 / 5 min).

**Database schema (`customerAccounts`):**
- Stores id, email, name, passwordHash, googleSubject, passwordResetToken, passwordResetExpiresAt, and full shipping profile fields.
- **No email verification fields exist.**
- Email is unique and normalized to lowercase.

**Key existing gaps observed:**
1. **No email verification** — customers can register with any email and immediately buy.
2. **Shared auth handler** — admin and customer providers/callbacks/pages are merged in one `authOptions` object. The `signIn` page is hardcoded to `/admin/login`, which is wrong for customers.
3. **JWT sessions cannot be revoked individually** — no server-side session store.
4. **In-memory rate limiter** — will not work correctly across serverless function instances.
5. **Google OAuth linking by email** — `upsertCustomerGoogleAccount` matches by `googleSubject` OR `email`, allowing potential account hijacking if a Google account shares an email with an existing credentials account.
6. **Post-login redirect is hardcoded** — customer login experience always pushes to `/checkout` via `router.push`, ignoring the user's original context.
7. **Checkout access gate has no return context** — `/login` link from checkout carries no `redirectTo` parameter.
8. **No privacy/terms/consent mechanism** — registration does not capture consent for data processing.
9. **Admin and customer session decoding share the same secret** — a leaked JWT could theoretically be replayed if role validation is bypassed.

---

### Product Goals

1. **Public auth for normal customers only.** Admin login stays under `/admin` with a single admin from environment/config.
2. **Guest checkout must remain fully functional.** If checkout redirects to login, the login page must offer a prominent "continue as guest" option.
3. **Context-aware redirect after login/register.** Return the user to their previous page; if from checkout, continue checkout seamlessly.
4. **Lightweight initial registration:** name, email, password only.
5. **Full customer data collected progressively:** phone, address, city, province, postal code are completed during checkout or profile editing, and saved for future purchases in a later checkout-focused change.
6. **Email verification required before buying with a registered account.** Unverified accounts should not be allowed to complete account-mode checkout.
7. **Google OAuth explicitly out of initial scope.** Deferred to a future version to avoid duplicate account / account linking issues.
8. **Page-based UX, mobile-first, visually consistent with existing ecommerce dark aesthetic.**
9. **Human/simple error tone** in all auth UI copy.
10. **Privacy/terms/data processing consent** must be contemplated by the final solution.

---

### Constraints and Non-Goals

**Constraints:**
- Next.js 16.2.1 App Router with breaking changes; do not assume legacy Next.js patterns.
- TypeScript strict mode.
- Clean Architecture / Hexagonal patterns in `lib/`; preserve server-only boundaries.
- Native Node test runner (`node:test`) and Playwright for E2E.
- Do not run builds as routine verification.
- Do NOT define concrete components, endpoints, or choose a final auth provider/architecture in this phase.

**Non-Goals:**
- Google OAuth (deferred).
- Social login of any kind.
- Multi-admin support.
- Address/profile data capture during registration (deferred to checkout/profile change).
- Concrete UI component specs or endpoint definitions.

---

### Affected Areas

- `lib/auth.ts` — shared `authOptions`; admin/customer provider/callback coupling.
- `app/api/auth/[...nextauth]/route.ts` — shared handler; rate limit injection.
- `lib/auth/customer.ts` — customer providers (credentials + google).
- `lib/auth/admin.ts` — admin credentials provider.
- `lib/auth/session.ts` — session retrieval helpers; role-based filtering.
- `lib/auth/customer-accounts.ts` — registration, authentication, google upsert logic.
- `lib/auth/customer-credentials.ts` — Zod schemas for login/registration.
- `lib/auth/customer-password.ts` — password hashing/verification.
- `lib/auth/customer-password-reset.ts` — token generation and reset flow.
- `lib/auth/customer-profile.ts` — profile read/update with address data.
- `app/api/customer-auth/register/route.ts` — registration endpoint.
- `app/api/customer-auth/forgot-password/route.ts` — forgot password endpoint.
- `app/api/customer-auth/reset-password/route.ts` — reset password endpoint.
- `app/login/page.tsx` — login page entry point.
- `components/auth/customer-login-experience.tsx` — main login/register/guest UI.
- `app/checkout/page.tsx` — checkout entry; preloads customer profile.
- `components/cart/checkout-access-gate.tsx` — redirects to `/login` without context.
- `hooks/use-checkout-controller.ts` — auth sync effects, profile prefill.
- `lib/security/rate-limiter.ts` — in-memory limiter unsuitable for serverless.
- `lib/security/with-rate-limit.ts` — rate limit application wrapper.
- `lib/db/schema.ts` — `customerAccounts` table needs verification fields.
- `lib/email/resend.ts` — email sending infra; needs verification email template.
- `tests/unit/customer-password.test.ts` — existing password tests.
- `tests/e2e/` — likely needs new auth flow E2E coverage.

---

### Approaches

#### 1. Evolve within NextAuth v4 (Fix Shared Architecture, Add Verification)
Keep NextAuth v4 but separate admin and customer auth configurations, add email verification columns, and retrofit the existing flow.

- **Pros:**
  - Minimal structural rewrite.
  - Reuses existing provider setup, callback logic, and session helpers.
  - Password hashing and Zod schemas remain valid.

- **Cons:**
  - NextAuth v4 is effectively legacy; long-term maintenance burden.
  - JWT session strategy cannot be individually revoked — verification revocation or forced logout after password change is impossible without secret rotation.
  - Shared `authOptions` coupling between admin and customer is architecturally unsound and a privilege-separation risk.
  - Still requires a database-backed token store for email verification, creating a hybrid JWT + DB model.

- **Effort:** Medium

#### 2. Migrate Customer Auth to Custom Server Architecture
Keep NextAuth **only for admin** (simple, single-user, stable). Build a separate customer auth system using custom route handlers, database sessions (e.g., `httpOnly` cookies with session tokens stored in PostgreSQL), and native credential verification.

- **Pros:**
  - Clean separation of concerns — admin and customer auth are fully isolated.
  - Database sessions allow individual revocation, session listing, and forced logout.
  - Full control over email verification flow, token expiry, and session lifecycle.
  - Easier to implement progressive profile completion and guest-checkout continuity.
  - Eliminates Google OAuth linking risk by simply not implementing OAuth in this change.

- **Cons:**
  - More code to write and maintain (session management, cookie handling, CSRF protection).
  - Need to build or integrate a session table/schema.
  - More testing surface area.

- **Effort:** High

#### 3. Adopt Auth.js (NextAuth v5) for Both
Migrate the entire auth stack to Auth.js (the successor to NextAuth v4), which has better App Router support and a different configuration model.

- **Pros:**
  - Next-generation official auth library for Next.js.
  - Better App Router integration and edge compatibility.

- **Cons:**
  - Auth.js is still relatively new and APIs may shift; this project explicitly uses Next.js 16.2.1 with breaking changes from training data.
  - Does not inherently solve the admin/customer shared-handler problem.
  - Database adapter changes may be required.
  - Higher migration risk for an ecommerce production site.

- **Effort:** High

#### 4. Hybrid Fix (NextAuth v4 for Admin, Custom Credentials + JWT for Customers with Verification Overlay)
Keep NextAuth v4 for both, but introduce a secondary verification gate in the checkout/order flow rather than at the session level. Customer sessions remain JWT, but the checkout API rejects orders from unverified accounts.

- **Pros:**
  - Avoids rewriting session infrastructure.
  - Verification requirement is enforced at the business-logic layer (checkout).

- **Cons:**
  - Security theater — an unverified user still has a valid session and can browse as "logged in".
  - Does not solve JWT revocation, rate limiting, or admin/customer coupling.
  - Harder to explain to users why they are "logged in" but cannot buy.

- **Effort:** Low

---

### Recommendation

**Approach 2 (Custom customer auth + isolated NextAuth for admin) is architecturally superior** for this project's long-term health. The existing NextAuth shared-handler design is a latent privilege-separation bug, and JWT's lack of revocability is a real security gap for an ecommerce site handling personal data and orders.

However, given the scope and the fact that the current system is functional (if flawed), the proposal phase should rigorously compare:
- The migration cost of Approach 2 vs. the incremental security gain.
- Whether a heavily refactored Approach 1 (separate NextAuth configs for admin and customer, plus a verification overlay) is "good enough" for the near term.

The orchestrator should surface this tradeoff to the user so the proposal can be grounded in their risk tolerance and timeline.

---

### Risks / Security / Privacy Concerns

| Risk | Severity | Current State | Mitigation Direction |
|------|----------|---------------|----------------------|
| **Brute force attacks** | High | In-memory rate limiter fails across serverless instances. | Move to Redis/Upstash/IP-based edge rate limiting or persistent store. |
| **Account enumeration** | Medium | Registration returns 409 for existing emails. | Maintain generic error messages; audit all auth endpoints for timing differences. |
| **Session theft / replay** | High | Stateless JWT cannot be individually revoked. | Adopt database sessions or maintain a JWT blocklist/denylist. |
| **Admin/customer privilege confusion** | High | Shared `authOptions`, callbacks, and cookie config. | Separate auth configurations entirely; different cookie names/paths for admin. |
| **Reset link abuse** | Medium | No per-user rate limiting on forgot-password; token stored in same table. | Add per-email rate limiting; consider hashing tokens before storage. |
| **Personal data handling** | Medium | No privacy/terms consent captured at registration. | Add explicit consent checkbox + terms link; store consent timestamp. |
| **Email verification bypass** | High | Any registered email can buy immediately. | Block account-mode checkout for unverified emails; require verification token. |
| **Google OAuth hijacking (deferred)** | Medium | `upsertCustomerGoogleAccount` matches by email alone. | When OAuth is reintroduced, enforce explicit account linking flow, not implicit email merge. |
| **Password reset token exposure** | Low | Reset token stored in plain text in `customerAccounts` table. | Hash tokens before storage or use a separate `verification_tokens` table. |
| **Missing redirect context** | Low | Login from checkout loses context; hardcoded `/checkout` push. | Pass `redirectTo` query param through login flow and honor it post-auth. |

---

### Open Questions

No truly blocking questions were identified. The following are architectural decisions that should be resolved during the **proposal phase**:

1. **Session strategy:** Keep JWT for customers or migrate to database sessions?
2. **Rate limiting infrastructure:** Redis/Upstash, Vercel KV, or another persistent solution?
3. **Email verification tokens:** Add columns to `customerAccounts` or create a generic `verification_tokens` table?
4. **Auth library choice:** Fix within NextAuth v4, migrate to Auth.js, or custom customer auth?
5. **Checkout enforcement:** Should unverified customers be blocked only at checkout API, or also at the session level?

---

### Ready for Proposal

**Yes.** The codebase has been thoroughly investigated. The exploration reveals a functional but architecturally strained auth system with clear security and UX gaps. The next phase (`sdd-propose`) should present 2–3 architectural options with tradeoffs, a rollback plan, and a security implications document, per the `openspec/config.yaml` proposal rules.
