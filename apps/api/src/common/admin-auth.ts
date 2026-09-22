import type { FastifyReply, FastifyRequest } from "fastify";
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

  const user = await getSessionUser(token);
  if (!user) {
    reply.code(401).send({ error: "session_expired" });
    return null;
  }

  const isBootstrapAdmin = bootstrapEmails().has(user.email.toLowerCase());
  if (!ADMIN_ROLES.has(user.role) && !isBootstrapAdmin) {
    reply.code(403).send({ error: "admin_required" });
    return null;
  }

  return { token, user };
}
