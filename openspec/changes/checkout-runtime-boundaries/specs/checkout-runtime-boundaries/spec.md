# checkout-runtime-boundaries Specification

## Purpose

Define checkout module boundaries so browser-imported code remains client-safe while order reference generation remains server-only.

## Requirements

### Requirement: Browser-safe shared checkout module

The system MUST expose checkout schemas, types, and pure helpers needed by both runtimes from a shared module that is safe to import from Client Components, hooks, and server code.

#### Scenario: Client consumer imports shared helpers

- GIVEN a client-side checkout consumer needs pricing, labels, or payload validation
- WHEN it imports checkout utilities
- THEN every imported symbol MUST come from the shared checkout module
- AND the import graph MUST remain free of Node-only modules

#### Scenario: Shared payload contract remains stable

- GIVEN existing checkout consumers rely on the current payload and pricing contracts
- WHEN the checkout module is split
- THEN the shared module MUST preserve those contracts without behavior changes

### Requirement: Server-only order reference generation

The system MUST isolate order reference generation in a server-only module. That module MUST NOT be importable from client-side code and SHALL remain available to server-side order creation flows.

#### Scenario: Server order creation uses server reference builder

- GIVEN the order repository or API route needs a new order reference
- WHEN it requests reference generation
- THEN it MUST import the server-only checkout module
- AND the generated reference format MUST remain compatible with current persisted orders

#### Scenario: Client attempts to reach server-only code

- GIVEN a client-side module imports the server-only checkout module
- WHEN the application is type-checked or bundled
- THEN the system MUST fail that usage before it can ship in the browser bundle

### Requirement: Runtime-aware consumer boundaries

The system MUST update checkout consumers so each runtime imports only the symbols appropriate for that runtime, without changing the public behavior of the checkout experience.

#### Scenario: Hook stays browser-safe

- GIVEN `use-checkout-controller` runs as a Client Component hook
- WHEN it is built for the browser
- THEN it MUST depend only on shared checkout exports
- AND checkout totals, labels, and validation behavior MUST remain unchanged

#### Scenario: Server consumers compose both modules

- GIVEN route handlers or repositories need both shared validation and server reference generation
- WHEN they import checkout functionality
- THEN they MAY combine shared and server-only modules
- AND no client-imported path may re-export the server-only symbols

### Requirement: Build and verification protection

The system MUST provide verification signals that the runtime split removed the previous boundary violation and did not regress checkout behavior.

#### Scenario: Boundary regression check

- GIVEN the checkout runtime split is implemented
- WHEN the project runs its defined type-check and checkout-focused tests
- THEN they MUST pass without cross-runtime import failures
- AND order pricing, profile patching, and order reference expectations MUST still hold

#### Scenario: Browser bundle no longer resolves Node-only checkout code

- GIVEN the checkout flow is included in a browser build
- WHEN Next.js analyzes client imports
- THEN the client bundle MUST NOT resolve `node:crypto` through checkout imports
- AND server order processing MUST remain functional
