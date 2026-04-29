import "server-only";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/core";
import { customerSessions } from "@/lib/db/schema";

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export interface CustomerSessionRecord {
  id: string;
  customerId: string;
  expiresAt: Date;
}

export interface CustomerSessionRepository {
  insertSession(session: CustomerSessionRecord): Promise<void>;
  getSessionById(id: string): Promise<CustomerSessionRecord | null>;
  deleteSessionById(id: string): Promise<void>;
  deleteSessionsByCustomerId(customerId: string): Promise<void>;
}

interface CustomerSessionDeps {
  repository?: CustomerSessionRepository;
  now?: Date;
  ttlMs?: number;
}

function getNow(now: Date | undefined) {
  return now ?? new Date();
}

function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function getDefaultRepository(): CustomerSessionRepository {
  const db = getDb();

  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL in your environment.");
  }

  return {
    async insertSession(session) {
      await db.insert(customerSessions).values({
        id: session.id,
        customerId: session.customerId,
        expiresAt: session.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    async getSessionById(id) {
      return (await db.query.customerSessions.findFirst({
        where: eq(customerSessions.id, id),
      })) ?? null;
    },
    async deleteSessionById(id) {
      await db.delete(customerSessions).where(eq(customerSessions.id, id));
    },
    async deleteSessionsByCustomerId(customerId) {
      await db.delete(customerSessions).where(eq(customerSessions.customerId, customerId));
    },
  };
}

function resolveRepository(repository?: CustomerSessionRepository) {
  return repository ?? getDefaultRepository();
}

export async function createCustomerSession(customerId: string, deps: CustomerSessionDeps = {}) {
  const repository = resolveRepository(deps.repository);
  const now = getNow(deps.now);
  const ttlMs = deps.ttlMs ?? DEFAULT_SESSION_TTL_MS;
  const token = createSessionToken();
  const expiresAt = new Date(now.getTime() + ttlMs);

  await repository.insertSession({
    id: token,
    customerId,
    expiresAt,
  });

  return {
    token,
    customerId,
    expiresAt,
  };
}

export async function validateCustomerSession(token: string, deps: CustomerSessionDeps = {}) {
  if (!token) {
    return null;
  }

  const repository = resolveRepository(deps.repository);
  const session = await repository.getSessionById(token);

  if (!session) {
    return null;
  }

  const now = getNow(deps.now);

  if (session.expiresAt <= now) {
    await repository.deleteSessionById(token);
    return null;
  }

  return {
    token: session.id,
    customerId: session.customerId,
    expiresAt: session.expiresAt,
  };
}

export async function revokeCustomerSession(token: string, deps: CustomerSessionDeps = {}) {
  if (!token) {
    return;
  }

  const repository = resolveRepository(deps.repository);
  await repository.deleteSessionById(token);
}

export async function revokeAllCustomerSessions(customerId: string, deps: CustomerSessionDeps = {}) {
  if (!customerId) {
    return;
  }

  const repository = resolveRepository(deps.repository);
  await repository.deleteSessionsByCustomerId(customerId);
}
