## Exploration: node-test-runtime-compat

### Current State
`node --test` is running on Node `v24.14.1`, so raw `.ts` files can execute, but this repo is still configured around Next/TypeScript bundler semantics, not native Node module semantics. The immediate checkout failure comes from extensionless ESM imports in tests like `../../lib/orders/checkout.shared` and `../../lib/orders/checkout.server`; native Node treats `.shared` / `.server` as file extensions, so it never tries `.ts` and throws `ERR_MODULE_NOT_FOUND` before assertions run.

After that first hurdle, the checkout modules also depend on `@/*` aliases inside runtime-loaded files such as `lib/orders/checkout.shared.ts` and `lib/payments/mercadopago-preference.ts`. Native Node does not understand the `tsconfig.json` alias (`@/* -> ./*`) or `moduleResolution: "bundler"`, so those imports fail unless the runner is taught how to resolve them. Separately, Next docs require `import "server-only"` for explicit server protection, but the published `server-only` package throws in plain Node, so adding it to `checkout.server.ts` requires a Node-test-specific strategy (mock/shim/hook) for tests that intentionally import that module.

I validated the minimal-hook path with a prototype `node:module.registerHooks()` preload: it resolved extensionless relative imports, mapped `@/` to the repo root, and no-op'd `server-only` for test context. With that preload, the three checkout tests passed under native `node --test` (`11/11`), and a broader smoke run reached `42/43` passing unit tests; the remaining failure was unrelated (`tests/unit/csrf-middleware.test.ts` imports a missing `../../middleware`).

### Affected Areas
- `package.json` — add an explicit native Node test script/command convention; optionally add `"type": "module"` to remove typeless-package reparsing warnings.
- `tsconfig.json` — currently uses `moduleResolution: "bundler"` and `paths` only; useful context, but not enough for native Node resolution by itself.
- `tests/unit/order-checkout.test.ts` — currently imports `checkout.shared` / `checkout.server` through extensionless relative ESM paths that native Node mis-resolves.
- `tests/unit/order-runtime-boundaries.test.ts` — same extensionless dotted-basename issue; also the best place to strengthen boundary evidence.
- `tests/unit/mercadopago-checkout.test.ts` — passes once alias resolution is restored because `mercadopago-preference.ts` depends on `@/*` imports.
- `lib/orders/checkout.shared.ts` — currently client-safe, but runtime-loaded dependencies use `@/*` aliasing that native Node cannot resolve alone.
- `lib/orders/checkout.server.ts` — must add `import "server-only"` to match the approved design; native Node tests need a compatible shim/mocking path.
- `openspec/changes/checkout-runtime-boundaries/verify-report.md` — establishes the required proof gaps: explicit `server-only`, runnable `node --test`, and stronger runtime-boundary evidence.

### Approaches
1. **Pure native-Node alignment** — Convert the tested graph to stock Node ESM rules.
   - Pros: No custom loader; closest to vanilla Node behavior; long-term clean if applied repo-wide.
   - Cons: High churn. Requires adding explicit `.ts` extensions, dealing with dotted basenames like `checkout.shared`, and replacing or redesigning `@/*` aliases across runtime-loaded files. Likely conflicts with current Next-oriented `bundler` conventions unless more infra changes are made.
   - Effort: High

2. **Native `node --test` + preload resolver hook** — Keep `node --test`, but preload a small `node:module.registerHooks()` file that resolves `@/*`, retries extensionless TS imports, and shims `server-only` only for Node test execution.
   - Pros: Minimal code churn; keeps existing source import style; directly unblocks checkout verification; prototype already proved the checkout suites pass under native Node.
   - Cons: Adds custom test infrastructure; hook behavior must stay intentionally narrow so it does not hide real app/runtime problems; `server-only` rejection still needs separate structural proof because plain Node is not the Next client bundler.
   - Effort: Low

3. **Keep `tsx` or switch to `node --import=tsx`** — Use third-party TS runtime support while still invoking `node`.
   - Pros: Lowest implementation effort.
   - Cons: Rejected by the goal. It is still effectively `tsx`-based resolution and does not satisfy the “required native `node --test` runner” intent.
   - Effort: Low

### Recommendation
Recommend **Approach 2: native `node --test` with a small preload resolver hook**.

Minimal change set:
1. Add a preload file such as `tests/node-test-register.mjs` that uses `registerHooks()` to:
   - map `@/foo` → `<repo-root>/foo(.ts|.tsx)`
   - retry relative imports missing a real JS/TS extension
   - treat dotted basenames like `checkout.shared` / `checkout.server` as extensionless specifiers unless they already end in a known runtime extension
   - return an empty module for `server-only` only during Node tests
2. Standardize unit test execution on `node --import ./tests/node-test-register.mjs --test ...` in `package.json`.
3. Add `import "server-only"` to `lib/orders/checkout.server.ts`.
4. Strengthen `tests/unit/order-runtime-boundaries.test.ts` so it proves boundary intent in a Node-compatible way: source-level assertion that `checkout.server.ts` contains `import "server-only"`, plus import-graph assertions that client files only reference `checkout.shared` and never `checkout.server`.
5. Optionally add `"type": "module"` in `package.json` to remove the current `[MODULE_TYPELESS_PACKAGE_JSON]` warnings. This is low risk here because the repo already uses `.mjs` for JS config/scripts.

This is the smallest path that satisfies the runner constraint without rewriting the repo around Node-native import rules.

### Risks
- A custom resolver can drift from real Next/TypeScript semantics if it grows too broad; keep it test-only and narrowly scoped.
- Shimming `server-only` makes server-module unit tests possible, but it does **not** by itself prove Next client-bundle rejection; that proof must remain structural or be covered by a separate framework-aware check.
- Repo-wide unit execution is improved but not magically fixed: the prototype reached `42/43` passing tests, and the remaining failure is an unrelated missing `middleware` target.
- Adding `"type": "module"` changes the default interpretation of any future plain `.js` files; today that risk is low because current configs/scripts are already `.mjs`.

### Ready for Proposal
Yes — propose a narrow infrastructure change centered on a Node preload resolver, explicit `server-only` in `checkout.server.ts`, and stronger boundary-proof tests. Avoid a repo-wide import rewrite unless the team explicitly wants to standardize all runtime code on stock Node ESM semantics.
