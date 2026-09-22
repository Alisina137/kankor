import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./modules/auth/index.js";
import { curriculumRoutes } from "./modules/curriculum/index.js";
import { questionRoutes } from "./modules/questions/index.js";
import { adminCurriculumRoutes, adminQuestionRoutes } from "./modules/admin/index.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (process.env.ADMIN_WEB_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute"
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "kankor-api",
    phase: 3
  }));

  app.get("/api/v1", async () => ({
    name: "KankorPrep API",
    version: "v1",
    status: "curriculum-question-system"
  }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(curriculumRoutes, { prefix: "/api/v1" });
  await app.register(questionRoutes, { prefix: "/api/v1" });
  await app.register(adminCurriculumRoutes, { prefix: "/api/v1/admin" });
  await app.register(adminQuestionRoutes, { prefix: "/api/v1/admin" });

  return app;
}
