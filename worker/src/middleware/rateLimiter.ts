import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { Redis } from "@upstash/redis/cloudflare";
import type { Env } from "../index.js";

type RateLimitConfig = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, max, keyPrefix = "rl" } = config;

  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const redis = new Redis({
      url: c.env.UPSTASH_REDIS_REST_URL,
      token: c.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const identifier = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown";
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member: `${now.toString()}-${Math.random().toString(36).slice(2)}` });
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[2] as number;

    c.res.headers.set("X-RateLimit-Limit", max.toString());
    c.res.headers.set("X-RateLimit-Remaining", Math.max(0, max - count).toString());

    if (count > max) {
      c.res.headers.set("Retry-After", Math.ceil(windowMs / 1000).toString());
      throw new HTTPException(429, { message: "Too many requests" });
    }

    await next();
  });
}

export const standardRateLimit = rateLimiter({ windowMs: 60_000, max: 60, keyPrefix: "rl:std" });
export const authRateLimit = rateLimiter({ windowMs: 60_000, max: 10, keyPrefix: "rl:auth" });
export const expensiveRateLimit = rateLimiter({ windowMs: 60_000, max: 5, keyPrefix: "rl:exp" });
