# node-test-runtime-compat Specification

## Purpose

Define native `node --test` execution for checkout-focused unit suites without broadening test infrastructure enough to hide real runtime-boundary problems.

## Requirements

### Requirement: Checkout suites run under native Node

The system MUST provide a standard native `node --test` path for checkout-related unit suites. Any preload support SHALL remain test-only and narrowly limited to the checkout/runtime-boundary import patterns called out by this change.

#### Scenario: Checkout suites execute with the standard command

- GIVEN checkout-related unit suites depend on the approved preload support
- WHEN the repository's standard Node unit-test command is executed
- THEN those checkout-related suites SHALL run under native `node --test`
- AND they SHALL NOT require `tsx` or another alternate TypeScript runner

#### Scenario: Narrow resolution does not hide unrelated failures

- GIVEN a unit test imports a missing or unsupported module outside the approved checkout allowances
- WHEN the same native `node --test` command runs
- THEN Node MUST still report the module-resolution failure
- AND the preload MUST NOT silently rewrite unrelated specifiers

### Requirement: Checkout server code is explicitly server-only

The system MUST mark `lib/orders/checkout.server.ts` with `import "server-only"` so the server boundary is explicit and framework-aware.

#### Scenario: Server-only marker is present

- GIVEN the checkout server module source is inspected
- WHEN runtime-boundary verification runs
- THEN `lib/orders/checkout.server.ts` SHALL contain `import "server-only"`
- AND the marker SHALL be treated as required boundary intent, not optional documentation

#### Scenario: Shared checkout surface stays client-safe

- GIVEN checkout utilities are consumed from client-safe code paths
- WHEN the runtime boundary is verified
- THEN client-safe imports SHALL target the shared checkout module
- AND they MUST NOT require importing `checkout.server`

### Requirement: Runtime-boundary evidence is structural and runnable

The system MUST require checkout runtime-boundary verification to include both executable assertions and structural evidence. Passing under Node alone SHALL NOT be accepted as proof of safe client/server separation.

#### Scenario: Boundary suite proves export separation

- GIVEN the checkout runtime-boundary suite runs under native Node
- WHEN it evaluates the checkout modules
- THEN it SHALL prove the shared module does not expose server-only exports
- AND it SHALL prove the server module exposes the server-only reference builder

#### Scenario: Boundary suite proves intent beyond the shim

- GIVEN Node tests may use a no-op `server-only` shim for execution compatibility
- WHEN the boundary suite passes
- THEN the suite MUST also assert source or import-graph evidence for the server-only boundary
- AND shimmed execution alone MUST NOT satisfy the requirement
