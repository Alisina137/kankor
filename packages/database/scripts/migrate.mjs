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

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required in the repository root .env file.");
}

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

  console.log("✓ Database migrations complete");
} finally {
  await client.end();
}
