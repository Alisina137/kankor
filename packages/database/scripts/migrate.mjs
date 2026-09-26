import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const repositoryRoot = join(packageRoot, "..", "..");

loadEnv({ path: join(repositoryRoot, ".env") });

const runtimeConnectionString = process.env.DATABASE_URL;
const directConnectionString = process.env.DIRECT_DATABASE_URL;

if (!runtimeConnectionString && !directConnectionString) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required in the repository root .env file.");
}

function normalizedDatabaseTarget(value) {
  const url = new URL(value);
  return {
    host: url.hostname.replace(/-pooler(?=\.)/, ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, ""))
  };
}

function assertCompatibleDatabaseTargets() {
  if (!runtimeConnectionString || !directConnectionString) return;

  const runtime = normalizedDatabaseTarget(runtimeConnectionString);
  const direct = normalizedDatabaseTarget(directConnectionString);

  if (runtime.host !== direct.host || runtime.database !== direct.database) {
    throw new Error(
      "DATABASE_URL and DIRECT_DATABASE_URL point to different database targets. " +
      "Use pooled/direct URLs from the same Neon branch and database before running migrations."
    );
  }
}

function securePgConnectionString(value) {
  const url = new URL(value);
  const mode = url.searchParams.get("sslmode");
  if (mode === "prefer" || mode === "require" || mode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

assertCompatibleDatabaseTargets();

const rawConnectionString = directConnectionString ?? runtimeConnectionString;
const connectionString = securePgConnectionString(rawConnectionString);

const migrationsDir = join(packageRoot, "drizzle");
const files = (await readdir(migrationsDir))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();

if (!files.length) {
  console.log("No SQL migrations found.");
  process.exit(0);
}

const client = new pg.Client({
  connectionString,
  application_name: "kankorprep-migrations"
});

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.kankor_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const filename of files) {
    const sql = await readFile(join(migrationsDir, filename), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");

    const existing = await client.query(
      "SELECT checksum FROM public.kankor_migrations WHERE filename = $1",
      [filename]
    );

    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Migration ${filename} was already applied but its contents have changed.`);
      }
      console.log(`✓ ${filename} already applied`);
      continue;
    }

    console.log(`→ Applying ${filename}`);
    await client.query("BEGIN");

    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO public.kankor_migrations (filename, checksum) VALUES ($1, $2)",
        [filename, checksum]
      );
      await client.query("COMMIT");
      console.log(`✓ Applied ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  const authSchema = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS users_table,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'role'
      ) AS role_column
  `);

  if (!authSchema.rows[0]?.users_table || !authSchema.rows[0]?.role_column) {
    throw new Error("Database migrations completed but the required users auth schema is still incomplete.");
  }

  console.log("✓ Database migrations complete");
  console.log("✓ Authentication schema is ready");
} finally {
  await client.end();
}
