export type RateBucket = { count: number; resetAt: number };

export function consumeRate(store: Map<string, RateBucket>, key: string, limit: number, windowMs: number, now: number) {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0 };
  current.count += 1;
  return { allowed: true, remaining: limit - current.count };
}

const buckets = new Map<string, RateBucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  return consumeRate(buckets, key, limit, windowMs, Date.now());
}
