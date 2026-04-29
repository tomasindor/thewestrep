# Proposal: Login Register Auth

## Intent

Public customer auth is functional but unsafe and inconsistent: admin/customer auth share configuration, registered customers can buy without email verification, checkout loses return context, Google OAuth creates account-linking risk, rate limiting is weak for serverless, and registration lacks explicit privacy/data-processing consent.

## Scope

### In Scope
- Customer-only login/register flow for ecommerce, while admin remains isolated under `/admin` with env/config credentials.
- Lightweight registration: name, email, password, and required consent acknowledgement.
- Email verification requirement before completing checkout as a registered customer.
- Checkout-aware login/register UX with continue-as-guest and context-preserving post-auth redirects.
- Disable/defer Google OAuth from the initial serious public auth flow.
- Security hardening direction for privilege separation, persistent rate limiting, verification/reset token handling, and session revocation strategy.

### Out of Scope
- Google/social login and account linking.
- Multi-admin support.
- Collecting phone/address/city/province/postal code during registration.
- Saving checkout data into profile.
- Prescribing final components, endpoints, or auth provider before design.

## Capabilities

### New Capabilities
- `customer-auth`: public customer login, registration, verification, consent, redirect context, and checkout auth behavior.

### Modified Capabilities
- None; current OpenSpec specs only cover the Yupoo/R2 image pipeline.

## Approach

Design an isolated customer-auth boundary that preserves guest checkout and admin login independence. Specs/design should decide whether to evolve current auth or move customers to database-backed sessions; the proposal favors separation plus verification enforcement over patching shared admin/customer behavior.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/auth*`, `app/api/auth/**` | Modified | Separate admin/customer concerns; disable initial OAuth path. |
| `lib/db/schema.ts` | Modified | Add verification/consent/session-support data as design requires. |
| `app/login`, `components/auth/**` | Modified | Mobile-first login/register/guest UX and simple errors. |
| `app/checkout`, `components/cart/**`, `hooks/use-checkout-controller.ts` | Modified | Preserve redirect context and block registered unverified purchase. |
| `lib/security/**`, `lib/email/**` | Modified | Persistent rate limiting direction and verification email support. |
| `tests/unit`, `tests/e2e` | Modified | Cover auth, verification, redirects, guest checkout, and admin separation. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth migration breaks checkout | Med | Keep guest checkout fallback; test checkout flows first. |
| Privilege separation regression | Med | Explicit admin/customer specs and E2E coverage. |
| Verification email delivery issues | Med | Clear resend flow and non-blocking guest checkout. |
| Session strategy overreach | Med | Resolve in design before implementation. |

## Rollback Plan

Keep the current guest checkout path operational throughout. Risky customer-auth changes should be feature-switchable or revertible by restoring the current auth handler/login behavior, disabling verification enforcement, and leaving admin `/admin` credentials untouched. Database additions should be additive and nullable until rollout is complete.

## Dependencies

- Existing Resend email infrastructure or equivalent verified sender.
- Persistent store decision for rate limits, verification tokens, and possibly sessions.
- Privacy/terms copy or URL for consent.

## Success Criteria

- [ ] Customers can register/login with name, email, password and consent.
- [ ] Checkout offers login, register, and continue-as-guest.
- [ ] Login/register returns users to prior context, especially checkout.
- [ ] Registered checkout is blocked until email is verified; guest checkout still works.
- [ ] Admin login remains isolated under `/admin`.
- [ ] Google OAuth is not part of the initial public flow.
- [ ] Human-safe errors do not expose internals.

## Next Phase Recommendation

Run specs + design next: specs to define behavior contracts, design to settle auth/session/rate-limit/token architecture before implementation.
