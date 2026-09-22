import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./modules/auth/index.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute"
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "kankor-api",
    phase: 2
  }));

  app.get("/api/v1", async () => ({
    name: "KankorPrep API",
    version: "v1",
    status: "authentication-onboarding"
  }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  return app;
}
