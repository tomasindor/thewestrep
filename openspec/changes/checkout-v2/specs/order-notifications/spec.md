# Delta for Order Notifications

## MODIFIED Requirements

### Requirement: Order Confirmation Email

The system SHOULD send a confirmation email after order creation. The email is best-effort: email failure MUST NOT block order creation. In V2, the confirmation email is optional and MAY be deferred to V3.

(Previously: V1 required immediate confirmation email; V2 makes it optional/deferred.)

#### Scenario: Email sent after order creation

- GIVEN a customer creates an order
- WHEN the order is persisted
- THEN the system SHOULD attempt to send a confirmation email
- AND email failure MUST NOT block or roll back the order

#### Scenario: Email deferred to V3

- GIVEN the confirmation email feature is not yet implemented
- WHEN a customer creates an order
- THEN the order is still created successfully
- AND no email error is surfaced to the customer

## REMOVED Requirements

### Requirement: Email Content

(Reason: Deferred to V3 when confirmation email is implemented. Content spec will be defined then.)

### Requirement: No Status-Change Emails (V1)

(Reason: V2 only has two statuses and no status-change notifications. This requirement is implicit — no emails are sent on `pending_payment` → `paid` transition.)