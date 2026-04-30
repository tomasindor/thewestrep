# Delta for Hybrid Payments

## MODIFIED Requirements

### Requirement: MP Configuration

MP availability MUST be configurable (enabled/disabled) without code changes. When disabled, the "Pagar con Mercado Pago" button MUST NOT appear. "Coordinar por WhatsApp" remains visible regardless of MP status.

(Previously: V1 hid MP as a "payment option"; V2 makes it an explicit button on the post-order screen.)

#### Scenario: MP enabled

- GIVEN MP config is enabled
- WHEN the post-order screen renders
- THEN the "Pagar con Mercado Pago" button is displayed

#### Scenario: MP disabled

- GIVEN MP config is disabled
- WHEN the post-order screen renders
- THEN the "Pagar con Mercado Pago" button is NOT displayed
- AND "Coordinar por WhatsApp" is still available

### Requirement: MP Payment Initiation

When the customer clicks "Pagar con Mercado Pago", the system SHALL redirect to MP checkout. The order MUST already exist with `pending_payment` status before any MP interaction. On MP success, order transitions to `paid`.

(Previously: V1 set `paymentStatus = pending`; V2 uses only `pending_payment` → `paid`.)

#### Scenario: MP payment initiates successfully

- GIVEN an order with `pending_payment` status
- WHEN the customer clicks "Pagar con Mercado Pago"
- THEN the system redirects to MP checkout

#### Scenario: MP API fails after redirect

- GIVEN an order with `pending_payment` status
- WHEN MP checkout fails or times out
- THEN the order remains `pending_payment` (NOT deleted)
- AND the customer sees an error message
- AND the "Coordinar por WhatsApp" button is still available

### Requirement: WhatsApp Coordination

WhatsApp coordination MUST always be available. The system SHALL open WhatsApp with a pre-filled message containing the order reference and total amount.

(Previously: V1 called this "WhatsApp Transfer Fallback" and set `paymentStatus = awaiting_transfer`; V2 removes awaiting_transfer — it's just an alternative path, not a separate status.)

#### Scenario: Customer clicks WhatsApp button

- GIVEN an order with reference and total amount
- WHEN the customer clicks "Coordinar por WhatsApp"
- THEN WhatsApp opens with a pre-filled message: reference, total, and contact intent

#### Scenario: MP customer switches to WhatsApp

- GIVEN MP checkout failed or was abandoned
- WHEN the customer clicks "Coordinar por WhatsApp" on the error screen
- THEN WhatsApp opens with the same pre-filled message
- AND the order remains `pending_payment`

## ADDED Requirements

### Requirement: Payment State Transitions

Only one valid transition exists: `pending_payment` → `paid`. Transition to `paid` is idempotent. Any other transition MUST be rejected.

(Previously: V1 had a full lifecycle with `paymentStatus` and `orderStatus` enums; V2 collapses both into a single `status` field with two values.)

#### Scenario: MP webhook confirms payment

- GIVEN an order with `pending_payment` status
- WHEN the MP webhook confirms payment
- THEN the order status transitions to `paid`

#### Scenario: Duplicate webhook processed idempotently

- GIVEN an order already in `paid` status
- WHEN the MP webhook sends a duplicate confirmation
- THEN the system acknowledges without error
- AND the order status remains `paid`

#### Scenario: Attempted invalid transition

- GIVEN an order with `paid` status
- WHEN any attempt to change status to `pending_payment` is made
- THEN the system MUST reject the transition

## REMOVED Requirements

### Requirement: Payment Status Lifecycle

(Reason: V2 removes the separate `paymentStatus` enum. The single `status` field replaces both `orderStatus` and `paymentStatus`.)

### Requirement: MP Webhook (Design Placeholder)

(Reason: V2 includes MP webhook as a concrete requirement above — no longer a design placeholder.)