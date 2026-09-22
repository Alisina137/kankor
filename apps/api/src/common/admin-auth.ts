import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { bearerToken, getSessionUser } from "../modules/auth/session.js";

const ADMIN_ROLES = new Set(["content_reviewer", "content_admin", "admin", "super_admin"]);

function bootstrapEmails() {
  return new Set(
    (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }

  let user = await getSessionUser(token);
  if (!user) {
    reply.code(401).send({ error: "session_expired" });
    return null;
  }

  const isBootstrapAdmin = bootstrapEmails().has(user.email.toLowerCase());

  if (isBootstrapAdmin && !ADMIN_ROLES.has(user.role)) {
    const db = createDatabase();
    await db.update(schema.users)
      .set({ role: "content_admin", updatedAt: new Date() })
      .where(eq(schema.users.id, user.userId));

    user = { ...user, role: "content_admin" };
  }

  if (!ADMIN_ROLES.has(user.role)) {
    reply.code(403).send({ error: "admin_required" });
    return null;
  }

  return { token, user };
}
