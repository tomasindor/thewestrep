import "server-only";

import { randomUUID } from "node:crypto";

import { eq, or } from "drizzle-orm";

import {
  customerRegistrationSchema,
  normalizeCustomerEmail,
} from "@/lib/auth/customer-credentials";
import { hashCustomerCredentialPassword, verifyCustomerCredentialPassword } from "@/lib/auth/customer-credentials-server";
import { getDb } from "@/lib/db/core";
import { customerAccounts } from "@/lib/db/schema";

export class CustomerAuthConfigurationError extends Error {
  constructor(message = "La base de datos no está configurada para auth/customer.") {
    super(message);
    this.name = "CustomerAuthConfigurationError";
  }
}

export class CustomerAccountExistsError extends Error {
  constructor(message = "Ya existe una cuenta customer con ese email.") {
    super(message);
    this.name = "CustomerAccountExistsError";
  }
}

export class CustomerGoogleAccountExistsError extends Error {
  constructor(message = "Ya existe una cuenta de Google para ese email. Iniciá sesión con Google.") {
    super(message);
    this.name = "CustomerGoogleAccountExistsError";
  }
}

export interface CustomerSessionIdentity {
  id: string;
  name: string;
  email: string;
  role: "customer";
  authProvider: "credentials" | "google";
}

export interface ExistingGoogleAccountCandidate {
  id: string;
  email: string;
  googleSubject: string | null;
}

export interface ResolvedGoogleAccountUpsert {
  id: string;
  email: string;
  name: string;
  googleSubject: string;
  emailVerified: Date;
}

export function resolveGoogleAccountUpsert(input: {
  email: string;
  name: string;
  googleSubject: string;
  existing: ExistingGoogleAccountCandidate | null;
  now?: () => Date;
}) {
  const email = normalizeCustomerEmail(input.email);
  const existing = input.existing;
  const now = input.now ?? (() => new Date());
  const resolvedId = existing?.id ?? randomUUID();

  if (existing?.googleSubject && existing.googleSubject === input.googleSubject && existing.email !== email) {
    throw new CustomerAccountExistsError("La cuenta de Google ya está vinculada a otro usuario.");
  }

  return {
    id: resolvedId,
    values: {
      id: resolvedId,
      email,
      name: input.name.trim(),
      googleSubject: input.googleSubject,
      emailVerified: now(),
      updatedAt: now(),
    } satisfies ResolvedGoogleAccountUpsert & { updatedAt: Date },
    normalizedEmail: email,
  };
}

function requireDb() {
  const db = getDb();

  if (!db) {
    throw new CustomerAuthConfigurationError();
  }

  return db;
}

export async function findCustomerAccountByEmail(email: string) {
  const db = requireDb();

  return db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.email, normalizeCustomerEmail(email)),
  });
}

export async function registerCustomerEmailPasswordAccount(input: {
  email: string;
  password: string;
  name: string;
  verificationToken?: string | null;
  verificationTokenExpiresAt?: Date | null;
  privacyConsentAcceptedAt?: Date | null;
  privacyConsentVersion?: string | null;
}) {
  const db = requireDb();
  const parsed = customerRegistrationSchema.parse(input);
  const email = normalizeCustomerEmail(parsed.email);
  const existing = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.email, email),
  });

  if (existing?.passwordHash) {
    throw new CustomerAccountExistsError();
  }

  if (existing?.googleSubject) {
    throw new CustomerGoogleAccountExistsError();
  }

  const passwordHash = await hashCustomerCredentialPassword(parsed.password);
  const id = existing?.id ?? randomUUID();
  const values = {
    id,
    email,
    name: parsed.name,
    passwordHash,
    emailVerified: null,
    verificationToken: input.verificationToken ?? null,
    verificationTokenExpiresAt: input.verificationTokenExpiresAt ?? null,
    privacyConsentAcceptedAt: input.privacyConsentAcceptedAt ?? null,
    privacyConsentVersion: input.privacyConsentVersion ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(customerAccounts).set(values).where(eq(customerAccounts.id, existing.id));
  } else {
    await db.insert(customerAccounts).values(values);
  }

  return {
    id,
    name: parsed.name,
    email,
    role: "customer" as const,
    authProvider: "credentials" as const,
  };
}

export async function authenticateCustomerEmailPassword(input: { email: string; password: string }) {
  const db = requireDb();
  const email = normalizeCustomerEmail(input.email);
  const account = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.email, email),
  });

  if (!account?.passwordHash) {
    return null;
  }

  const isValidPassword = await verifyCustomerCredentialPassword(input.password, account.passwordHash);

  if (!isValidPassword) {
    return null;
  }

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: "customer" as const,
    authProvider: "credentials" as const,
  };
}

export async function upsertCustomerGoogleAccount(input: { email: string; name: string; googleSubject: string }) {
  const db = requireDb();
  const existing = await db.query.customerAccounts.findFirst({
    where: or(eq(customerAccounts.googleSubject, input.googleSubject), eq(customerAccounts.email, normalizeCustomerEmail(input.email))),
  });
  const resolved = resolveGoogleAccountUpsert({
    email: input.email,
    name: input.name,
    googleSubject: input.googleSubject,
    existing: existing
      ? {
          id: existing.id,
          email: existing.email,
          googleSubject: existing.googleSubject,
        }
      : null,
  });

  if (existing) {
    await db.update(customerAccounts).set(resolved.values).where(eq(customerAccounts.id, existing.id));
  } else {
    await db.insert(customerAccounts).values(resolved.values);
  }

  return {
    id: resolved.id,
    name: input.name.trim(),
    email: resolved.normalizedEmail,
    role: "customer" as const,
    authProvider: "google" as const,
  };
}
