import { RateLimiter, type RateLimiterOptions } from "./rate-limiter";
import { DbRateLimiter } from "./db-rate-limiter";
import { shouldBypassRateLimits } from "./rate-limit-config";

const limiters = new Map<string, RateLimiter>();

interface ApplyRateLimitOptions {
  consumeRateLimit?: (
    key: string,
    config: { maxPoints: number; windowMs: number },
  ) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export function createRateLimiter(key: string, options: Partial<RateLimiterOptions>): RateLimiter {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiter(options));
  }
  return limiters.get(key)!;
}

export async function applyRateLimit(
  request: Request,
  key: string,
  options: Partial<RateLimiterOptions>,
  applyOptions: ApplyRateLimitOptions = {},
): Promise<Response | null> {
  try {
    if (shouldBypassRateLimits()) {
      return null;
    }

    const ip = extractClientIp(request);
    const consumeRateLimit = applyOptions.consumeRateLimit
      ?? (async (rateLimitKey: string, config: { maxPoints: number; windowMs: number }) => {
        const limiter = new DbRateLimiter();
        const result = await limiter.consume(rateLimitKey, config);

        return {
          allowed: result.allowed,
          retryAfterSeconds: result.retryAfterSeconds,
        };
      });

    const result = await consumeRateLimit(`${key}:${ip}`, {
      maxPoints: options.maxRequests ?? 30,
      windowMs: options.windowMs ?? 60_000,
    });

    if (!result.allowed) {
      console.warn(JSON.stringify({
        event: "rate_limited",
        key,
        ip,
        retryAfter: result.retryAfterSeconds,
        timestamp: new Date().toISOString(),
      }));
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
    }
    return null;
  } catch {
    return null; // fail open
  }
}
