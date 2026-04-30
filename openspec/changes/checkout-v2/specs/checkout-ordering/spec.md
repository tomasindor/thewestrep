# Delta for Checkout Ordering

## MODIFIED Requirements

### Requirement: Guest Checkout

Unauthenticated customers MUST create an order by providing: name, phone, email, province (dropdown), city (dropdown), address, recipient, and optional notes. Guest checkout MUST NOT require CUIL, purchase type selection, or account creation.

(Previously: V1 required CUIL and purchase-type selection; V2 removes them.)

#### Scenario: Guest submits valid order form

- GIVEN a guest customer at checkout
- WHEN they fill name, phone, email, province, city, address, recipient and submit
- THEN the system creates the order with `pending_payment` status
- AND displays a confirmation screen with reference, total, and "Pendiente de pago" label

#### Scenario: Guest omits required fields

- GIVEN a guest customer at checkout
- WHEN they submit without name, phone, email, province, city, address, or recipient
- THEN the system MUST reject with field-level validation errors

#### Scenario: Invalid email format

- GIVEN a guest customer at checkout
- WHEN they submit with an invalid email format
- THEN the system MUST reject with an email format validation error

#### Scenario: Invalid phone format

- GIVEN a guest customer at checkout
- WHEN they submit with an invalid phone format
- THEN the system MUST reject with a phone validation error

### Requirement: Account Checkout

(REMOVED — V2 does not differentiate guest/account checkout. All checkouts are guest-first.)
(Reason: V2 simplifies to guest-only; account pre-fill deferred to V3.)

## ADDED Requirements

### Requirement: Simplified Order States

The system SHALL support exactly two order statuses: `pending_payment` and `paid`. No other order or payment status enums exist in V2.

#### Scenario: Order created with pending_payment

- GIVEN a customer submits a valid order
- WHEN the order is persisted
- THEN the order status is `pending_payment`

#### Scenario: Payment transitions order to paid

- GIVEN an order with status `pending_payment`
- WHEN payment is confirmed (MP webhook or manual)
- THEN the order status transitions to `paid`
- AND the transition is idempotent — re-processing the same payment MUST NOT error

#### Scenario: Invalid status transition rejected

- GIVEN an order with status `paid`
- WHEN any attempt to change the status is made
- THEN the system MUST reject the transition

### Requirement: Post-Order Pending Payment Screen

After order creation, the system MUST display a confirmation screen showing: order reference, total amount, "Pendiente de pago" status label, "Pagar con Mercado Pago" button, and "Coordinar por WhatsApp" button.

#### Scenario: Post-order screen displays correctly

- GIVEN an order just created with `pending_payment` status
- WHEN the post-order screen renders
- THEN it shows the order reference, total amount, "Pendiente de pago" label
- AND displays "Pagar con Mercado Pago" and "Coordinar por WhatsApp" buttons

#### Scenario: Returning to pending order

- GIVEN a customer with a `pending_payment` order
- WHEN they navigate to the order's payment URL
- THEN the pending payment screen is shown with both payment buttons
- AND if a payment already exists for this order, the system redirects to payment status

## REMOVED Requirements

### Requirement: Stock Validation

(Reason: V2 defers stock validation to V3. Orders are created regardless of stock.)

### Requirement: Pricing Integrity

(Reason: V2 defers server-side price mismatch rejection to V3. Total is calculated server-side but mismatches are not rejected — they are logged for admin review.)

### Requirement: Pending Order Validity

(Reason: V2 removes 24-hour expiry. Orders stay `pending_payment` until paid or cancelled by admin.)