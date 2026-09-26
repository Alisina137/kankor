import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { assertDatabaseReady } from "@kankor/database";
import { resolveTrustProxy } from "./common/production-config.js";
import { authRoutes } from "./modules/auth/index.js";
import { curriculumRoutes } from "./modules/curriculum/index.js";
import { questionRoutes } from "./modules/questions/index.js";
import { examRoutes, historicalExamRoutes } from "./modules/exams/index.js";
import { attemptRoutes } from "./modules/attempts/index.js";
import { resultRoutes } from "./modules/results/index.js";
import { progressRoutes } from "./modules/progress/index.js";
import { billingRoutes } from "./modules/billing/index.js";
import {
  adminCurriculumRoutes,
  adminQuestionRoutes,
  adminExamBlueprintRoutes,
  adminHistoricalFormRoutes,
  adminBillingRoutes,
  adminContentQualityRoutes
} from "./modules/admin/index.js";

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: resolveTrustProxy() });

  const configuredOrigins = (process.env.ADMIN_WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);

      if (process.env.NODE_ENV !== "production") {
        try {
          const url = new URL(origin);
          if (["localhost", "127.0.0.1"].includes(url.hostname)) {
            return callback(null, true);
          }
        } catch {
          // Invalid origins are rejected below.
        }
      }

      return callback(new Error("origin_not_allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute"
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Cache-Control", "no-store");
    return payload;
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "kankor-api",
    phase: 10
  }));

  app.get("/ready", async (_request, reply) => {
    try {
      await assertDatabaseReady();
      return {
        status: "ready",
        service: "kankor-api",
        phase: 10
      };
    } catch {
      return reply.code(503).send({
        status: "not_ready",
        service: "kankor-api",
        phase: 10
      });
    }
  });

  app.get("/api/v1", async () => ({
    name: "KankorPrep API",
    version: "v1",
    status: "release-readiness"
  }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(curriculumRoutes, { prefix: "/api/v1" });
  await app.register(questionRoutes, { prefix: "/api/v1" });
  await app.register(examRoutes, { prefix: "/api/v1" });
  await app.register(historicalExamRoutes, { prefix: "/api/v1" });
  await app.register(attemptRoutes, { prefix: "/api/v1" });
  await app.register(resultRoutes, { prefix: "/api/v1" });
  await app.register(progressRoutes, { prefix: "/api/v1" });
  await app.register(billingRoutes, { prefix: "/api/v1" });
  await app.register(adminCurriculumRoutes, { prefix: "/api/v1/admin" });
  await app.register(adminQuestionRoutes, { prefix: "/api/v1/admin" });
  await app.register(adminExamBlueprintRoutes, { prefix: "/api/v1/admin" });
  await app.register(adminHistoricalFormRoutes, { prefix: "/api/v1/admin" });
  await app.register(adminBillingRoutes, { prefix: "/api/v1/admin" });
  await app.register(adminContentQualityRoutes, { prefix: "/api/v1/admin" });

  return app;
}
