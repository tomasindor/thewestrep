# Apply Progress: customer-google-oauth

## Batch Summary (remaining tasks 5.3, 6.1–6.6, 7.1–7.3)

Completed the remaining Google OAuth apply tasks with strict TDD-oriented coverage:

- Added focused unit coverage for Google account linking/duplicate-subject decisions.
- Added Playwright OAuth-flow coverage for env gate behavior, state/callback error handling, admin isolation, and mocked happy-path redirect.
- Documented rollback/disable procedure with explicit no-migration and route-removal safety notes.

## TDD Cycle Evidence

| Task | Test File | Layer | RED | GREEN | TRIANGULATE |
|------|-----------|-------|-----|-------|-------------|
| 5.3 | `tests/unit/customer-accounts.test.ts` | Unit | Added new expectations for link/duplicate behaviors before extracting resolver helper | `node --test ...customer-accounts.test.ts` passing (4/4) | Covered linked-subject, email-link+timestamp, duplicate rejection, new account path |
| 6.1–6.6 | `tests/e2e/google-oauth.spec.ts` | E2E | Added spec first, initial run exposed env-assumption failure in 6.1 | `npm run e2e -- tests/e2e/google-oauth.spec.ts` passing (6/6) | Added env-aware gate assertion and separate invalid/unverified/admin/happy scenarios |

## Notes / Deviations

- **6.2 consumed-state verification**: full successful callback consumption cannot be executed against real Google in CI-style local runs. E2E asserts start-cookie issuance and callback state validation/redirect behavior; happy path is covered via route mocking, matching existing project E2E conventions.

## Verification Commands

- `node --import ./tests/node-test-register.mjs --test tests/unit/customer-accounts.test.ts`
- `npm run e2e -- tests/e2e/google-oauth.spec.ts`
- `npm run typecheck`

All above commands passed in this batch.

## Files Updated

- `lib/auth/customer-accounts.ts`
- `tests/unit/customer-accounts.test.ts`
- `tests/e2e/google-oauth.spec.ts`
- `tests/unit/customer-oauth.test.ts` (type-only test compatibility fix)
- `openspec/changes/customer-google-oauth/ROLLBACK.md`
- `openspec/changes/customer-google-oauth/tasks.md`
