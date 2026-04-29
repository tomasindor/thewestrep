import "server-only";

import { eq, lte } from "drizzle-orm";

import { getDb } from "@/lib/db/core";
import { rateLimits } from "@/lib/db/schema";
import { shouldBypassRateLimits } from "@/lib/security/rate-limit-config";

export interface DbRateLimitRecord {
  key: string;
  points: number;
  expiresAt: Date;
}

export interface DbRateLimitRepository {
  deleteExpired(now: Date): Promise<void>;
  getByKey(key: string): Promise<DbRateLimitRecord | null>;
  upsert(record: DbRateLimitRecord): Promise<DbRateLimitRecord>;
}

export interface DbRateLimiterConfig {
  maxPoints: number;
  windowMs: number;
}

export interface DbRateLimitResult {
  allowed: boolean;
  points: number;
  remainingPoints: number;
  retryAfterSeconds: number;
  expiresAt: Date;
}

interface DbRateLimiterDeps {
  repository?: DbRateLimitRepository;
  now?: () => Date;
}

function createDefaultRepository(): DbRateLimitRepository {
  const db = getDb();

  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL in your environment.");
  }

  return {
    async deleteExpired(now) {
      await db.delete(rateLimits).where(lte(rateLimits.expiresAt, now));
    },
    async getByKey(key) {
      return (await db.query.rateLimits.findFirst({
        where: eq(rateLimits.key, key),
      })) ?? null;
    },
    async upsert(record) {
      const [saved] = await db
        .insert(rateLimits)
        .values({
          key: record.key,
          points: record.points,
          expiresAt: record.expiresAt,
        })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            points: record.points,
            expiresAt: record.expiresAt,
          },
        })
        .returning();

      return saved;
    },
  };
}

function getRepository(repository?: DbRateLimitRepository) {
  return repository ?? createDefaultRepository();
}

export class DbRateLimiter {
  private readonly repository: DbRateLimitRepository;
  private readonly now: () => Date;

  constructor(deps: DbRateLimiterDeps = {}) {
    this.repository = getRepository(deps.repository);
    this.now = deps.now ?? (() => new Date());
  }

  async consume(key: string, config: DbRateLimiterConfig): Promise<DbRateLimitResult> {
    const now = this.now();

    if (shouldBypassRateLimits()) {
      return {
        allowed: true,
        points: 0,
        remainingPoints: config.maxPoints,
        retryAfterSeconds: 0,
        expiresAt: now,
      };
    }

    await this.repository.deleteExpired(now);

    const existing = await this.repository.getByKey(key);
    const hasActiveWindow = existing !== null && existing.expiresAt > now;
    const expiresAt = hasActiveWindow ? existing.expiresAt : new Date(now.getTime() + config.windowMs);
    const points = hasActiveWindow ? existing.points + 1 : 1;
    const allowed = points <= config.maxPoints;
    const remainingPoints = Math.max(0, config.maxPoints - points);

    await this.repository.upsert({
      key,
      points,
      expiresAt,
    });

    return {
      allowed,
      points,
      remainingPoints,
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
      expiresAt,
    };
  }
}
