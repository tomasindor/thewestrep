import type { LegacyCustomerCompatibilityFixture } from "../../lib/auth/rollback-migration-safety";

export const LEGACY_AUTH_COMPATIBILITY_FIXTURES: ReadonlyArray<LegacyCustomerCompatibilityFixture> = [
  {
    customerId: "legacy-1",
    email: "legacy@example.com",
    plainPassword: "Secret123",
    passwordHash: "hash:legacy:ok",
    legacySessionToken: "nextauth-jwt-token",
  },
  {
    customerId: "legacy-2",
    email: "legacy2@example.com",
    plainPassword: "WrongPass123",
    passwordHash: "hash:legacy:expected",
    legacySessionToken: "nextauth-jwt-token-2",
  },
];
