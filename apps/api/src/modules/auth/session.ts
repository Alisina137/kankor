import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

const SESSION_DAYS = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRawToken() {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const db = createDatabase();
  const token = createRawToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt
  });

  return { token, expiresAt };
}

export function bearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function getSessionUser(token: string) {
  const db = createDatabase();
  const now = new Date();

  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.users.id,
      email: schema.users.email,
      preferredLanguage: schema.users.preferredLanguage,
      targetExamYear: schema.users.targetExamYear,
      preparationLevel: schema.users.preparationLevel,
      onboardingCompletedAt: schema.users.onboardingCompletedAt
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(
      eq(schema.sessions.tokenHash, hashToken(token)),
      gt(schema.sessions.expiresAt, now)
    ))
    .limit(1);

  if (!rows[0]) return null;

  await db
    .update(schema.sessions)
    .set({ lastUsedAt: now })
    .where(eq(schema.sessions.id, rows[0].sessionId));

  return rows[0];
}

export async function revokeSession(token: string) {
  const db = createDatabase();
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
}
