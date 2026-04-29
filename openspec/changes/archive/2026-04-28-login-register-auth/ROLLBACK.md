# Rollback Plan — login-register-auth

## Scope

This document describes how to revert customer auth from custom DB sessions back to the legacy NextAuth customer flow **without** touching admin auth under `/admin` and while preserving guest checkout.

## Preconditions

1. Confirm incident owner and rollback window.
2. Freeze customer-auth deploys while rollback is in progress.
3. Keep DB migration execution disabled unless explicitly approved for a target environment.

## Rollback Steps

1. Revert customer login/register entrypoints to legacy NextAuth flow in:
   - `app/login/page.tsx`
   - `components/auth/customer-login-experience.tsx`
2. Restore customer providers/callbacks in `lib/auth.ts` from the pre-change baseline while preserving:
   - admin-only routes under `/admin`
   - admin session cookie isolation (`admin-session`)
3. Disable custom customer endpoints from active UI usage:
   - `/api/customer/login`
   - `/api/customer/register`
   - `/api/customer/verify`
   - `/api/customer/reset-password`
4. Keep guest checkout CTA and flow intact (`checkoutMode: guest`) and verify no auth dependency was introduced.
5. Redeploy and invalidate edge/runtime cache.

## Validation Checklist

- [ ] Customer can log in through legacy NextAuth path.
- [ ] Guest checkout still succeeds without session/account.
- [ ] `/admin` remains isolated and does not accept customer auth.
- [ ] Existing customer passwords still authenticate.
- [ ] No open redirects (`returnUrl` sanitization still enforced).

## Data / Migration Notes

- Do **not** drop newly introduced columns/tables during emergency rollback.
- `customer_sessions` and `rate_limits` may remain in DB as dormant artifacts.
- Backfill or cleanup migrations are follow-up tasks, not rollback blockers.

## Forward Recovery

After stabilization, run a postmortem and define whether custom customer auth should be:

1. Reintroduced behind a feature flag, or
2. Refactored to fix the rollback trigger root cause.
