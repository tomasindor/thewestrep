# Proposal: Improve Logging System

## Intent
Standardize server logging so incidents, security events, and runtime failures are queryable, consistent, and safer to operate. The current mix of `lib/logger.ts`, raw `console.*`, and manual JSON makes debugging harder and increases the risk of missing context or leaking sensitive data.

## Scope

### In Scope
- Replace the internals of `lib/logger.ts` with a thin Pino-backed facade.
- Migrate direct server-side `console.*` logging in API routes, security utilities, webhooks, and server helpers to the shared logger.
- Define a shared log contract: `event`, level, message, error serialization, request/security context, and redaction rules.

### Out of Scope
- Browser/client telemetry (`app/error.tsx`, `app/global-error.tsx`) and external monitoring platforms.
- Full observability rollout (tracing, metrics, alerts) or broad business-logic refactors.

## Capabilities

### New Capabilities
- `server-logging`: Unified structured server logging with consistent events, redaction, and request context.

### Modified Capabilities
- None.

## Approach
1. Add `pino` behind the existing `lib/logger.ts` boundary to preserve call sites and enable phased migration.
2. Extend the logger API with `debug|info|warn|error`, error serialization, child/context helpers, and environment-aware stack output.
3. Standardize event naming and migrate high-risk paths first: `proxy.ts`, `lib/security/with-rate-limit.ts`, Mercado Pago webhook, auth/reset utilities, cache helpers, and remaining API routes.
4. Add default redaction for secrets, tokens, cookies, and password-reset/payment-sensitive fields.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/logger.ts` | Modified | Pino-backed facade and shared logging contract. |
| `app/api/**/route.ts` | Modified | Route handlers use shared structured logs consistently. |
| `proxy.ts` | Modified | CSRF/security events move off manual JSON console logging. |
| `lib/security/with-rate-limit.ts` | Modified | Rate-limit events use shared logger + context. |
| `app/api/payments/mercadopago/webhook/route.ts` | Modified | Webhook logs become structured and redactable. |
| `lib/auth/**`, `lib/media/**`, `lib/catalog/**` | Modified | Server helpers stop using raw `console.*`. |
| `package.json` | Modified | Add logging dependency (`pino`; optional dev pretty printer). |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sensitive data leaks in logs | Medium | Central redaction defaults and migration review for auth/payment paths. |
| Edge/runtime incompatibilities | Medium | Keep Node-specific config behind `lib/logger.ts` and verify imports in Edge paths. |
| Noisy or inconsistent event taxonomy | Medium | Define canonical event names before migration and reuse shared helpers. |

## Rollback Plan
Revert the dependency and restore the previous `lib/logger.ts` implementation; then roll back migrated call sites to their prior behavior in the same commit.

## Dependencies
- `pino`
- Optional: `pino-pretty` for local development output

## Success Criteria
- [ ] All server-side logging flows through `lib/logger.ts`.
- [ ] Direct `console.*` usage is removed from targeted server/security/webhook paths.
- [ ] Logs include consistent event names and serialized error/context metadata.
- [ ] Sensitive auth/payment fields are redacted by default.
