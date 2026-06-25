import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../index.js";
import type { AuthUser } from "./auth.js";
import { createDb } from "../db/client.js";
import { trips, scrapbooks } from "../db/schema.js";
import { eq } from "drizzle-orm";

type OwnableResource = "trips" | "scrapbooks";

type Variables = {
  user: AuthUser;
};

export function assertOwnership(resource: OwnableResource, paramName = "id") {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const resourceId = c.req.param(paramName);
    if (!resourceId) {
      throw new HTTPException(400, { message: `Missing ${paramName} parameter` });
    }

    const user = c.get("user");
    const db = createDb(c.env.DATABASE_URL);

    let ownerId: string | undefined;

    if (resource === "trips") {
      const row = await db.select({ userId: trips.userId }).from(trips).where(eq(trips.id, resourceId)).limit(1);
      ownerId = row[0]?.userId;
    } else if (resource === "scrapbooks") {
      const row = await db
        .select({ userId: scrapbooks.userId })
        .from(scrapbooks)
        .where(eq(scrapbooks.id, resourceId))
        .limit(1);
      ownerId = row[0]?.userId;
    }

    if (!ownerId) {
      throw new HTTPException(404, { message: "Resource not found" });
    }

    if (ownerId !== user.id) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    await next();
  });
}
