# Proposal: Node Test Runtime Compatibility

## Intent

Enable checkout verification under native `node --test` without broadening test infrastructure so far that it hides real runtime boundary problems.

## Scope

### In Scope
- Add a test-only preload resolver hook for `node --test` that handles `@/` aliases, extensionless relative TS imports, dotted basenames, and a no-op `server-only` shim.
- Add explicit `import "server-only"` protection to `lib/orders/checkout.server.ts`.
- Strengthen checkout runtime-boundary tests with source/import-graph evidence and standardize the native Node unit-test command.

### Out of Scope
- Repo-wide rewrite to stock Node ESM import rules.
- Fixing unrelated failing tests such as the missing `../../middleware` target.

## Capabilities

### New Capabilities
- `node-test-runtime-compat`: Native Node test execution for checkout/runtime-boundary verification with narrow, explicit resolution rules.

### Modified Capabilities
- None.

## Approach

Use a small preload module via `node --import ./tests/node-test-register.mjs --test` and keep its scope intentionally narrow. Pair that infrastructure with explicit server-only marking in checkout server code and boundary tests that prove intent structurally instead of relying on framework bundling behavior.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/node-test-register.mjs` | New | Register narrow resolver hooks for Node tests only |
| `package.json` | Modified | Standardize native Node unit-test command |
| `lib/orders/checkout.server.ts` | Modified | Add `import "server-only"` |
| `tests/unit/order-runtime-boundaries.test.ts` | Modified | Add stronger boundary evidence |
| `tests/unit/order-checkout.test.ts` | Modified | Verify checkout under native Node runner |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Resolver hook masks real runtime issues | Med | Keep hook checkout-focused and test-only |
| `server-only` shim weakens proof | Med | Require source/import-graph assertions in tests |
| Optional `"type": "module"` affects future `.js` files | Low | Treat as explicit follow-up decision, not default scope |

## Rollback Plan

Remove the preload registration, revert the package script, and restore prior checkout tests. Keep `server-only` import only if framework/runtime compatibility remains validated.

## Dependencies

- Node `registerHooks()` support in the project test runtime.
- Existing checkout verification suites in `tests/unit/`.

## Success Criteria

- [ ] Checkout-related unit tests pass under native `node --test` with the preload hook.
- [ ] `checkout.server.ts` explicitly imports `server-only` and tests assert that boundary intent.
- [ ] The resolver remains narrow enough that unrelated missing-module problems still surface normally.
