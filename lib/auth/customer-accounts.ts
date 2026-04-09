import "server-only";

import { randomUUID } from "node:crypto";

import { eq, or } from "drizzle-orm";

import { customerRegistrationSchema, normalizeCustomerEmail } from "@/lib/auth/customer-credentials";
import { hashCustomerPassword, verifyCustomerPassword } from "@/lib/auth/customer-password";
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

export interface CustomerSessionIdentity {
  id: string;
  name: string;
  email: string;
  role: "customer";
  authProvider: "credentials" | "google";
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

export async function registerCustomerEmailPasswordAccount(input: { email: string; password: string; name: string }) {
  const db = requireDb();
  const parsed = customerRegistrationSchema.parse(input);
  const email = normalizeCustomerEmail(parsed.email);
  const existing = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.email, email),
  });

  if (existing?.passwordHash) {
    throw new CustomerAccountExistsError();
  }

  const passwordHash = await hashCustomerPassword(parsed.password);
  const id = existing?.id ?? randomUUID();
  const values = {
    id,
    email,
    name: parsed.name,
    passwordHash,
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

  const isValidPassword = await verifyCustomerPassword(input.password, account.passwordHash);

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
  const email = normalizeCustomerEmail(input.email);
  const existing = await db.query.customerAccounts.findFirst({
    where: or(eq(customerAccounts.googleSubject, input.googleSubject), eq(customerAccounts.email, email)),
  });
  const id = existing?.id ?? randomUUID();
  const values = {
    id,
    email,
    name: input.name.trim(),
    googleSubject: input.googleSubject,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(customerAccounts).set(values).where(eq(customerAccounts.id, existing.id));
  } else {
    await db.insert(customerAccounts).values(values);
  }

  return {
    id,
    name: input.name.trim(),
    email,
    role: "customer" as const,
    authProvider: "google" as const,
  };
}
