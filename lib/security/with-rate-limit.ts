import { RateLimiter, type RateLimiterOptions } from "./rate-limiter";

const limiters = new Map<string, RateLimiter>();

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

export function applyRateLimit(
  request: Request,
  key: string,
  options: Partial<RateLimiterOptions>,
): Response | null {
  try {
    const limiter = createRateLimiter(key, options);
    const ip = extractClientIp(request);
    if (!limiter.isAllowed(ip)) {
      const retryAfter = Math.ceil(limiter.getRetryAfter(ip) / 1000);
      console.warn(JSON.stringify({
        event: "rate_limited",
        key,
        ip,
        retryAfter,
        timestamp: new Date().toISOString(),
      }));
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    return null;
  } catch {
    return null; // fail open
  }
}
