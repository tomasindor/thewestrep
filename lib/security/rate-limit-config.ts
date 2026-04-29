export interface RateLimitEnv {
  DISABLE_RATE_LIMITS?: string;
  NODE_ENV?: string;
}

export function shouldBypassRateLimits(env: RateLimitEnv = process.env): boolean {
  return env.DISABLE_RATE_LIMITS === "true" && env.NODE_ENV !== "production";
}
