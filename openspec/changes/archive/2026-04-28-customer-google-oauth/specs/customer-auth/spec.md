# Customer Authentication Specification — Google OAuth

## Purpose

Google OAuth for customer auth: start, callback, state/CSRF, returnUrl, verified email, linking/creation, duplicate prevention, env-gated UI, admin separation.

## ADDED Requirements

### Requirement: OAuth Start Flow

The system MUST generate a random state token, store it server-side with expiry and sanitized `returnUrl`, and redirect to Google with `openid email profile` scopes.

#### Scenario: Successful start

- GIVEN customer on login/register with Google enabled
- WHEN clicking "Continuar con Google"
- THEN system generates state, stores with returnUrl, redirects to Google

#### Scenario: Env missing

- GIVEN `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set
- WHEN start triggered
- THEN HTTP 501, no redirect

### Requirement: OAuth Callback Handling

The system MUST exchange code for tokens, validate ID token, extract email and `sub`, verify email, check state, then link, create, or reject.

#### Scenario: Existing Google-linked account

- GIVEN account with matching `googleSubject`
- WHEN valid callback with verified email
- THEN create customer session, redirect to returnUrl

#### Scenario: New account

- GIVEN no account for email or subject
- WHEN verified callback
- THEN create account with `googleSubject`, set `emailVerifiedAt`, issue session, redirect to returnUrl

#### Scenario: Auto-link email/password

- GIVEN account with matching email and `emailVerifiedAt` set
- WHEN same verified Google email callback
- THEN link `googleSubject`, preserve password, issue session, redirect to returnUrl

### Requirement: State and CSRF Protection

The system MUST validate callback state matches a stored, unexpired, one-time token. Invalid states MUST fail with generic error to login.

#### Scenario: Valid state consumed

- GIVEN state from start
- WHEN matching callback state
- THEN validated, deleted, flow continues

#### Scenario: Invalid state

- GIVEN expired, missing, or mismatched state
- WHEN callback processed
- THEN generic error, redirect to login

### Requirement: ReturnUrl Sanitization

The system MUST allow only same-origin relative paths. Unsafe URLs MUST default to customer dashboard.

#### Scenario: Valid returnUrl

- GIVEN `returnUrl=/checkout`
- WHEN flow completes
- THEN redirect to `/checkout`

#### Scenario: Unsafe returnUrl

- GIVEN `returnUrl=https://evil.com`
- WHEN flow completes
- THEN redirect to default dashboard

### Requirement: Verified Email Enforcement

The system MUST require `email_verified: true`. Unverified emails MUST be rejected.

#### Scenario: Verified accepted

- GIVEN `email_verified: true`
- WHEN callback processed
- THEN flow continues

#### Scenario: Unverified rejected

- GIVEN `email_verified: false` or missing
- WHEN callback processed
- THEN generic error, redirect to login

### Requirement: Duplicate googleSubject Prevention

The system MUST enforce `googleSubject` uniqueness at DB level. Duplicates MUST fail.

#### Scenario: Duplicate rejected

- GIVEN `googleSubject` linked to account A
- WHEN same `sub`, different email
- THEN generic error, redirect to login

### Requirement: UI Environment Gating

The Google button MUST render only when both env vars are set. MUST NOT appear on admin pages.

#### Scenario: Visible with env

- GIVEN both vars set
- WHEN customer login/register renders
- THEN button visible

#### Scenario: Hidden without env

- GIVEN either var missing
- WHEN page renders
- THEN button NOT rendered

### Requirement: Admin and Customer Separation

Google OAuth MUST be customer-only. No NextAuth changes, no admin exposure, no admin session via Google.

#### Scenario: Admin unaffected

- GIVEN admin login
- WHEN rendered
- THEN no Google button, existing auth unchanged

#### Scenario: Customer session only

- GIVEN successful callback
- WHEN session created
- THEN only customer session cookie issued

### Requirement: Tests and Non-Goals

Unit tests MUST cover state, callback, linking, duplicate rejection, returnUrl, env gating. E2E MUST cover happy path and errors. Out of scope: NextAuth, admin OAuth, other providers, email/password, verification, reset, guest checkout.

#### Scenario: Unit coverage

- WHEN tests run
- THEN state lifecycle, linking, sanitization, gating covered

#### Scenario: E2E happy path

- GIVEN Google configured
- WHEN new user completes flow
- THEN account created, reaches dashboard

#### Scenario: Non-goal preserved

- WHEN email/password tests run
- THEN behavior unchanged
