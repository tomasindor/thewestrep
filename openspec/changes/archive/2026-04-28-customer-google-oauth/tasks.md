# Tasks: Customer Google OAuth

## Phase 1: Environment & Feature Gate

- [x] 1.1 Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars to `.env.local.example` with comment: "Google OAuth2 for customer login"
- [x] 1.2 In `components/auth/customer-login-experience.tsx`: replace `signIn("google", ...)` call in `startGoogleCustomerSignIn` with `window.location.href = "/api/customer-auth/google?returnUrl=" + encodeURIComponent(safeReturnUrl)` so it routes to custom handler instead of NextAuth
- [x] 1.3 Add `isGoogleAuthEnabled` helper in `lib/auth/customer-auth-client.ts` that returns `Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)` — matches existing pattern for `isEmailAuthEnabled`

## Phase 2: OAuth Core Library

- [x] 2.1 Create `lib/auth/customer-oauth.ts` with: `generateGoogleAuthUrl(returnUrl: string): string` — builds Google OAuth URL with `openid email profile` scopes, encodes state and returnUrl in cookies
- [x] 2.2 In `customer-oauth.ts`: add `exchangeGoogleCodeForToken(code: string): Promise<GoogleTokenResponse>` — POST to Google token endpoint
- [x] 2.3 In `customer-oauth.ts`: add `getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo>` — fetch userinfo from Google, verify `email_verified === true`; throw if false or missing
- [x] 2.4 Add `GoogleUserInfo` and `GoogleTokenResponse` interfaces matching the spec: `{ sub, name, given_name, picture, email, email_verified }` for userinfo

## Phase 3: Route Handlers

- [x] 3.1 Create `app/api/customer-auth/google/route.ts` (GET): generate random state, set `google_oauth_state` HttpOnly cookie (5 min expiry) and `google_oauth_return_url` HttpOnly cookie (sanitized returnUrl), redirect to Google auth URL
- [x] 3.2 Create `app/api/customer-auth/google/callback/route.ts` (GET): read and validate state cookie (delete after use), exchange code for token, get user info (reject unverified), call `upsertCustomerGoogleAccount`, call `createCustomerSession`, redirect to returnUrl cookie (or default `/`)
- [x] 3.3 In `customer-accounts.ts` `upsertCustomerGoogleAccount`: when linking existing email/password account, set `emailVerified: new Date()` (Google has already verified the email)
- [x] 3.4 In `customer-accounts.ts`: add DB-level uniqueness guard on `googleSubject` column via explicit constraint check — throw `CustomerAccountExistsError` if duplicate `googleSubject` with different email is detected

## Phase 4: UI Button

- [x] 4.1 In `customer-login-experience.tsx` login mode: render `Continuar con Google` button pointing to `/api/customer-auth/google?returnUrl={safeReturnUrl}` when `isGoogleAuthEnabled && !isGoogleConnected`
- [x] 4.2 Button must NOT appear on admin pages — ensure parent `admin-boundary.tsx` or page layout excludes it (verify no Google button leaks into admin login)
- [x] 4.3 Error UX: callback errors redirect to `/login?error=oauth_failed` — display generic "No se pudo iniciar sesión con Google" in `CustomerLoginExperience` when `searchParams.error` is present

## Phase 5: Unit Tests

- [x] 5.1 `tests/unit/customer-oauth.test.ts`: mock global `fetch`, test `generateGoogleAuthUrl` produces valid Google URL with correct client_id, redirect_uri, scope, state
- [x] 5.2 `tests/unit/customer-oauth.test.ts`: test `exchangeGoogleCodeForToken` and `getGoogleUserInfo` parse response correctly; throw on `email_verified: false`
- [x] 5.3 `tests/unit/customer-accounts.test.ts`: extend existing tests for `upsertCustomerGoogleAccount` to verify: (a) auto-links by googleSubject, (b) auto-links by email when verified, (c) sets `emailVerified` timestamp on link, (d) rejects duplicate googleSubject with different email
- [x] 5.4 `tests/unit/customer-session.test.ts`: add test that `createCustomerSession` works for Google-linked accounts
- [x] 5.5 `tests/unit/customer-auth-navigation.test.ts`: verify `sanitizeAuthReturnUrl` blocks cross-origin `returnUrl` (already tested but ensure coverage)

## Phase 6: E2E Tests (Playwright)

- [x] 6.1 `tests/e2e/google-oauth.spec.ts`: test Google button hidden when `GOOGLE_CLIENT_ID` not set (env gating scenario)
- [x] 6.2 `tests/e2e/google-oauth.spec.ts`: test OAuth state cookie is set on start, consumed on callback (CSRF protection scenario)
- [x] 6.3 `tests/e2e/google-oauth.spec.ts`: test callback with expired/invalid state redirects to login with error
- [x] 6.4 `tests/e2e/google-oauth.spec.ts`: test unverified email callback redirects to login with error
- [x] 6.5 `tests/e2e/google-oauth.spec.ts`: test admin pages have no Google button (admin separation scenario)
- [x] 6.6 `tests/e2e/google-oauth.spec.ts`: happy path — new user completes Google OAuth, account created, redirected to dashboard

## Phase 7: Rollback / Disable Plan

- [x] 7.1 Document: to disable, unset `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — button disappears, existing Google-linked accounts remain functional but cannot re-authenticate via Google (password auth still works)
- [x] 7.2 No DB migration required — `googleSubject` column already exists in schema
- [x] 7.3 Route handlers `app/api/customer-auth/google/` can be deleted entirely without breaking email/password auth
