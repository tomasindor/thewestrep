# Tasks: Node Test Runtime Compatibility

## Phase 1: Test runner foundation

- [x] 1.1 RED — Add `tests/node-test-register.mjs` to bootstrap native `node --test` with `tsx`, and fail fast if the preload is not active for checkout suites.
- [x] 1.2 GREEN — Create `tests/node-test-resolver.mjs` with only the approved rules: `@/` aliases, extensionless relative TS imports, dotted basenames, and a no-op `server-only` shim.
- [x] 1.3 REFACTOR — Update `package.json` with the standard `test:unit` command `node --import ./tests/node-test-register.mjs --test "tests/unit/**/*.test.ts"` without broadening runner behavior beyond tests.

## Phase 2: Explicit checkout server boundary

- [x] 2.1 RED — Update `tests/unit/order-runtime-boundaries.test.ts` to require `import "server-only"` in `lib/orders/checkout.server.ts` and fail if the server module boundary becomes documentation-only.
- [x] 2.2 GREEN — Modify `lib/orders/checkout.server.ts` to add `import "server-only"` while preserving `buildOrderReference()` behavior and the shared-module guidance comments.
- [x] 2.3 REFACTOR — Remove stale comments in `lib/orders/checkout.server.ts` that still claim `node --test` is unsupported once the preload path exists.

## Phase 3: Native checkout verification

- [x] 3.1 RED — Extend `tests/unit/order-checkout.test.ts` so its existing checkout scenarios run under the standard Node command and would fail if preload alias/extension support regresses.
- [x] 3.2 GREEN — Strengthen `tests/unit/order-runtime-boundaries.test.ts` with structural evidence: prove `checkout.shared` omits `buildOrderReference`, `checkout.server` exports it, and the source contains `import "server-only"`.
- [x] 3.3 GREEN — Add a narrow-failure assertion in `tests/unit/order-runtime-boundaries.test.ts` or a dedicated checkout-adjacent unit test showing unsupported/missing specifiers still surface as Node resolution errors.

## Phase 4: Verification evidence

- [x] 4.1 Verify `node --import ./tests/node-test-register.mjs --test tests/unit/order-checkout.test.ts tests/unit/order-runtime-boundaries.test.ts` passes and capture the passing evidence for the change.
- [x] 4.2 Verify the repo standard `node --test` path does not require `tsx` CLI or another alternate runner for these checkout suites.
- [x] 4.3 Verify the resolver stays minimal by showing unrelated failures still break normally and checkout runtime-boundary proof depends on executable assertions plus source/import-graph evidence.

(End of file - total 25 lines)
