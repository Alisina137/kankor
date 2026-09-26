import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { assertDatabaseReady, databaseErrorSummary } from "@kankor/database";
import { buildApp } from "./app.js";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const app = await buildApp();
const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid API_PORT: ${process.env.API_PORT ?? ""}`);
}

try {
  await assertDatabaseReady();
  app.log.info("Kankor database readiness check passed");

  const address = await app.listen({ port, host });
  app.log.info({ address, host, port }, "Kankor API listening");
} catch (error) {
  app.log.error({
    err: error,
    databaseCause: databaseErrorSummary(error)
  }, "Kankor API startup failed");
  process.exit(1);
}
