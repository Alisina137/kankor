import Fastify from "fastify";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "kankor-api",
    phase: 1
  }));

  app.get("/api/v1", async () => ({
    name: "KankorPrep API",
    version: "v1",
    status: "foundation"
  }));

  return app;
}
