import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwtVerify } from "jose";
import { Redis } from "@upstash/redis/cloudflare";
import type { Env } from "../index.js";

export type AuthUser = {
  id: string;
  email: string;
  jti: string;
};

type Variables = {
  user: AuthUser;
};

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authorization = c.req.header("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
    }

    const token = authorization.slice(7);

    let payload: { sub: string; email: string; jti: string; exp: number };
    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload: p } = await jwtVerify(token, secret);
      payload = p as typeof payload;
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }

    const redis = new Redis({
      url: c.env.UPSTASH_REDIS_REST_URL,
      token: c.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const isBlacklisted = await redis.get(`jti:blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new HTTPException(401, { message: "Token has been revoked" });
    }

    c.set("user", {
      id: payload.sub,
      email: payload.email,
      jti: payload.jti,
    });

    await next();
  }
);
