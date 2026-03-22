import { getClientAddress } from "@/lib/security/request";

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitOptions = {
  key: string;
  max: number;
  windowMs: number;
};

declare global {
  var __studyplanhqRateLimitStore: Map<string, RateLimitState> | undefined;
}

const rateLimitStore = global.__studyplanhqRateLimitStore ?? new Map<string, RateLimitState>();

if (process.env.NODE_ENV !== "production") {
  global.__studyplanhqRateLimitStore = rateLimitStore;
}

function getState(cacheKey: string, now: number, windowMs: number) {
  const current = rateLimitStore.get(cacheKey);

  if (!current || current.resetAt <= now) {
    const freshState = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(cacheKey, freshState);
    return freshState;
  }

  return current;
}

export function checkRateLimit(identifier: string, { key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cacheKey = `${key}:${identifier}`;
  const state = getState(cacheKey, now, windowMs);

  state.count += 1;
  rateLimitStore.set(cacheKey, state);

  const remaining = Math.max(0, max - state.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));

  return {
    ok: state.count <= max,
    remaining,
    retryAfterSeconds,
  };
}

export function checkRateLimitForRequest(request: Request, options: RateLimitOptions) {
  return checkRateLimit(getClientAddress(request), options);
}
