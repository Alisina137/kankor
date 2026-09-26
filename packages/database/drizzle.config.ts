import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";

loadEnv({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const rawMigrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!rawMigrationUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required. Add it to the repository root .env file.");
}

const parsedMigrationUrl = new URL(rawMigrationUrl);
const sslMode = parsedMigrationUrl.searchParams.get("sslmode");
if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
  parsedMigrationUrl.searchParams.set("sslmode", "verify-full");
}
const migrationUrl = parsedMigrationUrl.toString();

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl }
});
