# Design: Node Test Runtime Compatibility

## Technical Approach

Implement a targeted ESM preload hook (`node-test-register.mjs` and `node-test-resolver.mjs`) to enable native Node unit testing for checkout modules. The hook intercepts and resolves `node --test` imports to handle Next.js-specific path aliases (`@/`), extensionless relative TypeScript imports, dotted basenames, and a no-op shim for the `server-only` package. We rely on Node's built-in ESM loader to handle TypeScript via its automatic module syntax detection (the `.ts` extension causes Node to re-parse as ESM). We augment the checkout module with an explicit `server-only` import and strengthen structural boundary tests, keeping test infrastructure explicitly minimal without rewriting the codebase to stock ESM rules.

## Architecture Decisions

### Decision: Preload hook vs Jest/Vitest

**Choice**: Use native Node tests (`node --test`) with a narrow custom ESM hook (`register`).
**Alternatives considered**: Adopting Vitest or Jest.
**Rationale**: Vitest/Jest introduce massive configuration surface areas and magic bundling that masks real runtime boundary issues. A narrow Node hook gives us just enough compatibility to test Next.js modules while keeping the environment close to raw Node execution, preventing false positives.

### Decision: Handling `server-only` in tests

**Choice**: Shim `server-only` module resolution to a no-op in the resolver hook.
**Alternatives considered**: Installing a mock package or relying on Next.js to strip it.
**Rationale**: `server-only` throws when required outside of React server environments or when run directly in Node. Shimming it purely in the test resolver avoids patching the code or modifying standard Next.js behavior, allowing server modules to be tested structurally in standard Node.

### Decision: Extensionless and Alias Resolution

**Choice**: Intercept `resolve` in `node-test-resolver.mjs` to map `@/` to absolute paths and append `.ts` or `/index.ts` to unresolved relative paths. Let Node's native ESM loader handle TypeScript parsing via its automatic module detection.

**Alternatives considered**: Using `tsx` loader directly without a custom hook.

**Rationale**: The custom resolver handles our specific needs (aliases, server-only shim, extensionless imports) and delegates TypeScript parsing to Node's built-in ESM module (Node detects `.ts` files and reparses them as ESM). This avoids adding a tsx dependency while keeping the resolver narrow.

## Data Flow

    Node Test Runner ──→ node-test-register.mjs (registers custom resolver)
                          │
                          └─→ node-test-resolver.mjs (resolve hook) ──→ Node's native ESM loader
                                   │                                         │
                                   └──── aliases / shims / extensions ───────┘

1. Runner executes `node --import ./tests/node-test-register.mjs --test`.
2. `node-test-register.mjs` registers `node-test-resolver.mjs`.
3. Resolver intercepts module resolutions.
4. If `server-only`, it resolves to a custom data URL stub (shortCircuit: true).
5. If `@/...`, it maps to absolute project paths.
6. If an extensionless relative path, it appends `.ts` or `/index.ts`.
7. Other specifiers pass to `nextResolve()` - Node's native ESM loader handles TypeScript parsing via automatic module detection.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/node-test-register.mjs` | Create | ESM hook registration entrypoint (registers custom resolver). |
| `tests/node-test-resolver.mjs` | Create | The actual ESM `resolve` hook implementation. |
| `package.json` | Modify | Add `"test:unit": "node --import ./tests/node-test-register.mjs --test \"tests/unit/**/*.test.ts\""` script. |
| `lib/orders/checkout.server.ts` | Modify | Add `import "server-only"` to structurally protect the server boundary. |
| `tests/unit/order-runtime-boundaries.test.ts` | Modify | Assert boundary intent and verify it runs smoothly with the shim. |
| `tests/unit/order-checkout.test.ts` | Modify | Verify business logic correctly executes under native Node runner. |
| `tests/unit/client-safe-checkout.test.ts` | Create | Executable proof that client-safe surface loads without reaching server. |

## Interfaces / Contracts

`tests/node-test-register.mjs`:
```javascript
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register our custom resolver for aliases and shims
// TypeScript parsing handled by Node's native ESM loader
const resolverPath = pathToFileURL("./tests/node-test-resolver.mjs").href;
register(resolverPath, pathToFileURL("./"));

console.log("[node-test-register] Custom resolver registered");
```

`tests/node-test-resolver.mjs`:
```javascript
export async function resolve(specifier, context, nextResolve) {
  // Handle server-only shim with shortCircuit
  if (specifier === "server-only" || specifier.startsWith("server-only/")) {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent("export default {};")}`,
      format: "module",
    };
  }
  
  // Handle @/ path aliases → pass to nextResolve with absolute path
  // Handle extensionless relative imports → append .ts or /index.ts
  // Pass through to nextResolve for remaining specifiers
  return nextResolve(specifier, context);
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `order-runtime-boundaries.test.ts` | Execute with `node --test` to verify `server-only` doesn't crash tests and boundaries are enforced. |
| Unit | `order-checkout.test.ts` | Execute with the hook to verify business logic and check that imports correctly resolve. |

## Migration / Rollout

No migration required. This is a targeted addition to the test infrastructure.

## Open Questions

- [ ] Does `tsx` seamlessly handle the output of our custom resolver when chained in Node 20+, or do we need to implement a lightweight `load` hook as well? (Expected: `resolve` is enough).
