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

  if (isBootstrapAdmin && !["admin", "super_admin"].includes(user.role)) {
    const db = createDatabase();
    await db.update(schema.users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(schema.users.id, user.userId));

    user = { ...user, role: "admin" };
  }

  if (!ADMIN_ROLES.has(user.role)) {
    reply.code(403).send({ error: "admin_required" });
    return null;
  }

  return { token, user };
}


export function roleAllowed(role: string, allowed: string[]) {
  return allowed.includes(role);
}

export async function requireAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  allowed: string[]
) {
  const auth = await requireAdmin(request, reply);
  if (!auth) return null;
  if (!roleAllowed(auth.user.role, allowed)) {
    reply.code(403).send({ error: "insufficient_admin_role" });
    return null;
  }
  return auth;
}

export const CONTENT_REVIEW_ROLES = ["content_reviewer", "content_admin", "admin", "super_admin"];
export const CONTENT_MANAGE_ROLES = ["content_admin", "admin", "super_admin"];
export const OPERATIONS_ADMIN_ROLES = ["admin", "super_admin"];
export const SUPER_ADMIN_ROLES = ["super_admin"];
