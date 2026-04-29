# Archive Report: login-register-auth

**Change**: login-register-auth
**Archived**: 2026-04-28
**Artifact Store**: hybrid (Engram + OpenSpec/filesystem)
**Status**: COMPLETE

---

## Executive Summary

The `login-register-auth` change is fully archived. This was a comprehensive customer authentication overhaul that introduced database-backed sessions, email verification gating, rate limiting, guest checkout preservation, contextual redirects, and admin/customer separation — all implemented and verified with 104/104 tests passing (100 unit + 4 E2E), 0 TypeScript errors, 0 lint warnings, and 31/31 spec scenarios compliant.

---

## Verification Summary

| Metric | Value |
|--------|-------|
| Tasks complete | 95/95 (100%) |
| Unit tests | 100/100 |
| E2E tests | 4/4 |
| TypeScript errors | 0 |
| Lint warnings | 0 |
| Spec scenarios | 31/31 compliant |
| Final verdict | **PASS** |

**Previous warnings resolved:**
- 12 TypeScript `undefined` vs `null` errors from Drizzle `findFirst` — Fixed with `?? null` normalization
- 1 unused constant `SESSION_TTL_SECONDS` — Removed
- Test typing `RequestInfo | URL` and `CreatedOrderSummary` mock shape — Fixed

---

## Artifacts Archived

| Artifact | Location | Observation ID (Engram) |
|----------|----------|--------------------------|
| proposal | `openspec/changes/archive/2026-04-28-login-register-auth/proposal.md` | — |
| exploration | `openspec/changes/archive/2026-04-28-login-register-auth/exploration.md` | — |
| design | `openspec/changes/archive/2026-04-28-login-register-auth/design.md` | — |
| spec (delta) | `openspec/changes/archive/2026-04-28-login-register-auth/specs/customer-auth/spec.md` | — |
| tasks | `openspec/changes/archive/2026-04-28-login-register-auth/tasks.md` | — |
| apply-progress | `openspec/changes/archive/2026-04-28-login-register-auth/apply-progress.md` | — |
| verify-report | `openspec/changes/archive/2026-04-28-login-register-auth/verify-report.md` | obs #1176 |
| ROLLBACK | `openspec/changes/archive/2026-04-28-login-register-auth/ROLLBACK.md` | obs #1162 |

---

## Spec Sync (Delta → Main)

| Domain | Action | Requirements |
|--------|--------|--------------|
| `customer-auth` | Created | 10 requirements, 31 scenarios — all synced to `openspec/specs/customer-auth.md` |

The delta spec was a standalone full spec (not a delta against existing), so it was copied directly to `openspec/specs/customer-auth.md` as the new source of truth for customer authentication behavior.

---

## Archive Contents

```
openspec/changes/archive/2026-04-28-login-register-auth/
├── proposal.md          ✅
├── exploration.md        ✅
├── design.md             ✅
├── specs/
│   └── customer-auth/
│       └── spec.md      ✅
├── tasks.md             ✅ (95/95 tasks complete)
├── apply-progress.md    ✅
├── verify-report.md     ✅ (PASS)
└── ROLLBACK.md          ✅
```

---

## Source of Truth Updated

- `openspec/specs/customer-auth.md` — New spec capturing all customer authentication requirements

---

## Risks

1. **No integration test layer**: Unit tests (mocked DB) and E2E tests (mocked API routes) exist, but no middle-layer integration tests exercise the full stack with a real database.
2. **Email sending is non-blocking**: Password reset email failures are silently swallowed via `try/catch + console.warn`.
3. **Manual DB migration**: Task 1.5 (`npm run db:push`) was executed by the user in an interactive TTY, not by the automated system.
4. **Node.js module type warning**: `MODULE_TYPELESS_PACKAGE_JSON` cosmetic warning in test output due to missing `"type": "module"` in `package.json`.

---

## Next Recommended

- Google OAuth implementation (deferred from this change)
- Integration test layer between unit and E2E
- Shared utility for `?? null` normalization pattern

---

## SDD Cycle Complete

The `login-register-auth` change has been fully planned, implemented, verified, and archived. Ready for the next change.

---

*Archived by SDD archive phase on 2026-04-28. Artifact store: hybrid.*