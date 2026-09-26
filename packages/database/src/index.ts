import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return drizzle(neon(databaseUrl), { schema });
}

export function databaseErrorSummary(error: unknown) {
  let current: unknown = error;
  let summary = "unknown database error";
  let code: string | undefined;

  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (current instanceof Error && current.message) {
      summary = current.message;
    }

    if (typeof current === "object" && current !== null) {
      const candidate = current as { cause?: unknown; code?: unknown };
      if (typeof candidate.code === "string") code = candidate.code;
      current = candidate.cause;
    } else {
      break;
    }
  }

  return code ? `${code}: ${summary}` : summary;
}

export async function assertDatabaseReady(databaseUrl = process.env.DATABASE_URL) {
  try {
    const db = createDatabase(databaseUrl);
    await db.select({
      id: schema.users.id,
      role: schema.users.role
    }).from(schema.users).limit(1);
  } catch (error) {
    throw new Error(
      `Kankor database is not ready: ${databaseErrorSummary(error)}. Check DATABASE_URL and run "npm run db:migrate".`,
      { cause: error }
    );
  }
}

export { schema };
