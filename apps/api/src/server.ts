import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const app = await buildApp();
const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
