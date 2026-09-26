import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt, isNull } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { createRawToken, createSession, bearerToken, getSessionUser, hashToken, revokeSession } from "./session.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  createProfilePhotoDownloadUrl,
  createProfilePhotoUpload,
  deleteProfilePhotoObject,
  profilePhotoStorageConfigured,
  verifyProfilePhotoUpload
} from "./profile-photo-storage.js";
import {
  normalizeEmail,
  validEmail,
  validLanguage,
  validPassword,
  validPreparationLevel,
  validTargetYear
} from "./validation.js";

type AuthRequest = FastifyRequest<{ Body: Record<string, unknown> }>;

function publicUser(user: {
  id?: string;
  userId?: string;
  email: string;
  preferredLanguage: string;
  targetExamYear: number | null;
  preparationLevel: string | null;
  profilePhotoKey?: string | null;
  onboardingCompletedAt: Date | null;
}) {
  return {
    id: user.id ?? user.userId,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    targetExamYear: user.targetExamYear,
    preparationLevel: user.preparationLevel,
    hasProfilePhoto: Boolean(user.profilePhotoKey),
    onboardingCompleted: Boolean(user.onboardingCompletedAt)
  };
}

async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }

  const user = await getSessionUser(token);
  if (!user) {
    reply.code(401).send({ error: "session_expired" });
    return null;
  }

  return { token, user };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  app.post("/register", authRateLimit, async (request: AuthRequest, reply) => {
    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password;

    if (!validEmail(email) || !validPassword(password)) {
      return reply.code(400).send({ error: "invalid_registration_data" });
    }

    const db = createDatabase();
    const existing = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length) {
      return reply.code(409).send({ error: "email_already_registered" });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await db.insert(schema.users).values({ email, passwordHash })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        preferredLanguage: schema.users.preferredLanguage,
        targetExamYear: schema.users.targetExamYear,
        preparationLevel: schema.users.preparationLevel,
        profilePhotoKey: schema.users.profilePhotoKey,
        onboardingCompletedAt: schema.users.onboardingCompletedAt
      });

    const session = await createSession(inserted[0].id);
    return reply.code(201).send({
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser(inserted[0])
    });
  });

  app.post("/login", authRateLimit, async (request: AuthRequest, reply) => {
    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password;

    if (!validEmail(email) || typeof password !== "string") {
      return reply.code(400).send({ error: "invalid_login_data" });
    }

    const db = createDatabase();
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const session = await createSession(user.id);
    return reply.send({
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser(user)
    });
  });

  app.get("/me", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    return reply.send({ user: publicUser(auth.user) });
  });

  app.post("/refresh", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const nextSession = await createSession(auth.user.userId);
    await revokeSession(auth.token);
    return reply.send({
      token: nextSession.token,
      expiresAt: nextSession.expiresAt,
      user: publicUser(auth.user)
    });
  });

  app.post("/logout", async (request, reply) => {
    const token = bearerToken(request.headers.authorization);
    if (token) await revokeSession(token);
    return reply.code(204).send();
  });

  app.patch("/onboarding", async (request: AuthRequest, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const { preferredLanguage, targetExamYear, preparationLevel = null } = request.body ?? {};
    if (
      !validLanguage(preferredLanguage) ||
      !validTargetYear(targetExamYear) ||
      !validPreparationLevel(preparationLevel)
    ) {
      return reply.code(400).send({ error: "invalid_onboarding_data" });
    }

    const db = createDatabase();
    const updated = await db.update(schema.users)
      .set({
        preferredLanguage,
        targetExamYear,
        preparationLevel: preparationLevel as string | null,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, auth.user.userId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        preferredLanguage: schema.users.preferredLanguage,
        targetExamYear: schema.users.targetExamYear,
        preparationLevel: schema.users.preparationLevel,
        profilePhotoKey: schema.users.profilePhotoKey,
        onboardingCompletedAt: schema.users.onboardingCompletedAt
      });

    return reply.send({ user: publicUser(updated[0]) });
  });

  app.patch("/profile", async (request: AuthRequest, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const body = request.body ?? {};
    const hasLanguage = Object.prototype.hasOwnProperty.call(body, "preferredLanguage");
    const hasTargetYear = Object.prototype.hasOwnProperty.call(body, "targetExamYear");
    const hasPreparation = Object.prototype.hasOwnProperty.call(body, "preparationLevel");

    if (!hasLanguage && !hasTargetYear && !hasPreparation) {
      return reply.code(400).send({ error: "profile_update_required" });
    }

    if (hasLanguage && !validLanguage(body.preferredLanguage)) {
      return reply.code(400).send({ error: "invalid_profile_data" });
    }
    if (hasTargetYear && !validTargetYear(body.targetExamYear)) {
      return reply.code(400).send({ error: "invalid_profile_data" });
    }
    if (hasPreparation && !validPreparationLevel(body.preparationLevel)) {
      return reply.code(400).send({ error: "invalid_profile_data" });
    }

    const updates: {
      preferredLanguage?: string;
      targetExamYear?: number;
      preparationLevel?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (hasLanguage) updates.preferredLanguage = body.preferredLanguage as string;
    if (hasTargetYear) updates.targetExamYear = body.targetExamYear as number;
    if (hasPreparation) updates.preparationLevel = body.preparationLevel as string | null;

    const db = createDatabase();
    const updated = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, auth.user.userId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        preferredLanguage: schema.users.preferredLanguage,
        targetExamYear: schema.users.targetExamYear,
        preparationLevel: schema.users.preparationLevel,
        profilePhotoKey: schema.users.profilePhotoKey,
        onboardingCompletedAt: schema.users.onboardingCompletedAt
      });

    return reply.send({ user: publicUser(updated[0]) });
  });

  app.get("/profile-photo", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    if (!profilePhotoStorageConfigured()) {
      return reply.send({ configured: false, url: null });
    }

    if (!auth.user.profilePhotoKey) {
      return reply.send({ configured: true, url: null });
    }

    try {
      return reply.send({
        configured: true,
        url: await createProfilePhotoDownloadUrl(auth.user.profilePhotoKey)
      });
    } catch {
      return reply.code(502).send({ error: "profile_photo_read_failed" });
    }
  });

  app.post("/profile-photo/upload", async (request: AuthRequest, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const contentType = typeof request.body?.contentType === "string"
      ? request.body.contentType.trim().toLowerCase()
      : "";
    const fileSize = Number(request.body?.fileSize ?? 0);

    try {
      return reply.send(await createProfilePhotoUpload(auth.user.userId, contentType, fileSize));
    } catch (error) {
      const code = error instanceof Error ? error.message : "profile_photo_upload_failed";
      if (code === "profile_photo_storage_not_configured") return reply.code(503).send({ error: code });
      if (code === "unsupported_profile_photo_type" || code === "invalid_profile_photo_size") {
        return reply.code(400).send({ error: code });
      }
      throw error;
    }
  });

  app.post("/profile-photo/confirm", async (request: AuthRequest, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const key = typeof request.body?.key === "string" ? request.body.key.trim() : "";
    if (!key) return reply.code(400).send({ error: "invalid_profile_photo_key" });

    try {
      await verifyProfilePhotoUpload(auth.user.userId, key);
    } catch (error) {
      const code = error instanceof Error ? error.message : "profile_photo_upload_failed";
      if (code === "profile_photo_storage_not_configured") return reply.code(503).send({ error: code });
      if (code === "invalid_profile_photo_key" || code === "unsupported_profile_photo_type" || code === "invalid_profile_photo_size") {
        return reply.code(400).send({ error: code });
      }
      return reply.code(400).send({ error: "profile_photo_not_found" });
    }

    const db = createDatabase();
    const previousKey = auth.user.profilePhotoKey ?? null;
    const updated = await db.update(schema.users)
      .set({ profilePhotoKey: key, updatedAt: new Date() })
      .where(eq(schema.users.id, auth.user.userId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        preferredLanguage: schema.users.preferredLanguage,
        targetExamYear: schema.users.targetExamYear,
        preparationLevel: schema.users.preparationLevel,
        profilePhotoKey: schema.users.profilePhotoKey,
        onboardingCompletedAt: schema.users.onboardingCompletedAt
      });

    if (previousKey && previousKey !== key) {
      await deleteProfilePhotoObject(previousKey).catch(() => undefined);
    }

    return reply.send({
      user: publicUser(updated[0]),
      url: await createProfilePhotoDownloadUrl(key)
    });
  });

  app.delete("/profile-photo", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const previousKey = auth.user.profilePhotoKey ?? null;
    const db = createDatabase();
    const updated = await db.update(schema.users)
      .set({ profilePhotoKey: null, updatedAt: new Date() })
      .where(eq(schema.users.id, auth.user.userId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        preferredLanguage: schema.users.preferredLanguage,
        targetExamYear: schema.users.targetExamYear,
        preparationLevel: schema.users.preparationLevel,
        profilePhotoKey: schema.users.profilePhotoKey,
        onboardingCompletedAt: schema.users.onboardingCompletedAt
      });

    await deleteProfilePhotoObject(previousKey).catch(() => undefined);
    return reply.send({ user: publicUser(updated[0]) });
  });

  app.post("/recovery", authRateLimit, async (request: AuthRequest, reply) => {
    const email = normalizeEmail(request.body?.email);
    if (!validEmail(email)) {
      return reply.code(202).send({ accepted: true });
    }

    const db = createDatabase();
    const rows = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!rows[0]) return reply.code(202).send({ accepted: true });

    const rawToken = createRawToken();
    await db.insert(schema.passwordResetTokens).values({
      userId: rows[0].id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const response: Record<string, unknown> = { accepted: true };
    if (process.env.AUTH_EXPOSE_RECOVERY_TOKEN === "true" && process.env.NODE_ENV !== "production") {
      response.developmentToken = rawToken;
    }

    return reply.code(202).send(response);
  });

  app.post("/reset-password", authRateLimit, async (request: AuthRequest, reply) => {
    const token = typeof request.body?.token === "string" ? request.body.token : "";
    const password = request.body?.password;

    if (!token || !validPassword(password)) {
      return reply.code(400).send({ error: "invalid_reset_data" });
    }

    const db = createDatabase();
    const rows = await db.select({
      id: schema.passwordResetTokens.id,
      userId: schema.passwordResetTokens.userId
    })
      .from(schema.passwordResetTokens)
      .where(and(
        eq(schema.passwordResetTokens.tokenHash, hashToken(token)),
        gt(schema.passwordResetTokens.expiresAt, new Date()),
        isNull(schema.passwordResetTokens.usedAt)
      ))
      .limit(1);

    const reset = rows[0];
    if (!reset) return reply.code(400).send({ error: "invalid_or_expired_reset_token" });

    await db.update(schema.users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(schema.users.id, reset.userId));
    await db.update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResetTokens.id, reset.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, reset.userId));

    return reply.send({ reset: true });
  });

  app.delete("/account", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const db = createDatabase();
    await db.delete(schema.users).where(eq(schema.users.id, auth.user.userId));
    return reply.code(204).send();
  });
};
