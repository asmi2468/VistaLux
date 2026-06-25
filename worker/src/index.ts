import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";

export type Env = {
  DATABASE_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  JWT_SECRET: string;
  GOOGLE_PLACES_API_KEY: string;
  TOMORROW_IO_API_KEY: string;
  OPEN_EXCHANGE_RATES_API_KEY: string;
  SENTRY_DSN: string;
  RESEND_API_KEY: string;
  ENVIRONMENT: string;
  ASSETS_BUCKET: R2Bucket;
  ITINERARY_QUEUE: Queue;
  SCRAPBOOK_QUEUE: Queue;
  OFFLINE_BUNDLE_QUEUE: Queue;
  ALERTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());

app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin",
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
  })
);

app.use(
  "/api/*",
  cors({
    origin: ["https://vistalux.app", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
    credentials: true,
  })
);

app.get("/health-check", (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err.message);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
