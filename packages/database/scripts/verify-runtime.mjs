import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const repositoryRoot = join(packageRoot, "..", "..");
const migrationsDir = join(packageRoot, "drizzle");

loadEnv({ path: join(repositoryRoot, ".env") });

const runtimeConnectionString = process.env.DATABASE_URL;
const directConnectionString = process.env.DIRECT_DATABASE_URL;

if (!runtimeConnectionString) {
  throw new Error("DATABASE_URL is required in the repository root .env file.");
}

function normalizedDatabaseTarget(value) {
  const url = new URL(value);
  return {
    host: url.hostname.replace(/-pooler(?=\.)/, ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, ""))
  };
}

if (directConnectionString) {
  const runtime = normalizedDatabaseTarget(runtimeConnectionString);
  const direct = normalizedDatabaseTarget(directConnectionString);

  if (runtime.host !== direct.host || runtime.database !== direct.database) {
    throw new Error(
      "DATABASE_URL and DIRECT_DATABASE_URL point to different database targets. " +
      "Copy pooled/direct connection strings from the same Neon branch and database."
    );
  }
}

const expectedMigrations = (await readdir(migrationsDir))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();

const client = new pg.Client({
  connectionString: runtimeConnectionString,
  application_name: "kankorprep-runtime-verifier"
});

await client.connect();

try {
  const identity = await client.query(
    "SELECT current_database() AS database, current_user AS user"
  );

  const schemaCheck = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS users_table,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'role'
      ) AS role_column,
      to_regclass('public.kankor_migrations') IS NOT NULL AS migration_table
  `);

  const state = schemaCheck.rows[0];

  if (!state?.users_table || !state?.role_column || !state?.migration_table) {
    throw new Error('Runtime database schema is incomplete. Run "npm run db:migrate".');
  }

  const applied = await client.query(
    "SELECT filename FROM public.kankor_migrations ORDER BY filename"
  );
  const appliedSet = new Set(applied.rows.map((row) => row.filename));
  const missing = expectedMigrations.filter((filename) => !appliedSet.has(filename));

  console.log(`Runtime database: ${identity.rows[0].database}`);
  console.log(`Database user: ${identity.rows[0].user}`);
  console.log(`Applied migrations: ${applied.rows.length}/${expectedMigrations.length}`);

  if (missing.length) {
    throw new Error(`Missing migrations: ${missing.join(", ")}. Run "npm run db:migrate".`);
  }

  const grade11Books = await client.query(`
    SELECT count(*)::int AS active_books
    FROM public.books b
    JOIN public.grades g ON g.id = b.grade_id
    WHERE g.number = 11
      AND g.active = true
      AND b.active = true
  `);
  const grade11BookCount = grade11Books.rows[0]?.active_books ?? 0;

  console.log(`Grade 11 active books: ${grade11BookCount}`);

  if (grade11BookCount < 10) {
    throw new Error(
      `Grade 11 curriculum is incomplete: expected at least 10 active books, found ${grade11BookCount}. Run "npm run db:migrate".`
    );
  }

  console.log("✓ Runtime database and authentication schema are ready");
  console.log("✓ Grade 11 curriculum books are present");
} finally {
  await client.end();
}
