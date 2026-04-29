# Apply Progress: login-register-auth

## Batch Summary

- Mode: **Strict TDD**
- Previous cumulative scope preserved (Phases 1.1-1.4, 2.x, 3.x, 4.1-4.6, 5.x, 6.x, 7.x, 8.x, 9.x, 10.1-10.11, 11.4-11.5)
- New batch completed:
  - Fixed client/server auth boundary by splitting server password helpers from shared credential schemas
  - Re-enabled and executed Playwright auth checkout coverage (`10.8-10.11`) after removing the `node:*` client bundle leak
  - Added safe rollback/migration support for `11.4` via SQL backfill script generation (print-only, no DB execution)
  - Added rollback/migration safety harness for `11.1-11.3` with source validation, dry-run checklisting, and explicit legacy compatibility fixtures (no DB execution)
- Verify-warning remediation batch completed:
  - Normalized Drizzle `findFirst` `undefined` results to `null` in auth/session and db rate limiter repositories
  - Removed unused `SESSION_TTL_SECONDS` constant from customer auth route handlers
  - Refactored login/register form submit narrowing in `customer-login-experience.tsx` to satisfy strict TypeScript checks
  - Fixed test typing for `RequestInfo | URL` fetch inputs and completed `CreatedOrderSummary` mock shape
- Migration execution attempt for `1.5` (prior batch):
  - Determined project migration command from tooling: `npm run db:push` (`drizzle-kit push`, config `drizzle.config.ts`)
  - Command failed safely before DB connection because `DATABASE_URL` was not configured in process env
  - No schema changes were applied
- Migration execution completion for `1.5` (user interactive terminal):
  - User confirmed (`listo`) they manually ran `npm run db:push` in an interactive TTY
  - Task `1.5` is now treated as completed based on explicit user confirmation
  - This executor did not re-run migration in non-interactive shell to avoid duplicate/destructive execution
  - Post-migration smoke checks were executed locally (non-build, non-secret): **12/12 passing**

## Completed Tasks (cumulative)

- [x] 1.1
- [x] 1.2
- [x] 1.3
- [x] 1.4
- [x] 1.5
- [x] 2.1
- [x] 2.2
- [x] 2.3
- [x] 2.4
- [x] 2.5
- [x] 2.6
- [x] 2.7
- [x] 3.1
- [x] 3.2
- [x] 3.3
- [x] 3.4
- [x] 3.5
- [x] 4.1
- [x] 4.2
- [x] 4.3
- [x] 4.4
- [x] 4.5
- [x] 4.6
- [x] 5.1
- [x] 5.2
- [x] 5.3
- [x] 5.4
- [x] 6.1
- [x] 6.2
- [x] 6.3
- [x] 6.4
- [x] 6.5
- [x] 7.1
- [x] 7.2
- [x] 7.3
- [x] 7.4
- [x] 8.1
- [x] 8.2
- [x] 8.3
- [x] 8.4
- [x] 8.5
- [x] 9.1
- [x] 9.2
- [x] 9.3
- [x] 9.4
- [x] 10.1
- [x] 10.2
- [x] 10.3
- [x] 10.4
- [x] 10.5
- [x] 10.6
- [x] 10.7
- [x] 10.8
- [x] 10.9
- [x] 10.10
- [x] 10.11
- [x] 11.1
- [x] 11.2
- [x] 11.3
- [x] 11.4
- [x] 11.5

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Previous batches | Existing evidence preserved from prior apply-progress revisions | Unit | ✅ | ✅ | ✅ | ✅ | ✅ |
| Boundary fix for E2E blocker (`10.8-10.11` enablement prerequisite) | `tests/unit/customer-credentials-boundary.test.ts` | Unit | ✅ `tests/unit/customer-password.test.ts`, `tests/unit/customer-credentials-auth.test.ts` (7/7) | ✅ Written (missing server module + shared module importing server helper) | ✅ Passed (2/2) | ✅ shared module static checks + server-only module checks | ✅ extracted server-only credential helpers into dedicated module |
| 10.8-10.11 | `tests/e2e/auth-checkout-coverage.spec.ts`, `tests/unit/playwright-config.test.ts` | E2E + Unit | ✅ Existing authored E2E run initially failed (2/4) due selector ambiguity + disabled email-auth gate | ✅ Added config gate test first (failed), then reran E2E failures as RED baseline | ✅ Passed (4/4 E2E, 5/5 config unit) | ✅ register, guest, returnUrl, admin-isolation flows | ✅ removed temporary global skip and tightened selector targeting |
| 11.4 | `tests/unit/email-verified-backfill.test.ts` | Unit | N/A (new) | ✅ Written (module missing) | ✅ Passed (2/2) | ✅ SQL predicate + candidate classification paths | ✅ kept script print-only to preserve DB safety |
| 11.1-11.3 | `tests/unit/rollback-migration-safety.test.ts`, `tests/fixtures/legacy-auth-compatibility.ts` | Unit | N/A (new harness module) | ✅ Written (missing rollback harness module + fixture contract) | ✅ Passed (6/6) | ✅ rollback-ready vs missing-provider auth source, blocked vs safe migration targets, valid vs invalid legacy password fixtures | ✅ extracted pure rollback/migration helpers and explicit fixture catalog |
| 1.5 (migration execution) | `tests/unit/customer-auth-schema.test.ts`, `tests/unit/rollback-migration-safety.test.ts`, `tests/unit/email-verified-backfill.test.ts` | Operational + Unit Smoke | ✅ 12/12 focused post-migration checks | ➖ No production-code change in this batch | ✅ Completed via user-confirmed interactive TTY execution (`npm run db:push`) | ➖ Not applicable (operational task) | ➖ None needed |
| Verify warnings remediation (post-verify) | `tests/unit/db-rate-limiter.test.ts`, `tests/unit/customer-auth-route-handlers.test.ts`, `tests/unit/customer-session.test.ts`, `tests/unit/customer-session-hybrid.test.ts`, `tests/unit/customer-auth-client-flow.test.ts`, `tests/unit/order-route-auth-gating.test.ts` + `npm run typecheck` | Unit + Typecheck | ✅ 21/21 focused safety-net tests passing before edits | ✅ `npm run typecheck` failing baseline captured (12 errors) before code changes | ✅ 21/21 focused unit tests + `npm run typecheck` passing after fixes | ✅ Covered both null-normalization and test typing paths with focused suites | ✅ Kept runtime behavior unchanged while tightening type contracts |

