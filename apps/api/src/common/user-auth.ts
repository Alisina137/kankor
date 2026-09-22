import type { FastifyReply, FastifyRequest } from "fastify";
import { bearerToken, getSessionUser } from "../modules/auth/session.js";

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
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
