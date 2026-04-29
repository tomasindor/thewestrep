# Rollback / Disable Plan — customer-google-oauth

## 1) Disable Google OAuth entrypoint

Unset both variables in the target environment:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Expected behavior after deploy:

- `Continuar con Google` disappears from customer login/register.
- Existing Google-linked accounts remain in DB unchanged.
- Users can still authenticate with email/password if credentials exist.
- `/admin/login` remains unchanged.

## 2) Database impact

No migration rollback is required for this change.

- `googleSubject` already exists in `customerAccounts` schema.
- This rollout only exercises existing columns and constraints.

## 3) Route removal safety

If complete rollback is needed, these routes can be removed:

- `app/api/customer-auth/google/route.ts`
- `app/api/customer-auth/google/callback/route.ts`

Removal impact:

- Google OAuth stops working for customers.
- Email/password auth and session APIs remain functional.
- Admin authentication remains isolated under `/admin/login`.