## Test Summary (this batch)

- Tests written/updated: **4** files
  - `tests/unit/customer-credentials-boundary.test.ts`
  - `tests/unit/playwright-config.test.ts`
  - `tests/e2e/auth-checkout-coverage.spec.ts`
  - `tests/unit/email-verified-backfill.test.ts`
- Unit tests passing this batch: **16/16** focused regression
- E2E tests passing this batch: **4/4** (`npm run e2e -- tests/e2e/auth-checkout-coverage.spec.ts`)
- Approval tests (refactoring): **None**
- Pure functions created: **2** (`shouldTreatAccountAsVerifiedCandidate`, `buildEmailVerifiedBackfillSql`)

### Additional Test Summary (this continuation batch)

- Tests written/updated: **2** files
  - `tests/unit/rollback-migration-safety.test.ts`
  - `tests/fixtures/legacy-auth-compatibility.ts`
- Unit tests passing this continuation batch: **6/6** (`node --import ./tests/node-test-register.mjs --test tests/unit/rollback-migration-safety.test.ts`)
- Approval tests (refactoring): **None**
- Pure functions created: **5** (`validateRollbackAuthSource`, `buildMigrationDryRunChecklist`, `runLegacyCustomerCompatibilityFixture`, `classifyMigrationTarget`, `ensureDryRunCommand`)

### Post-Migration Smoke Checks (this finalization batch)

- Command: `node --import ./tests/node-test-register.mjs --test tests/unit/customer-auth-schema.test.ts tests/unit/rollback-migration-safety.test.ts tests/unit/email-verified-backfill.test.ts`
- Result: ✅ **12/12 passing**
- Notes: focused read-safe checks only; no build, no secrets printed, no DB credentials disclosed

### Migration Execution Summary (this batch)

- Command: `npm run db:push` (resolved to `drizzle-kit push`)
- Result: ✅ completed manually by user in interactive TTY (user confirmation: `listo`)
- Rollback notes: No rollback action required in this executor run.

### Verify-Warning Remediation Summary (this continuation batch)

- Focused unit safety net before changes: ✅ **21/21 passing**
- RED gate: `npm run typecheck` failed with **12** known verify warnings
- GREEN checks after changes:
  - `node --import ./tests/node-test-register.mjs --test tests/unit/db-rate-limiter.test.ts tests/unit/customer-auth-client-flow.test.ts tests/unit/order-route-auth-gating.test.ts tests/unit/customer-auth-route-handlers.test.ts tests/unit/customer-session.test.ts tests/unit/customer-session-hybrid.test.ts` → ✅ **21/21 passing**
  - `npm run typecheck` → ✅ **0 errors**
- Scope guard: no build, no commit, no push

## Remaining Tasks

- None. All scoped tasks are complete.

## Notes / Deviations

- Playwright web server now injects a placeholder `DATABASE_URL` only for E2E runtime gating so customer auth UI can be exercised with mocked API routes.
- No real DB migration or backfill execution was performed.
- `1.5` finalization is based on explicit user confirmation of interactive execution (`listo`) after manual `npm run db:push`.
- Rollback safety harness is static/pure and fixture-based; it validates rollback readiness and migration guardrails without touching any real database.
- No build/commit/push performed.
