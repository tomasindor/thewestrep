# Proposal: Customer Google OAuth

## Intent

Enable Google OAuth for public customer login/register while preserving the existing custom customer session model, guest checkout, email/password flows, and complete admin/customer auth separation.

## Scope

### In Scope
- Custom Google OAuth flow for customer auth only: authorize, callback, account lookup/link/create, and customer session creation.
- Google button in login and register modes only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
- Secure `returnUrl` preservation across checkout → login/register → Google → checkout.
- Verified Google email handling: require verified email, set `emailVerifiedAt`, and link verified Google email to an existing password account.

### Out of Scope
- NextAuth changes or Google provider for admin auth.
- Other social providers.
- Replacing existing email/password, verification, password reset, or guest checkout flows.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `customer-auth`: Replace the deferred Google OAuth requirement with customer-only Google OAuth behavior, security constraints, account linking, env-gated UI, and contextual redirects.

## Approach

Add a custom customer OAuth adapter inside `lib/` that performs state/CSRF protection, Google code exchange, token/user validation, verified-email enforcement, subject uniqueness checks, customer creation/linking, and existing custom DB session issuance. Route handlers under customer auth endpoints coordinate redirects and callbacks; UI reads a server-side env availability flag to conditionally render `Continuar con Google`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/**/login`, `app/**/register` | Modified | Add env-gated Google CTA while preserving modes and guest checkout path. |
| `app/api/**/customer-auth/**` | New/Modified | Add OAuth start/callback route handlers. |
| `lib/**/customer-auth` | Modified | Add OAuth service, state storage/validation, account linking, session creation. |
| `db/schema` or auth persistence | Modified | Persist `googleSubject` with uniqueness guarantees. |
| `tests/unit`, `tests/e2e` | Modified | Cover OAuth security, linking, env gating, redirects, and guest preservation. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Account takeover via unsafe linking | Med | Link only verified Google emails; enforce unique `googleSubject`; generic failures. |
| OAuth CSRF/open redirect | Med | Signed/one-time state and strict same-origin relative `returnUrl` sanitization. |
| Admin/customer boundary regression | Low | No NextAuth provider changes; customer-only cookies/routes/tests. |
| Provider misconfiguration | Med | Hide UI when env is missing and fail closed server-side. |

## Rollback Plan

Disable Google env vars to hide the entrypoint, then revert OAuth routes/services and schema migration if necessary. Existing email/password sessions and guest checkout remain operational.

## Dependencies

- Google OAuth client credentials and approved redirect URI.
- Database migration for Google subject persistence.

## Success Criteria

- [ ] Verified Google users can register/login and return to sanitized `returnUrl`.
- [ ] Existing verified email/password accounts link automatically to Google.
- [ ] Unverified Google emails, duplicate subjects, bad state, and unsafe redirects are rejected.
- [ ] Admin auth, email/password auth, and guest checkout behavior remain unchanged.
