export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  maxEntries: number;
}

interface Entry {
  count: number;
  windowStart: number;
}

const DEFAULT_OPTIONS: Required<RateLimiterOptions> = {
  windowMs: 60_000,
  maxRequests: 30,
  maxEntries: 10_000,
};

export class RateLimiter {
  private entries: Map<string, Entry>;
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly maxEntries: number;

  constructor(options?: Partial<RateLimiterOptions>) {
    const resolved = { ...DEFAULT_OPTIONS, ...options };
    this.windowMs = resolved.windowMs;
    this.maxRequests = resolved.maxRequests;
    this.maxEntries = resolved.maxEntries;
    this.entries = new Map();
  }

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const existing = this.entries.get(ip);

    if (!existing) {
      this._addEntry(ip, now);
      return true;
    }

    // Reset window if expired
    if (now - existing.windowStart >= this.windowMs) {
      existing.count = 1;
      existing.windowStart = now;
      // Move to end of Map (most recently used)
      this.entries.delete(ip);
      this.entries.set(ip, existing);
      return true;
    }

    // Within window
    if (existing.count < this.maxRequests) {
      existing.count += 1;
      this.entries.delete(ip);
      this.entries.set(ip, existing);
      return true;
    }

    return false;
  }

  getRetryAfter(ip: string): number {
    const existing = this.entries.get(ip);
    if (!existing) return 0;

    const elapsed = Date.now() - existing.windowStart;
    const remaining = this.windowMs - elapsed;
    return Math.max(0, remaining);
  }

  private _addEntry(ip: string, now: number): void {
    // Evict oldest entries if at capacity
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(ip, { count: 1, windowStart: now });
  }
}

// Singleton instance with default config
export const rateLimiter = new RateLimiter();
