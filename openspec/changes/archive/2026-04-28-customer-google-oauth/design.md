# Design: Customer Google OAuth

## Technical Approach

Implement a native Google OAuth2 flow specifically for the customer role. The flow uses Next.js Route Handlers (`app/api/customer-auth/google`) for the OAuth lifecycle (authorize, callback) and `lib/auth/customer-oauth.ts` for the business logic. Admin auth remains completely isolated under NextAuth. The UI checks environment variables to conditionally render the Google login button.

## Architecture Decisions

### Decision: Custom OAuth vs NextAuth for Customers

**Choice**: Custom OAuth via Route Handlers and `lib/auth/customer-oauth.ts`.
**Alternatives considered**: NextAuth with Google Provider.
**Rationale**: The proposal explicitly separates admin (NextAuth) from customer (custom sessions). Using a custom handler ensures zero overlap, complete control over the `googleSubject` account linking logic, and native integration with the existing `customerSessions` Drizzle schema without pulling in NextAuth dependencies for the customer space.

### Decision: State & CSRF Protection

**Choice**: Generate a random `state` string, store it in a short-lived `HttpOnly` `Secure` cookie, and pass it to Google. Store the sanitized `returnUrl` in another cookie.
**Alternatives considered**: Encoding the `returnUrl` directly into the `state` JWT.
**Rationale**: Storing `state` and `returnUrl` in cookies is standard, secure, and easier to validate. It prevents CSRF and ensures the user is returned to their exact checkout step.

### Decision: Account Linking Strategy

**Choice**: Link automatically by `googleSubject` or `email` ONLY if Google returns `email_verified: true`. If the email exists as a credentials account, link it and set `emailVerified` in our DB. Reject unverified emails.
**Alternatives considered**: Require manual password entry to link to an existing account.
**Rationale**: Since Google verifies the email, it's safe to automatically link it to an existing account with the same email, providing a seamless user experience.

## Data Flow

```text
User ──→ GET /api/customer-auth/google?returnUrl=/checkout
         │ (Sets 'google_oauth_state' and 'google_oauth_return_url' cookies)
         └─→ Redirect to Google Auth URL
         
Google ─→ GET /api/customer-auth/google/callback?code=...&state=...
         │ (Validates state cookie)
         ├─→ POST Google Token endpoint (Exchange code)
         ├─→ GET Google UserInfo endpoint (Verify email_verified === true)
         ├─→ upsertCustomerGoogleAccount() (Links/Creates account)
         ├─→ createCustomerSession() (Issues standard custom session)
         └─→ Redirect to sanitized returnUrl
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/api/customer-auth/google/route.ts` | Create | Initiates the Google OAuth flow, sets cookies, and redirects to Google. |
| `app/api/customer-auth/google/callback/route.ts` | Create | Handles Google callback, verifies state, exchanges token, fetches user info, creates session, and redirects. |
| `lib/auth/customer-oauth.ts` | Create | Contains the core OAuth logic: `generateGoogleAuthUrl`, `exchangeGoogleCodeForToken`, `getGoogleUserInfo`. |
| `lib/auth/customer-accounts.ts` | Modify | Update `upsertCustomerGoogleAccount` to ensure it correctly updates `emailVerified` when linking a verified Google email. |
| `components/auth/customer-login-experience.tsx` | Modify | Add the `Continuar con Google` CTA button that points to the new route handler, gated by `isGoogleAuthEnabled`. |

## Interfaces / Contracts

```typescript
export interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

export interface CustomerOAuthResult {
  account: {
    id: string;
    email: string;
    name: string;
    authProvider: "google";
  };
  sessionToken: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `customer-oauth.ts` | Mock `fetch` to verify token exchange, URL generation, and user info parsing logic. |
| Unit | `customer-accounts.ts` | Verify `upsertCustomerGoogleAccount` links correctly and sets `emailVerified` when linking to existing accounts. |
| E2E | OAuth Flow | Playwright tests navigating to `/api/customer-auth/google` and mocking the callback to simulate successful login, CSRF failure, and unverified email rejection. |

## Migration / Rollout

No database migration required as `googleSubject` and `emailVerified` already exist in the `customerAccounts` schema. Rollout consists of merging the code and setting `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the production environment.

## Open Questions

- [ ] Are there any specific scopes needed beyond `openid email profile`? (Assuming standard is enough).