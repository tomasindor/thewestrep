# Delta for Admin Order Operations

## MODIFIED Requirements

### Requirement: Order List and Filtering

Admin MUST see a list of all orders showing: reference, customer name, total, and status. Status is either `pending_payment` or `paid`. Admin MUST be able to filter the list by status.

(Previously: V1 showed payment method, payment status, order status, delivery info; V2 simplifies to reference, customer, total, status only.)

#### Scenario: Admin views order list

- GIVEN the admin is authenticated
- WHEN the admin opens the orders view
- THEN all orders are displayed with reference, customer name, total, and status

#### Scenario: Admin filters by pending_payment

- GIVEN the admin is on the orders view
- WHEN the admin filters by status `pending_payment`
- THEN only orders with `pending_payment` status are shown

#### Scenario: Admin filters by paid

- GIVEN the admin is on the orders view
- WHEN the admin filters by status `paid`
- THEN only orders with `paid` status are shown

## REMOVED Requirements

### Requirement: Manual Payment Approval

(Reason: V2 defers manual admin payment capture to V3. Payment transitions are automatic via MP webhook or manual in V3.)

### Requirement: Order Status Changes

(Reason: V2 has no fulfillment states. `pending_payment` → `paid` is the only transition, and it's automatic. Manual status changes are V3.)

### Requirement: Contact and Delivery Editing

(Reason: V2 admin is read-only. Editing is deferred to V3.)

### Requirement: Internal Notes

(Reason: V2 admin is read-only. Internal notes are V3.)

### Requirement: Audit Trail

(Reason: V2 has no admin mutations to audit. V3 adds audit when admin actions are enabled.)