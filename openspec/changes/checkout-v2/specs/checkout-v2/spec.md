# Checkout V2 — Specification (Concatenated)

## checkout-ordering

### MODIFIED Requirements

**Guest Checkout**: Unauthenticated customers MUST create an order with: name, phone, email, province (dropdown), city (dropdown), address, recipient, optional notes. MUST NOT require CUIL, purchase type, or account. Validation rejects missing required fields, invalid email format, invalid phone format. On submit → `pending_payment` status, confirmation screen with reference + total + "Pendiente de pago".

**Account Checkout**: REMOVED — V2 is guest-only; account pre-fill deferred to V3.

### ADDED Requirements

**Simplified Order States**: Two statuses only: `pending_payment` → `paid`. `pending_payment` created on order submit. `paid` on payment confirmation (idempotent). Rejected transitions from `paid`.

**Post-Order Pending Payment Screen**: Shows reference, total, "Pendiente de pago" label, "Pagar con Mercado Pago" button, "Coordinar por WhatsApp" button. If payment already exists, redirect to payment status.

### REMOVED Requirements

**Stock Validation** → V3. **Pricing Integrity** (mismatch rejection) → V3. **Pending Order Validity** (24h expiry) → removed.

---

## hybrid-payments

### MODIFIED Requirements

**MP Configuration**: Enable/disable MP without code changes. Disabled = hide "Pagar con Mercado Pago" button. WhatsApp always available.

**MP Payment Initiation**: Order exists before MP interaction. Click → redirect to MP checkout. Failure → order stays `pending_payment`, error shown, WhatsApp button still available.

**WhatsApp Coordination**: Always available. Opens WhatsApp with pre-filled message (reference + total). Not a separate status — just an alternative path.

### ADDED Requirements

**Payment State Transitions**: Single field `status` with two values. Only `pending_payment` → `paid`. Idempotent. MP webhook confirms → `paid`. Duplicate webhook → acknowledge, no error.

### REMOVED Requirements

**Payment Status Lifecycle** → collapsed into single `status`. **MP Webhook (Design Placeholder)** → now concrete.

---

## georef-location-selection

### NEW Requirements

**Province Dropdown**: 24 Argentine provinces from Georef API, server-side cached, "Seleccioná provincia" placeholder. Fetch failure → error state with retry, form blocked.

**City Dropdown**: Dependent on province. Province selected → fetch departamentos server-side. Province changed → reset city dropdown. Fetch failure → retry option + validation message. Default "Seleccioná ciudad".

**Georef Data Persistence**: Persist IDs + labels (province name, city name) on order. Ensures address stability if Georef data changes.

**Server-Side Caching**: Province data cached via Next.js cache/revalidation. City data fetched via server route/action. Client NEVER calls Georef directly.

---

## admin-order-operations

### MODIFIED Requirements

**Order List and Filtering**: Show reference, customer name, total, status (`pending_payment` | `paid`). Filter by status.

### REMOVED Requirements

**Manual Payment Approval** → V3. **Order Status Changes** → V3. **Contact/Delivery Editing** → V3. **Internal Notes** → V3. **Audit Trail** → V3.

---

## order-notifications

### MODIFIED Requirements

**Order Confirmation Email**: Optional/deferred in V2. Best-effort — email failure MUST NOT block order creation. MAY be fully deferred to V3.

### REMOVED Requirements

**Email Content** → V3. **No Status-Change Emails** → implicit (V2 has no status-change emails).