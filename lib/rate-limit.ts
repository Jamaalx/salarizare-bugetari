// In-memory token-bucket rate limiter. Single-instance only.
// Multi-replica deployments must swap to Upstash/Redis.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

export function getClientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("fly-client-ip") ||
    "unknown"
  );
}

// Periodic cleanup so the Map doesn't grow unbounded.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 60_000);
cleanupTimer.unref?.();

// Strip Bearer tokens and known API-key patterns before logging.
export function redact(s: string): string {
  return s
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***")
    .replace(/nvapi-[A-Za-z0-9_-]{16,}/g, "nvapi-***")
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "sk-***");
}
